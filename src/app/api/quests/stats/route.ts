import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'

// 퀘스트 통계 조회
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

    // 오늘 날짜 기준 퀘스트 통계 조회
    const todayQuestsQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM quests 
      WHERE user_id = $1 
        AND DATE(created_at) = CURRENT_DATE
      GROUP BY status
    `
    
    const todayQuestsResult = await query(todayQuestsQuery, [user.id])
    
    // 결과 집계
    let pending = 0
    let completed = 0
    let in_progress = 0
    
    todayQuestsResult.rows.forEach(row => {
      switch (row.status) {
        case 'pending':
          pending = parseInt(row.count)
          break
        case 'completed':
          completed = parseInt(row.count)
          break
        case 'in_progress':
          in_progress = parseInt(row.count)
          break
      }
    })
    
    const total = pending + completed + in_progress

    // 전체 퀘스트 통계 조회
    const allTimeStatsQuery = `
      SELECT 
        COUNT(*) as total_quests,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as total_completed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as total_in_progress
      FROM quests 
      WHERE user_id = $1
    `
    
    const allTimeStatsResult = await query(allTimeStatsQuery, [user.id])
    const allTimeStats = allTimeStatsResult.rows[0] || {
      total_quests: 0,
      total_completed: 0,
      total_pending: 0,
      total_in_progress: 0
    }

    // 이번 주 퀘스트 통계
    const weeklyStatsQuery = `
      SELECT 
        COUNT(*) as weekly_total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as weekly_completed
      FROM quests 
      WHERE user_id = $1 
        AND created_at >= date_trunc('week', CURRENT_DATE)
    `
    
    const weeklyStatsResult = await query(weeklyStatsQuery, [user.id])
    const weeklyStats = weeklyStatsResult.rows[0] || {
      weekly_total: 0,
      weekly_completed: 0
    }

    // 연속 완료 일수 계산
    const streakQuery = `
      WITH daily_completions AS (
        SELECT 
          DATE(completed_at) as completion_date,
          COUNT(*) as completed_count
        FROM quests 
        WHERE user_id = $1 
          AND status = 'completed'
          AND completed_at IS NOT NULL
        GROUP BY DATE(completed_at)
        ORDER BY completion_date DESC
      ),
      streak_calculation AS (
        SELECT 
          completion_date,
          ROW_NUMBER() OVER (ORDER BY completion_date DESC) as row_num,
          completion_date - INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY completion_date DESC) - 1) as expected_date
        FROM daily_completions
      )
      SELECT COUNT(*) as current_streak
      FROM streak_calculation
      WHERE completion_date = expected_date
        AND completion_date <= CURRENT_DATE
    `
    
    const streakResult = await query(streakQuery, [user.id])
    const currentStreak = parseInt(streakResult.rows[0]?.current_streak || '0')

    // 평균 완료율 계산
    const completionRate = allTimeStats.total_quests > 0 
      ? (parseInt(allTimeStats.total_completed) / parseInt(allTimeStats.total_quests)) * 100 
      : 0

    // 최근 7일간 일일 완료 통계
    const dailyStatsQuery = `
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as completed_count
      FROM quests 
      WHERE user_id = $1 
        AND status = 'completed'
        AND completed_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(completed_at)
      ORDER BY date DESC
    `
    
    const dailyStatsResult = await query(dailyStatsQuery, [user.id])
    const dailyStats = dailyStatsResult.rows

    return NextResponse.json({
      success: true,
      
      // 오늘 퀘스트 상태
      today: {
        pending,
        completed,
        in_progress,
        total
      },
      
      // 전체 통계
      all_time: {
        total_quests: parseInt(allTimeStats.total_quests),
        total_completed: parseInt(allTimeStats.total_completed),
        total_pending: parseInt(allTimeStats.total_pending),
        total_in_progress: parseInt(allTimeStats.total_in_progress),
        completion_rate: Math.round(completionRate * 100) / 100
      },
      
      // 이번 주 통계
      weekly: {
        total: parseInt(weeklyStats.weekly_total),
        completed: parseInt(weeklyStats.weekly_completed)
      },
      
      // 연속 기록
      current_streak: currentStreak,
      
      // 최근 7일 일일 통계
      daily_stats: dailyStats,
      
      // 대시보드용 간단 통계 (기존 호환성)
      pending,
      completed,
      total
    })
  } catch (error) {
    console.error('퀘스트 통계 조회 오류:', error)
    return NextResponse.json(
      { error: '퀘스트 통계 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}