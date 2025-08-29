import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      )
    }
    
    const token = authHeader.substring(7) // 'Bearer ' 제거
    
    // 서버 사이드에서 토큰 검증
    const user = await authService.getCurrentUser(token)
    
    if (!user) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      success: true,
      user
    })
  } catch (error) {
    console.error('토큰 검증 오류:', error)
    return NextResponse.json(
      { error: '토큰 검증에 실패했습니다.' },
      { status: 401 }
    )
  }
}