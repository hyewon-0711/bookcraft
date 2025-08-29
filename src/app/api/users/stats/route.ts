import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'

// 사용자 통계 조회
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

    // 사용자 기본 통계 조회
    const userStatsQuery = `
      SELECT 
        total_xp,
        total_coins,
        current_streak,
        longest_streak,
        updated_at as last_activity_date
      FROM users 
      WHERE id = $1
    `
    
    const userStatsResult = await query(userStatsQuery, [user.id])
    const userStats = userStatsResult.rows[0] || {
      total_xp: 0,
      total_coins: 0,
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null
    }

    // 등록된 책 수 조회
    const booksCountQuery = `
      SELECT COUNT(*) as total_books
      FROM books 
      WHERE user_id = $1
    `
    
    const booksCountResult = await query(booksCountQuery, [user.id])
    const totalBooks = parseInt(booksCountResult.rows[0]?.total_books || '0')

    // 완료된 퀘스트 수 조회
    const completedQuestsQuery = `
      SELECT COUNT(*) as completed_quests
      FROM quests 
      WHERE user_id = $1 AND status = 'completed'
    `
    
    const completedQuestsResult = await query(completedQuestsQuery, [user.id])
    const completedQuests = parseInt(completedQuestsResult.rows[0]?.completed_quests || '0')

    // 총 독서 시간 조회
    const readingTimeQuery = `
      SELECT 
        COALESCE(SUM(duration_minutes), 0) as total_reading_minutes,
        COUNT(*) as total_sessions
      FROM reading_sessions 
      WHERE user_id = $1 AND end_time IS NOT NULL
    `
    
    const readingTimeResult = await query(readingTimeQuery, [user.id])
    const readingStats = readingTimeResult.rows[0] || {
      total_reading_minutes: 0,
      total_sessions: 0
    }

    // 이번 주 활동 조회
    const weeklyActivityQuery = `
      SELECT 
        COUNT(DISTINCT DATE(created_at)) as active_days_this_week
      FROM (
        SELECT created_at FROM books WHERE user_id = $1 AND created_at >= date_trunc('week', CURRENT_DATE)
        UNION
        SELECT created_at FROM quests WHERE user_id = $1 AND created_at >= date_trunc('week', CURRENT_DATE)
        UNION
        SELECT start_time as created_at FROM reading_sessions WHERE user_id = $1 AND start_time >= date_trunc('week', CURRENT_DATE)
      ) as activities
    `
    
    const weeklyActivityResult = await query(weeklyActivityQuery, [user.id])
    const activeDaysThisWeek = parseInt(weeklyActivityResult.rows[0]?.active_days_this_week || '0')

    // 레벨 계산
    const currentLevel = Math.floor(userStats.total_xp / 100) + 1
    const xpToNextLevel = (currentLevel * 100) - userStats.total_xp
    const levelProgress = ((userStats.total_xp % 100) / 100) * 100

    return NextResponse.json({
      success: true,
      // 기본 통계
      total_xp: userStats.total_xp,
      total_coins: userStats.total_coins,
      current_streak: userStats.current_streak,
      longest_streak: userStats.longest_streak,
      
      // 레벨 정보
      current_level: currentLevel,
      xp_to_next_level: xpToNextLevel,
      level_progress: levelProgress,
      
      // 활동 통계
      total_books: totalBooks,
      completed_quests: completedQuests,
      total_reading_minutes: parseInt(readingStats.total_reading_minutes),
      total_reading_sessions: parseInt(readingStats.total_sessions),
      
      // 주간 활동
      active_days_this_week: activeDaysThisWeek,
      
      // 기타
      last_activity_date: userStats.last_activity_date
    })
  } catch (error) {
    console.error('사용자 통계 조회 오류:', error)
    return NextResponse.json(
      { error: '사용자 통계 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}