import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'

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
    
    // 사용자의 퀘스트 목록 조회
    const questsQuery = `
      SELECT 
        id,
        title,
        description,
        type,
        difficulty,
        xp_reward,
        coin_reward,
        target_value,
        progress as current_progress,
        status,
        created_at,
        completed_at
      FROM quests 
      WHERE user_id = $1 
      ORDER BY created_at DESC
      LIMIT 50
    `
    
    const questsResult = await query(questsQuery, [user.id])
    
    // 사용자 통계 조회
    const statsQuery = `
      SELECT 
        total_xp,
        total_coins,
        current_streak,
        FLOOR(total_xp / 100) + 1 as level
      FROM users 
      WHERE id = $1
    `
    
    const statsResult = await query(statsQuery, [user.id])
    
    // 오늘 완료한 퀘스트 수 조회
    const todayQuestsQuery = `
      SELECT COUNT(*) as completed_today
      FROM quests 
      WHERE user_id = $1 
      AND status = 'completed'
      AND DATE(completed_at) = CURRENT_DATE
    `
    
    const todayResult = await query(todayQuestsQuery, [user.id])
    
    const userStats = {
      ...statsResult.rows[0],
      quests_completed_today: parseInt(todayResult.rows[0]?.completed_today || '0')
    }
    
    return NextResponse.json({
      success: true,
      quests: questsResult.rows,
      userStats
    })
  } catch (error) {
    console.error('퀘스트 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '퀘스트 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}