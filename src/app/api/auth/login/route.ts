import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }
    
    const result = await authService.signIn(email, password)
    
    return NextResponse.json({
      success: true,
      token: result.token,
      user: result.user
    })
  } catch (error: any) {
    console.error('로그인 오류:', error)
    return NextResponse.json(
      { error: error.message || '로그인에 실패했습니다.' },
      { status: 401 }
    )
  }
}