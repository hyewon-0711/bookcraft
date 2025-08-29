import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
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
    
    const { sessionId } = params
    const { duration_minutes, pages_read, focus_score, summary } = await request.json()
    
    // 독서 세션 확인
    const sessionQuery = `
      SELECT 
        rs.id,
        rs.user_id,
        rs.book_id,
        rs.start_time,
        b.title as book_title
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.id = $1 AND rs.user_id = $2 AND rs.end_time IS NULL
    `
    
    const sessionResult = await query(sessionQuery, [sessionId, user.id])
    
    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: '독서 세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const session = sessionResult.rows[0]
    
    // 독서 세션 종료 처리
    const updateSessionQuery = `
      UPDATE reading_sessions 
      SET 
        end_time = NOW(),
        duration_minutes = $1,
        pages_read = $2,
        focus_score = $3,
        summary = $4
      WHERE id = $5
      RETURNING 
        id,
        user_id,
        book_id,
        start_time,
        end_time,
        duration_minutes,
        pages_read,
        focus_score,
        summary
    `
    
    const updatedSessionResult = await query(updateSessionQuery, [
      duration_minutes || 0,
      pages_read || 0,
      Math.max(0, Math.min(100, focus_score || 50)),
      summary || null,
      sessionId
    ])
    
    const updatedSession = updatedSessionResult.rows[0]
    
    // XP 계산 (독서 시간, 페이지 수, 집중도 기반)
    const baseXP = Math.floor(duration_minutes * 2) // 분당 2 XP
    const pageBonus = Math.floor(pages_read * 5) // 페이지당 5 XP
    const focusBonus = Math.floor((focus_score / 100) * baseXP * 0.5) // 집중도 보너스
    const totalXP = baseXP + pageBonus + focusBonus
    
    // 코인 계산
    const coins = Math.floor(totalXP / 10)
    
    // 사용자 통계 업데이트
    const updateUserQuery = `
      UPDATE users 
      SET 
        total_xp = total_xp + $1,
        total_coins = total_coins + $2
      WHERE id = $3
      RETURNING total_xp, total_coins
    `
    
    const userResult = await query(updateUserQuery, [totalXP, coins, user.id])
    
    // 독서 관련 퀘스트 진행률 업데이트
    const updateQuestQuery = `
      UPDATE quests 
      SET current_progress = current_progress + $1
      WHERE user_id = $2 
      AND status = 'in_progress'
      AND type IN ('timer', 'reading')
      AND DATE(created_at) = CURRENT_DATE
    `
    
    await query(updateQuestQuery, [duration_minutes, user.id])
    
    // 연속 독서 일수 업데이트
    await query('SELECT update_reading_streak($1)', [user.id])
    
    // 배지 조건 확인
    await query('SELECT check_and_award_badges($1)', [user.id])
    
    const updatedUser = userResult.rows[0]
    
    return NextResponse.json({
      success: true,
      message: '독서 세션이 완료되었습니다!',
      session: {
        ...updatedSession,
        status: 'completed'
      },
      rewards: {
        xp_earned: totalXP,
        coins_earned: coins,
        breakdown: {
          base_xp: baseXP,
          page_bonus: pageBonus,
          focus_bonus: focusBonus
        }
      },
      userStats: {
        total_xp: updatedUser.total_xp,
        total_coins: updatedUser.total_coins,
        level: Math.floor(updatedUser.total_xp / 100) + 1
      }
    })
  } catch (error) {
    console.error('독서 세션 종료 오류:', error)
    return NextResponse.json(
      { error: '독서 세션 종료에 실패했습니다.' },
      { status: 500 }
    )
  }
}