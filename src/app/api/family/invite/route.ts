import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-server'
import { query } from '@/lib/database'

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
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: '이메일이 필요합니다.' },
        { status: 400 }
      )
    }

    // 현재 사용자의 가족 정보 조회
    const userResult = await query(
      'SELECT family_id FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0 || !userResult.rows[0].family_id) {
      return NextResponse.json(
        { error: '가족이 없습니다. 먼저 가족을 생성해주세요.' },
        { status: 400 }
      )
    }

    const currentUser = userResult.rows[0]

    // 초대할 사용자가 존재하는지 확인 (선택사항)
    const inviteUserResult = await query(
      'SELECT id, name, family_id FROM users WHERE email = $1',
      [email]
    )

    const inviteUser = inviteUserResult.rows.length > 0 ? inviteUserResult.rows[0] : null

    // 사용자가 존재하고 이미 가족이 있는지 확인
    if (inviteUser && inviteUser.family_id) {
      return NextResponse.json(
        { error: '이미 다른 가족에 속해있는 사용자입니다.' },
        { status: 400 }
      )
    }

    // 이미 초대가 있는지 확인
    const existingInviteResult = await query(
      'SELECT id FROM pending_invites WHERE family_id = $1 AND invitee_email = $2 AND status = $3',
      [currentUser.family_id, email, 'pending']
    )

    if (existingInviteResult.rows.length > 0) {
      return NextResponse.json(
        { error: '이미 해당 이메일로 초대를 보냈습니다.' },
        { status: 400 }
      )
    }

    // 초대 정보를 pending_invites 테이블에 저장
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const inviteResult = await query(
      `INSERT INTO pending_invites (family_id, inviter_id, invitee_email, invitee_id, status, expires_at, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
       RETURNING id, family_id, invitee_email, status`,
      [currentUser.family_id, userId, email, inviteUser?.id || null, 'pending', expiresAt]
    )

    if (inviteResult.rows.length === 0) {
      console.error('초대 생성 실패')
      return NextResponse.json(
        { error: '초대 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    const invite = inviteResult.rows[0]

    return NextResponse.json({
      message: inviteUser 
        ? `${inviteUser.name}님에게 가족 초대를 보냈습니다.`
        : `${email}로 가족 초대를 보냈습니다. 해당 이메일로 가입 후 초대를 확인할 수 있습니다.`,
      invite: {
        id: invite.id,
        email: email,
        status: 'pending'
      }
    })

  } catch (error) {
    console.error('가족 초대 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}