import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-server'
import { query } from '@/lib/database'

// 가족 참여
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

    const { invite_code } = await request.json()
    
    if (!invite_code || invite_code.trim().length === 0) {
      return NextResponse.json(
        { error: '초대 코드를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 이미 가족에 속해있는지 확인
    const existingFamilyQuery = `
      SELECT family_id FROM users WHERE id = $1 AND family_id IS NOT NULL
    `
    const existingResult = await query(existingFamilyQuery, [userId])
    
    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: '이미 가족에 속해있습니다.' },
        { status: 400 }
      )
    }

    // 초대 코드로 가족 찾기
    const familyQuery = `
      SELECT 
        id,
        name,
        invite_code,
        created_by,
        description,
        max_members,
        created_at
      FROM families 
      WHERE invite_code = $1
    `
    
    const familyResult = await query(familyQuery, [invite_code.trim().toUpperCase()])
    
    if (familyResult.rows.length === 0) {
      return NextResponse.json(
        { error: '유효하지 않은 초대 코드입니다.' },
        { status: 404 }
      )
    }
    
    const family = familyResult.rows[0]
    
    // 가족 구성원 수 확인
    const memberCountQuery = `
      SELECT COUNT(*) as member_count FROM users WHERE family_id = $1
    `
    const memberCountResult = await query(memberCountQuery, [family.id])
    const currentMemberCount = parseInt(memberCountResult.rows[0].member_count)
    
    if (currentMemberCount >= family.max_members) {
      return NextResponse.json(
        { error: '가족 구성원 수가 최대치에 도달했습니다.' },
        { status: 400 }
      )
    }

    // 사용자를 가족에 추가
    const updateUserQuery = `
      UPDATE users SET family_id = $1 WHERE id = $2
    `
    
    await query(updateUserQuery, [family.id, userId])
    
    // 업데이트된 가족 정보와 구성원 정보 반환
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
        COALESCE(book_stats.books_read, 0) as books_read
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(*) as books_read
        FROM books
        GROUP BY user_id
      ) book_stats ON u.id = book_stats.user_id
      WHERE u.family_id = $1
      ORDER BY u.total_xp DESC
    `
    
    const membersResult = await query(membersQuery, [family.id])
    
    return NextResponse.json({
      success: true,
      family: {
        ...family,
        members: membersResult.rows
      }
    })
  } catch (error) {
    console.error('가족 참여 오류:', error)
    return NextResponse.json(
      { error: '가족 참여에 실패했습니다.' },
      { status: 500 }
    )
  }
}