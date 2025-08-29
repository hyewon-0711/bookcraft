'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'

interface ProvidersProps {
  children: ReactNode
}

/**
 * 애플리케이션 전역 프로바이더 컴포넌트
 * React Query, 토스트 알림 등을 설정합니다.
 */
export function Providers({ children }: ProvidersProps) {
  // React Query 클라이언트 생성 (컴포넌트 리렌더링 시 재생성 방지)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 5분간 캐시 유지
            staleTime: 1000 * 60 * 5,
            // 네트워크 오류 시 3번 재시도
            retry: 3,
            // 백그라운드에서 자동 리페치 비활성화
            refetchOnWindowFocus: false,
          },
          mutations: {
            // 뮤테이션 오류 시 1번 재시도
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        {/* 개발 환경에서만 React Query 개발자 도구 표시 */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
        {/* 토스트 알림 컴포넌트 */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  )
}

/**
 * 인증 상태 관리를 위한 컨텍스트
 */
import { createContext, useContext, useEffect } from 'react'
import { User, clientAuth } from './auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  setUser: (user: User | null) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 초기 세션 확인
    const getInitialSession = async () => {
      const token = clientAuth.getToken()
      if (token) {
        try {
          // 서버 사이드에서 토큰 검증을 위한 API 호출
          const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const userData = await response.json()
            setUser(userData.user)
          } else {
            clientAuth.removeToken()
          }
        } catch (error) {
          console.error('토큰 검증 실패:', error)
          clientAuth.removeToken()
        }
      }
      setLoading(false)
    }

    getInitialSession()
  }, [])

  const signOut = async () => {
    clientAuth.signOut()
    setUser(null)
  }

  const refreshUser = async () => {
    const token = clientAuth.getToken()
    if (token) {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const userData = await response.json()
          setUser(userData.user)
        } else {
          clientAuth.removeToken()
          setUser(null)
        }
      } catch (error) {
        console.error('사용자 정보 새로고침 실패:', error)
        clientAuth.removeToken()
        setUser(null)
      }
    }
  }

  const value = {
    user,
    loading,
    signOut,
    setUser,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * 인증 컨텍스트 사용을 위한 커스텀 훅
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내부에서 사용되어야 합니다.')
  }
  return context
}

/**
 * 보호된 라우트를 위한 컴포넌트
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    // 로그인 페이지로 리다이렉트
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }

  return <>{children}</>
}