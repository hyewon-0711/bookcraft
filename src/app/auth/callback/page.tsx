'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clientAuth } from '@/lib/auth'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const token = clientAuth.getToken()
        
        if (!token) {
          console.error('토큰이 없습니다.')
          router.push('/auth/login?error=no_token')
          return
        }

        const response = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          // 로그인 성공 시 대시보드로 이동
          router.push('/dashboard')
        } else {
          // 유효하지 않은 토큰이면 로그인 페이지로 이동
          clientAuth.removeToken()
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('예상치 못한 오류:', error)
        clientAuth.removeToken()
        router.push('/auth/login?error=unexpected_error')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">로그인 처리 중...</h2>
        <p className="text-gray-600">잠시만 기다려주세요.</p>
      </div>
    </div>
  )
}