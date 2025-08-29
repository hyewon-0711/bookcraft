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
    
    // 사용자의 책 목록 조회
    const queryText = `
      SELECT 
        id,
        title,
        author,
        isbn,
        cover_image_url,
        description,
        page_count,
        publisher,
        published_date,
        genre,
        created_at,
        updated_at
      FROM books 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `
    
    const result = await query(queryText, [user.id])
    
    return NextResponse.json({
      success: true,
      books: result.rows
    })
  } catch (error) {
    console.error('책 목록 조회 오류:', error)
    return NextResponse.json(
      { error: '책 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

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
    
    const {
      title,
      author,
      isbn,
      cover_image_url,
      description,
      page_count,
      publisher,
      published_date,
      genre
    } = await request.json()
    
    // 필수 필드 검증
    if (!title || !author) {
      return NextResponse.json(
        { error: '제목과 저자는 필수 입력 항목입니다.' },
        { status: 400 }
      )
    }

    // 출간일 형식 검증 및 변환
    let formattedPublishedDate = null
    if (published_date) {
      try {
        // 연도만 입력된 경우 (예: "1984")
        if (/^\d{4}$/.test(published_date.toString())) {
          formattedPublishedDate = `${published_date}-01-01`
        }
        // 연도-월 형식 (예: "1984-06")
        else if (/^\d{4}-\d{2}$/.test(published_date.toString())) {
          formattedPublishedDate = `${published_date}-01`
        }
        // 완전한 날짜 형식 (예: "1984-06-15")
        else if (/^\d{4}-\d{2}-\d{2}$/.test(published_date.toString())) {
          formattedPublishedDate = published_date
        }
        // ISO 날짜 형식 처리
        else {
          const date = new Date(published_date)
          if (!isNaN(date.getTime())) {
            formattedPublishedDate = date.toISOString().split('T')[0]
          }
        }
      } catch (error) {
        console.warn('출간일 형식 변환 실패:', published_date, error)
        formattedPublishedDate = null
      }
    }
    
    // 같은 사용자가 같은 ISBN의 책을 이미 등록했는지 확인
    if (isbn) {
      const existingBook = await query(
        'SELECT id FROM books WHERE user_id = $1 AND isbn = $2',
        [user.id, isbn]
      )
      
      if (existingBook.rows.length > 0) {
        return NextResponse.json(
          { error: '이미 등록된 ISBN입니다.' },
          { status: 400 }
        )
      }
    }
    
    // 책 등록
    const insertQuery = `
      INSERT INTO books (
        title,
        author,
        isbn,
        cover_image_url,
        description,
        page_count,
        publisher,
        published_date,
        genre,
        user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id,
        title,
        author,
        isbn,
        cover_image_url,
        description,
        page_count,
        publisher,
        published_date,
        genre,
        created_at,
        updated_at
    `
    
    const result = await query(insertQuery, [
      title,
      author,
      isbn || null,
      cover_image_url || null,
      description || null,
      page_count || null,
      publisher || null,
      formattedPublishedDate,
      genre || null,
      user.id
    ])
    
    const newBook = result.rows[0]
    
    return NextResponse.json({
      success: true,
      book: newBook,
      message: '책이 성공적으로 등록되었습니다.'
    })
  } catch (error) {
    console.error('책 등록 오류:', error)
    return NextResponse.json(
      { error: '책 등록에 실패했습니다.' },
      { status: 500 }
    )
  }
}