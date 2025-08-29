import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'
import { RewardSystem } from '@/lib/reward-system'

// 독서 세션 완료 처리
export async function POST(request: NextRequest, { params }: { params: { sessionId: string } }) {
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
    const { focusScore, pagesRead, summary } = await request.json()
    
    // 독서 세션 존재 및 소유권 확인
    const sessionQuery = `
      SELECT id, user_id, book_id, start_time, end_time, duration_minutes
      FROM reading_sessions 
      WHERE id = $1 AND user_id = $2
    `
    
    const sessionResult = await query(sessionQuery, [sessionId, user.id])
    
    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: '독서 세션을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const session = sessionResult.rows[0]
    
    if (session.end_time) {
      return NextResponse.json(
        { error: '이미 완료된 독서 세션입니다.' },
        { status: 400 }
      )
    }
    
    // 세션 종료 시간 계산
    const endTime = new Date()
    const startTime = new Date(session.start_time)
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60))
    
    // 독서 세션 완료 상태로 업데이트
    await query(
      `UPDATE reading_sessions 
       SET 
         end_time = $1,
         duration_minutes = $2,
         focus_score = $3,
         pages_read = $4,
         summary = $5
       WHERE id = $6`,
      [endTime, durationMinutes, focusScore, pagesRead, summary, sessionId]
    )
    
    // 보상 지급 (최소 5분 이상 독서한 경우에만)
    let reward = null
    if (durationMinutes >= 5) {
      reward = await RewardSystem.giveReadingReward(
        user.id,
        sessionId,
        {
          duration: durationMinutes,
          focusScore: focusScore || 70, // 기본값
          pagesRead: pagesRead || 0
        }
      )
    }
    
    // 업데이트된 사용자 통계 조회
    const userStats = await RewardSystem.getUserStats(user.id)
    
    return NextResponse.json({
      success: true,
      message: '독서 세션이 완료되었습니다!',
      session: {
        id: session.id,
        duration_minutes: durationMinutes,
        focus_score: focusScore,
        pages_read: pagesRead,
        end_time: endTime.toISOString()
      },
      reward,
      userStats
    })
  } catch (error) {
    console.error('독서 세션 완료 오류:', error)
    return NextResponse.json(
      { error: '독서 세션 완료 처리에 실패했습니다.' },
      { status: 500 }
    )
  }
}