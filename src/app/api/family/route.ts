import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-server'
import { query } from '@/lib/database'

// 가족 정보 조회
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

    // 사용자의 가족 정보 조회
    const familyQuery = `
      SELECT 
        f.id,
        f.name,
        f.invite_code,
        f.created_by,
        f.description,
        f.created_at
      FROM families f
      JOIN users u ON u.family_id = f.id
      WHERE u.id = $1
    `
    
    const familyResult = await query(familyQuery, [userId])
    
    if (familyResult.rows.length === 0) {
      return NextResponse.json(
        { error: '가족을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    const family = familyResult.rows[0]
    
    // 가족 구성원 조회
    const membersQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.avatar_url,
        u.total_xp,
        u.total_coins,
        u.current_streak,
        (
          SELECT COUNT(*) 
          FROM user_books ub 
          WHERE ub.user_id = u.id AND ub.status = 'completed'
        ) as books_read
      FROM users u
      WHERE u.family_id = $1
      ORDER BY u.total_xp DESC
    `
    
    const membersResult = await query(membersQuery, [family.id])
    
    return NextResponse.json({
      family: {
        ...family,
        members: membersResult.rows
      }
    })
    
  } catch (error) {
    console.error('가족 조회 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 가족 생성
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
    const { name, description } = await request.json()
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: '가족 이름이 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 사용자가 이미 가족에 속해있는지 확인
    const userResult = await query(
      'SELECT family_id FROM users WHERE id = $1',
      [userId]
    )
    
    if (userResult.rows.length > 0 && userResult.rows[0].family_id) {
      return NextResponse.json(
        { error: '이미 가족에 속해있습니다.' },
        { status: 400 }
      )
    }
    
    // 고유한 초대 코드 생성
    const generateInviteCode = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase()
    }
    
    let inviteCode = generateInviteCode()
    
    // 초대 코드 중복 확인
    let codeExists = true
    while (codeExists) {
      const codeResult = await query(
        'SELECT id FROM families WHERE invite_code = $1',
        [inviteCode]
      )
      
      if (codeResult.rows.length === 0) {
        codeExists = false
      } else {
        inviteCode = generateInviteCode()
      }
    }
    
    // 가족 생성
    const familyResult = await query(
      `INSERT INTO families (name, invite_code, created_by, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, name, invite_code, created_by, description, created_at`,
      [name.trim(), inviteCode, userId, description || null]
    )
    
    if (familyResult.rows.length === 0) {
      return NextResponse.json(
        { error: '가족 생성에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    const newFamily = familyResult.rows[0]
    
    // 사용자를 가족에 추가
    await query(
      'UPDATE users SET family_id = $1, updated_at = NOW() WHERE id = $2',
      [newFamily.id, userId]
    )
    
    return NextResponse.json({
      message: '가족이 성공적으로 생성되었습니다.',
      family: newFamily
    })
    
  } catch (error) {
    console.error('가족 생성 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}