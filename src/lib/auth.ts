// 클라이언트 사이드 전용 인증 유틸리티
// 서버 사이드 인증 로직은 API 라우트에서 처리

// 사용자 인터페이스
export interface User {
  id: string
  email: string
  name: string
  role: 'child' | 'parent'
  avatar_url?: string
  family_id?: string
  created_at: string
}

// 인증 토큰 인터페이스
export interface AuthToken {
  token: string
  user: User
}

// 클라이언트 사이드 인증 헬퍼
export const clientAuth = {
  // 로컬 스토리지에서 토큰 가져오기
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
  },

  // 로컬 스토리지에 토큰 저장
  setToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem('auth_token', token)
  },

  // 로컬 스토리지에서 토큰 제거
  removeToken(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('auth_token')
  },

  // 로그아웃
  signOut(): void {
    this.removeToken()
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  }
}