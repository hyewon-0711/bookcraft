import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-server'
import { query } from '@/lib/database'

// 사용자의 대기 중인 초대 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 토큰 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decoded
    
    try {
      decoded = verifyToken(token)
    } catch (error) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }

    const userId = decoded.userId || decoded.id

    // 사용자 정보 조회
    const userResult = await query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    // 대기 중인 초대 조회
    const invitesResult = await query(
      `SELECT 
        pi.id,
        pi.family_id,
        pi.inviter_id,
        pi.message,
        pi.created_at,
        pi.expires_at,
        f.name as family_name,
        u.name as inviter_name
      FROM pending_invites pi
      JOIN families f ON pi.family_id = f.id
      JOIN users u ON pi.inviter_id = u.id
      WHERE pi.invitee_email = $1 
        AND pi.status = 'pending' 
        AND pi.expires_at > NOW()
      ORDER BY pi.created_at DESC`,
      [user.email]
    )

    const invites = invitesResult.rows.map((invite: any) => ({
      id: invite.id,
      family_id: invite.family_id,
      family_name: invite.family_name,
      inviter_name: invite.inviter_name,
      message: invite.message,
      created_at: invite.created_at,
      expires_at: invite.expires_at
    }))

    return NextResponse.json({ invites })

  } catch (error) {
    console.error('초대 조회 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 초대 수락/거절 처리
export async function POST(request: NextRequest) {
  try {
    // 인증 토큰 확인
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decoded
    
    try {
      decoded = verifyToken(token)
    } catch (error) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }

    const userId = decoded.userId || decoded.id
    const { invite_id, action } = await request.json()

    if (!invite_id || !action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: '유효하지 않은 요청입니다.' },
        { status: 400 }
      )
    }

    // 사용자 정보 조회
    const userResult = await query(
      'SELECT email, family_id FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    // 초대 정보 조회
    const inviteResult = await query(
      'SELECT * FROM pending_invites WHERE id = $1 AND invitee_email = $2 AND status = $3',
      [invite_id, user.email, 'pending']
    )

    if (inviteResult.rows.length === 0) {
      return NextResponse.json(
        { error: '유효하지 않은 초대입니다.' },
        { status: 404 }
      )
    }

    const invite = inviteResult.rows[0]

    // 초대 만료 확인
    if (new Date(invite.expires_at) < new Date()) {
      await query(
        'UPDATE pending_invites SET status = $1, updated_at = NOW() WHERE id = $2',
        ['expired', invite_id]
      )

      return NextResponse.json(
        { error: '만료된 초대입니다.' },
        { status: 400 }
      )
    }

    if (action === 'accept') {
      // 이미 다른 가족에 속해있는지 확인
      if (user.family_id) {
        return NextResponse.json(
          { error: '이미 다른 가족에 속해있습니다.' },
          { status: 400 }
        )
      }

      // 사용자를 가족에 추가
      const updateUserResult = await query(
        'UPDATE users SET family_id = $1, updated_at = NOW() WHERE id = $2',
        [invite.family_id, userId]
      )

      if (updateUserResult.rowCount === 0) {
        console.error('가족 추가 실패')
        return NextResponse.json(
          { error: '가족 추가에 실패했습니다.' },
          { status: 500 }
        )
      }

      // 초대 상태를 수락으로 변경
      await query(
        'UPDATE pending_invites SET status = $1, invitee_id = $2, updated_at = NOW() WHERE id = $3',
        ['accepted', userId, invite_id]
      )

      return NextResponse.json({
        message: '가족 초대를 수락했습니다!',
        action: 'accepted'
      })

    } else if (action === 'reject') {
      // 초대 상태를 거절로 변경
      await query(
        'UPDATE pending_invites SET status = $1, invitee_id = $2, updated_at = NOW() WHERE id = $3',
        ['rejected', userId, invite_id]
      )

      return NextResponse.json({
        message: '가족 초대를 거절했습니다.',
        action: 'rejected'
      })
    }

  } catch (error) {
    console.error('초대 처리 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}