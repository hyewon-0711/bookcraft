import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'
import { query } from '@/lib/database'

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
    
    const { book_id } = await request.json()
    
    if (!book_id) {
      return NextResponse.json(
        { error: '책 ID가 필요합니다.' },
        { status: 400 }
      )
    }
    
    // 책이 사용자의 것인지 확인
    const bookQuery = `
      SELECT id, title, author
      FROM books 
      WHERE id = $1 AND user_id = $2
    `
    
    const bookResult = await query(bookQuery, [book_id, user.id])
    
    if (bookResult.rows.length === 0) {
      return NextResponse.json(
        { error: '책을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 이미 진행 중인 독서 세션이 있는지 확인
    const activeSessionQuery = `
      SELECT id
      FROM reading_sessions 
      WHERE user_id = $1 AND end_time IS NULL
    `
    
    const activeSessionResult = await query(activeSessionQuery, [user.id])
    
    if (activeSessionResult.rows.length > 0) {
      return NextResponse.json(
        { error: '이미 진행 중인 독서 세션이 있습니다.' },
        { status: 400 }
      )
    }
    
    // 새 독서 세션 생성
    const insertSessionQuery = `
      INSERT INTO reading_sessions (
        user_id,
        book_id,
        start_time
      ) VALUES ($1, $2, NOW())
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
    
    const sessionResult = await query(insertSessionQuery, [user.id, book_id])
    const session = sessionResult.rows[0]
    
    return NextResponse.json({
      success: true,
      message: '독서 세션이 시작되었습니다.',
      session: {
        ...session,
        status: 'active'
      },
      book: bookResult.rows[0]
    })
  } catch (error) {
    console.error('독서 세션 시작 오류:', error)
    return NextResponse.json(
      { error: '독서 세션 시작에 실패했습니다.' },
      { status: 500 }
    )
  }
}