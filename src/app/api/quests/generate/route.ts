import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'
import { QuestManager } from '@/lib/quest-manager'
import { QuestType } from '@/types'
import OpenAI from 'openai'

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface UserContext {
  userLevel: number
  difficulty: number
  bookCount: number
  bookTitles: string[]
  bookAuthors: string[]
  bookGenres: string[]
  readingHistory: {
    total_sessions: number
    avg_duration: number
    total_pages: number
  }
  userName: string
}

interface QuestData {
  title: string
  description: string
  type: 'timer' | 'summary' | 'challenge' | 'reading'
  difficulty: number
  xp_reward: number
  coin_reward: number
  target_value: number
  current_progress: number
}

// LLM을 사용한 개인화된 퀘스트 생성 함수
async function generatePersonalizedQuests(context: UserContext): Promise<QuestData[]> {
  const { userLevel, difficulty, bookCount, bookTitles, bookAuthors, bookGenres, readingHistory, userName } = context
  
  // 기본 퀘스트 템플릿
  const baseQuests: QuestData[] = []
  
  try {
    // OpenAI API가 설정되어 있는 경우 LLM 사용
    if (process.env.OPENAI_API_KEY) {
      const prompt = `
당신은 독서 앱의 퀘스트 생성 전문가입니다. 다음 사용자 정보를 바탕으로 개인화된 일일 퀘스트 3개를 생성해주세요.

사용자 정보:
- 이름: ${userName}
- 레벨: ${userLevel}
- 등록된 책 수: ${bookCount}
- 책 제목들: ${bookTitles.slice(0, 5).join(', ')}
- 작가들: ${bookAuthors.slice(0, 5).join(', ')}
- 장르들: ${bookGenres.slice(0, 5).join(', ')}
- 총 독서 세션: ${readingHistory.total_sessions}
- 평균 독서 시간: ${Math.round(readingHistory.avg_duration || 0)}분
- 총 읽은 페이지: ${readingHistory.total_pages}

퀘스트 요구사항:
1. 사용자의 레벨과 독서 기록에 맞는 적절한 난이도
2. 등록된 책이나 선호 장르를 고려한 개인화
3. 동기부여가 되는 재미있고 창의적인 제목과 설명
4. 다음 3가지 타입 중에서 선택: timer(독서 시간), summary(요약 작성), challenge(특별 도전)

응답 형식 (JSON):
{
  "quests": [
    {
      "title": "퀘스트 제목",
      "description": "퀘스트 설명 (동기부여 포함)",
      "type": "timer|summary|challenge",
      "target_value": 숫자값,
      "motivation": "추가 동기부여 메시지"
    }
  ]
}

timer 타입: target_value는 분 단위 (15-60분)
summary 타입: target_value는 문장 수 (3-5문장)
challenge 타입: target_value는 도전 횟수 (1-3회)
`
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "당신은 독서 앱의 퀘스트 생성 전문가입니다. 사용자의 독서 습관과 선호도를 분석하여 개인화된 퀘스트를 생성합니다."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000
      })
      
      const response = completion.choices[0]?.message?.content
      if (response) {
        try {
          const parsed = JSON.parse(response)
          if (parsed.quests && Array.isArray(parsed.quests)) {
            return parsed.quests.map((quest: any, index: number) => ({
              title: quest.title || `퀘스트 ${index + 1}`,
              description: quest.description || '독서 퀘스트를 완료해보세요!',
              type: quest.type || 'timer',
              difficulty,
              xp_reward: difficulty * (quest.type === 'challenge' ? 25 : quest.type === 'summary' ? 15 : 10),
              coin_reward: difficulty * (quest.type === 'challenge' ? 12 : quest.type === 'summary' ? 7 : 5),
              target_value: quest.target_value || (quest.type === 'timer' ? 20 : quest.type === 'summary' ? 3 : 1),
              current_progress: 0
            }))
          }
        } catch (parseError) {
          console.error('LLM 응답 파싱 오류:', parseError)
        }
      }
    }
  } catch (error) {
    console.error('LLM 퀘스트 생성 오류:', error)
  }
  
  // LLM 실패 시 또는 API 키가 없는 경우 기본 퀘스트 생성
  return generateFallbackQuests(context)
}

// 기본 퀘스트 생성 함수 (LLM 실패 시 대체)
function generateFallbackQuests(context: UserContext): QuestData[] {
  const { difficulty, bookCount, readingHistory } = context
  const quests: QuestData[] = []
  
  // 기본 독서 퀘스트
  const readingDuration = Math.max(15, Math.min(60, (readingHistory.avg_duration || 20) + 5))
  quests.push({
    title: '오늘의 집중 독서',
    description: `${readingDuration}분 동안 집중해서 책을 읽어보세요! 📚`,
    type: 'timer',
    difficulty,
    xp_reward: difficulty * 10,
    coin_reward: difficulty * 5,
    target_value: readingDuration,
    current_progress: 0
  })
  
  // 책이 있는 경우 요약 퀘스트
  if (bookCount > 0) {
    quests.push({
      title: '독서 노트 작성',
      description: '읽은 내용을 3문장으로 요약해보세요! ✍️',
      type: 'summary',
      difficulty,
      xp_reward: difficulty * 15,
      coin_reward: difficulty * 7,
      target_value: 3,
      current_progress: 0
    })
  }
  
  // 주말이나 특별한 날 챌린지
  const today = new Date()
  const dayOfWeek = today.getDay()
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    quests.push({
      title: '주말 독서 마라톤',
      description: '주말에는 평소보다 더 많이 읽어보세요! 🏃‍♂️',
      type: 'challenge',
      difficulty: difficulty + 1,
      xp_reward: difficulty * 25,
      coin_reward: difficulty * 12,
      target_value: 2,
      current_progress: 0
    })
  } else {
    quests.push({
      title: '새로운 장르 탐험',
      description: '평소와 다른 장르의 책을 읽어보세요! 🌟',
      type: 'reading',
      difficulty,
      xp_reward: difficulty * 20,
      coin_reward: difficulty * 10,
      target_value: 1,
      current_progress: 0
    })
  }
  
  return quests
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7)
    const user = await authService.getCurrentUser(token)
    
    if (!user) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }
    
    // 오늘 이미 생성된 퀘스트가 있는지 확인
    const existingQuestsQuery = `
      SELECT COUNT(*) as count
      FROM quests 
      WHERE user_id = $1 
      AND DATE(created_at) = CURRENT_DATE
    `
    
    const existingResult = await query(existingQuestsQuery, [user.id])
    const existingCount = parseInt(existingResult.rows[0]?.count || '0')
    
    if (existingCount > 0) {
      return NextResponse.json(
        { error: '오늘의 퀘스트가 이미 생성되었습니다.' },
        { status: 400 }
      )
    }
    
    // 사용자 레벨 조회
    const userQuery = `
      SELECT 
        total_xp,
        FLOOR(total_xp / 100) + 1 as level
      FROM users 
      WHERE id = $1
    `
    
    const userResult = await query(userQuery, [user.id])
    const userLevel = userResult.rows[0]?.level || 1
    
    // 사용자가 등록한 책 정보 조회
    const booksQuery = `
      SELECT 
        COUNT(*) as book_count,
        ARRAY_AGG(title) as book_titles,
        ARRAY_AGG(author) as book_authors,
        ARRAY_AGG(genre) as book_genres
      FROM books 
      WHERE user_id = $1
    `
    
    const booksResult = await query(booksQuery, [user.id])
    const bookData = booksResult.rows[0] || {
      book_count: 0,
      book_titles: [],
      book_authors: [],
      book_genres: []
    }
    const bookCount = parseInt(bookData.book_count || '0')
    
    // 사용자의 독서 기록 조회
    const readingHistoryQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        AVG(duration_minutes) as avg_duration,
        SUM(pages_read) as total_pages
      FROM reading_sessions 
      WHERE user_id = $1 AND end_time IS NOT NULL
    `
    
    const readingHistoryResult = await query(readingHistoryQuery, [user.id])
    const readingHistory = readingHistoryResult.rows[0] || {
      total_sessions: 0,
      avg_duration: 0,
      total_pages: 0
    }
    
    // 퀘스트 난이도 설정 (레벨에 따라)
    const difficulty = Math.min(userLevel, 5)
    
    // LLM을 사용한 개인화된 퀘스트 생성
    const questsToCreate = await generatePersonalizedQuests({
      userLevel,
      difficulty,
      bookCount,
      bookTitles: bookData.book_titles || [],
      bookAuthors: bookData.book_authors || [],
      bookGenres: bookData.book_genres || [],
      readingHistory,
      userName: user.name || '독서가'
    })
    
    // 퀘스트 생성
    const createdQuests = []
    
    for (const questData of questsToCreate) {
      // 퀘스트 타입에 따른 만료 시간 계산
      const questType: QuestType = 'daily' // 기본값
      const expiresAt = QuestManager.calculateExpiryTime(questType)
      
      const insertQuery = `
        INSERT INTO quests (
          title,
          description,
          type,
          quest_type,
          difficulty,
          xp_reward,
          coin_reward,
          target_value,
          progress,
          status,
          user_id,
          expires_at,
          auto_renew,
          grace_period_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11, $12, $13)
        RETURNING 
          id,
          title,
          description,
          type,
          quest_type,
          difficulty,
          xp_reward,
          coin_reward,
          target_value,
          progress,
          status,
          expires_at,
          auto_renew,
          created_at
      `
      
      const result = await query(insertQuery, [
        questData.title,
        questData.description,
        questData.type,
        questType,
        questData.difficulty,
        questData.xp_reward,
        questData.coin_reward,
        questData.target_value,
        questData.current_progress || 0,
        user.id,
        expiresAt,
        true, // auto_renew
        60 // grace_period_minutes
      ])
      
      const newQuest = result.rows[0]
      
      // 퀘스트 메타데이터 생성
      const metadataQuery = `
        INSERT INTO quest_metadata (
          quest_id,
          renewal_pattern,
          expiry_notifications,
          streak_count,
          bonus_multiplier
        ) VALUES ($1, $2, $3, $4, $5)
      `
      
      await query(metadataQuery, [
        newQuest.id,
        JSON.stringify({
          interval: 'daily',
          time: '00:00',
          dayOfWeek: 1
        }),
        JSON.stringify({
          '24h_before': true,
          '6h_before': true,
          '1h_before': true,
          '15m_before': true,
          'expired': true
        }),
        0, // streak_count
        1.0 // bonus_multiplier
      ])
      
      createdQuests.push(newQuest)
    }
    
    return NextResponse.json({
      success: true,
      message: `${createdQuests.length}개의 퀘스트가 생성되었습니다.`,
      quests: createdQuests
    })
  } catch (error) {
    console.error('퀘스트 생성 오류:', error)
    return NextResponse.json(
      { error: '퀘스트 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}