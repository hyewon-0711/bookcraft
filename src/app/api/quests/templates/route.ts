import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'
import { QuestTemplateManager } from '@/lib/quest-templates'
import { QuestManager } from '@/lib/quest-manager'

// 사용 가능한 퀘스트 템플릿 조회
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const available_only = url.searchParams.get('available_only') === 'true'

    // 사용자 컨텍스트 조회
    const userContextQuery = `
      SELECT 
        u.total_xp,
        FLOOR(u.total_xp / 100) + 1 as level,
        COUNT(DISTINCT b.id) as book_count,
        ARRAY_AGG(DISTINCT q.type) FILTER (WHERE q.completed_at > CURRENT_DATE - INTERVAL '7 days') as recent_quest_types
      FROM users u
      LEFT JOIN books b ON u.id = b.user_id
      LEFT JOIN quests q ON u.id = q.user_id AND q.status = 'completed'
      WHERE u.id = $1
      GROUP BY u.id, u.total_xp
    `
    
    const userContextResult = await query(userContextQuery, [user.id])
    const userContext = userContextResult.rows[0] || {
      level: 1,
      book_count: 0,
      recent_quest_types: []
    }

    // 완료된 퀘스트 ID 조회
    const completedQuestsQuery = `
      SELECT ARRAY_AGG(id::text) as completed_quest_ids
      FROM quests 
      WHERE user_id = $1 AND status = 'completed'
    `
    
    const completedQuestsResult = await query(completedQuestsQuery, [user.id])
    const completedQuests = completedQuestsResult.rows[0]?.completed_quest_ids || []

    let templates
    
    if (category) {
      templates = QuestTemplateManager.getTemplatesByCategory(category)
    } else if (available_only) {
      templates = QuestTemplateManager.getAvailableTemplates({
        level: userContext.level,
        bookCount: userContext.book_count,
        completedQuests,
        currentTime: new Date()
      })
    } else {
      templates = QuestTemplateManager.getAllTemplates()
    }

    return NextResponse.json({
      success: true,
      templates,
      user_context: {
        level: userContext.level,
        book_count: userContext.book_count,
        recent_quest_types: userContext.recent_quest_types || []
      }
    })
  } catch (error) {
    console.error('퀘스트 템플릿 조회 오류:', error)
    return NextResponse.json(
      { error: '퀘스트 템플릿 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 템플릿 기반 퀘스트 생성
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

    const { template_id, variables, auto_generate } = await request.json()

    // 사용자 레벨 조회
    const userQuery = `
      SELECT 
        total_xp,
        FLOOR(total_xp / 100) + 1 as level,
        (SELECT COUNT(*) FROM books WHERE user_id = $1) as book_count,
        (SELECT ARRAY_AGG(id::text) FROM quests WHERE user_id = $1 AND status = 'completed') as completed_quests
      FROM users 
      WHERE id = $1
    `
    
    const userResult = await query(userQuery, [user.id])
    const userData = userResult.rows[0] || { level: 1, book_count: 0, completed_quests: [] }

    let questsToCreate = []

    if (auto_generate) {
      // 자동 생성: 균형 잡힌 템플릿 선택
      const recentQuestTypesQuery = `
        SELECT ARRAY_AGG(DISTINCT type) as recent_types
        FROM quests 
        WHERE user_id = $1 
          AND created_at > CURRENT_DATE - INTERVAL '7 days'
      `
      
      const recentTypesResult = await query(recentQuestTypesQuery, [user.id])
      const recentQuestTypes = recentTypesResult.rows[0]?.recent_types || []

      const balancedTemplates = QuestTemplateManager.getBalancedTemplates({
        level: userData.level,
        bookCount: userData.book_count,
        completedQuests: userData.completed_quests || [],
        recentQuestTypes,
        currentTime: new Date()
      }, 3)

      questsToCreate = balancedTemplates.map(template => 
        QuestTemplateManager.generateQuestFromTemplate(template, {}, userData.level)
      )
    } else {
      // 수동 생성: 특정 템플릿 사용
      if (!template_id) {
        return NextResponse.json(
          { error: '템플릿 ID가 필요합니다.' },
          { status: 400 }
        )
      }

      const template = QuestTemplateManager.getTemplateById(template_id)
      if (!template) {
        return NextResponse.json(
          { error: '존재하지 않는 템플릿입니다.' },
          { status: 404 }
        )
      }

      // 사용자가 템플릿을 사용할 수 있는지 확인
      const availableTemplates = QuestTemplateManager.getAvailableTemplates({
        level: userData.level,
        bookCount: userData.book_count,
        completedQuests: userData.completed_quests || [],
        currentTime: new Date()
      })

      if (!availableTemplates.some(t => t.id === template_id)) {
        return NextResponse.json(
          { error: '이 템플릿을 사용할 수 있는 조건을 만족하지 않습니다.' },
          { status: 403 }
        )
      }

      const questRequest = QuestTemplateManager.generateQuestFromTemplate(
        template,
        variables || {},
        userData.level
      )
      
      questsToCreate = [questRequest]
    }

    // 퀘스트 생성
    const createdQuests = []
    
    for (const questData of questsToCreate) {
      // 만료 시간 계산
      const expiresAt = QuestManager.calculateExpiryTime(questData.quest_type)
      
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 'pending', $9, $10, $11, $12)
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
        questData.quest_type,
        questData.difficulty,
        questData.xp_reward || questData.difficulty * 10,
        questData.coin_reward || questData.difficulty * 5,
        questData.target_value,
        user.id,
        expiresAt,
        questData.auto_renew || false,
        questData.grace_period_minutes || 60
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
        ) VALUES ($1, $2, $3, 0, 1.0)
      `
      
      await query(metadataQuery, [
        newQuest.id,
        JSON.stringify(questData.renewal_pattern || {
          interval: 'daily',
          time: '00:00'
        }),
        JSON.stringify(questData.expiry_notifications || {
          '24h_before': true,
          '6h_before': true,
          '1h_before': true,
          '15m_before': true,
          'expired': true
        })
      ])
      
      createdQuests.push(newQuest)
    }

    return NextResponse.json({
      success: true,
      message: `${createdQuests.length}개의 퀘스트가 템플릿으로부터 생성되었습니다.`,
      quests: createdQuests,
      generation_type: auto_generate ? 'auto' : 'manual'
    })
  } catch (error) {
    console.error('템플릿 기반 퀘스트 생성 오류:', error)
    return NextResponse.json(
      { error: '템플릿 기반 퀘스트 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}