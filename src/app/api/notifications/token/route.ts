import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'

// FCM 토큰 저장/업데이트
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

    const { fcm_token, device_info } = await request.json()

    if (!fcm_token) {
      return NextResponse.json(
        { error: 'FCM 토큰이 필요합니다.' },
        { status: 400 }
      )
    }

    // 기존 토큰 확인
    const existingTokenQuery = `
      SELECT id FROM user_fcm_tokens 
      WHERE user_id = $1 AND fcm_token = $2
    `
    
    const existingResult = await query(existingTokenQuery, [user.id, fcm_token])
    
    if (existingResult.rows.length > 0) {
      // 기존 토큰 업데이트 (마지막 사용 시간)
      const updateQuery = `
        UPDATE user_fcm_tokens 
        SET 
          last_used_at = CURRENT_TIMESTAMP,
          device_info = $3,
          is_active = true
        WHERE user_id = $1 AND fcm_token = $2
      `
      
      await query(updateQuery, [user.id, fcm_token, JSON.stringify(device_info || {})])
    } else {
      // 새 토큰 저장
      const insertQuery = `
        INSERT INTO user_fcm_tokens (
          user_id,
          fcm_token,
          device_info,
          is_active,
          created_at,
          last_used_at
        ) VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `
      
      await query(insertQuery, [
        user.id,
        fcm_token,
        JSON.stringify(device_info || {})
      ])
    }

    // 사용자의 다른 비활성 토큰들 정리 (선택사항)
    const cleanupQuery = `
      UPDATE user_fcm_tokens 
      SET is_active = false 
      WHERE user_id = $1 
        AND fcm_token != $2 
        AND last_used_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
    `
    
    await query(cleanupQuery, [user.id, fcm_token])

    return NextResponse.json({
      success: true,
      message: 'FCM 토큰이 성공적으로 저장되었습니다.'
    })
  } catch (error) {
    console.error('FCM 토큰 저장 오류:', error)
    return NextResponse.json(
      { error: 'FCM 토큰 저장에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 사용자의 FCM 토큰 목록 조회
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

    const tokensQuery = `
      SELECT 
        id,
        fcm_token,
        device_info,
        is_active,
        created_at,
        last_used_at
      FROM user_fcm_tokens 
      WHERE user_id = $1 AND is_active = true
      ORDER BY last_used_at DESC
    `
    
    const result = await query(tokensQuery, [user.id])

    return NextResponse.json({
      success: true,
      tokens: result.rows
    })
  } catch (error) {
    console.error('FCM 토큰 조회 오류:', error)
    return NextResponse.json(
      { error: 'FCM 토큰 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// FCM 토큰 비활성화
export async function DELETE(request: NextRequest) {
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

    const { fcm_token } = await request.json()

    if (!fcm_token) {
      return NextResponse.json(
        { error: 'FCM 토큰이 필요합니다.' },
        { status: 400 }
      )
    }

    const deactivateQuery = `
      UPDATE user_fcm_tokens 
      SET is_active = false 
      WHERE user_id = $1 AND fcm_token = $2
    `
    
    await query(deactivateQuery, [user.id, fcm_token])

    return NextResponse.json({
      success: true,
      message: 'FCM 토큰이 비활성화되었습니다.'
    })
  } catch (error) {
    console.error('FCM 토큰 비활성화 오류:', error)
    return NextResponse.json(
      { error: 'FCM 토큰 비활성화에 실패했습니다.' },
      { status: 500 }
    )
  }
}