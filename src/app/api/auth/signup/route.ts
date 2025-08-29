import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json()
    
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      )
    }
    
    if (!['child', 'parent'].includes(role)) {
      return NextResponse.json(
        { error: '올바른 역할을 선택해주세요.' },
        { status: 400 }
      )
    }
    
    const result = await authService.signUp({
      email,
      password,
      name,
      role
    })
    
    return NextResponse.json({
      success: true,
      token: result.token,
      user: result.user
    })
  } catch (error: any) {
    console.error('회원가입 오류:', error)
    return NextResponse.json(
      { error: error.message || '회원가입에 실패했습니다.' },
      { status: 400 }
    )
  }
}