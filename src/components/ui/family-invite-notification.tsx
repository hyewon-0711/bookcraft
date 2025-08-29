'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Check, 
  X, 
  Clock,
  UserPlus,
  Heart
} from 'lucide-react'
import { useAuth } from '@/lib/providers'
import { toast } from 'sonner'

interface FamilyInvite {
  id: string
  family_id: string
  family_name: string
  inviter_name: string
  message?: string
  created_at: string
  expires_at: string
}

export function FamilyInviteNotification() {
  const { user } = useAuth()
  const [invites, setInvites] = useState<FamilyInvite[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [processingInvite, setProcessingInvite] = useState<string | null>(null)

  // 대기 중인 초대 조회
  const fetchInvites = async () => {
    if (!user) return

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/family/invites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setInvites(data.invites || [])
      }
    } catch (error) {
      console.error('초대 조회 오류:', error)
    }
  }

  // 초대 수락/거절 처리
  const handleInviteAction = async (inviteId: string, action: 'accept' | 'reject') => {
    setProcessingInvite(inviteId)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/family/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          invite_id: inviteId,
          action: action
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        
        // 초대 목록에서 제거
        setInvites(prev => prev.filter(invite => invite.id !== inviteId))
        
        // 수락한 경우 페이지 새로고침 (가족 정보 업데이트)
        if (action === 'accept') {
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || '처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('초대 처리 오류:', error)
      toast.error('처리에 실패했습니다.')
    } finally {
      setProcessingInvite(null)
    }
  }

  // 남은 시간 계산
  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return '만료됨'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}일 ${hours}시간 남음`
    if (hours > 0) return `${hours}시간 남음`
    return '곧 만료'
  }

  useEffect(() => {
    if (user) {
      fetchInvites()
    }
  }, [user])

  if (!user || invites.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {invites.map((invite) => (
        <Card key={invite.id} className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 p-2 rounded-full">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-blue-900">
                    🎉 가족 초대가 도착했어요!
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    {invite.inviter_name}님이 '{invite.family_name}' 가족에 초대했습니다
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
                <Clock className="h-3 w-3 mr-1" />
                {getTimeRemaining(invite.expires_at)}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {invite.message && (
              <div className="bg-white/70 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700 italic">
                  💌 "{invite.message}"
                </p>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => handleInviteAction(invite.id, 'accept')}
                disabled={processingInvite === invite.id}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-2xl"
              >
                {processingInvite === invite.id ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>처리 중...</span>
                  </div>
                ) : (
                  <>
                    <Heart className="h-4 w-4 mr-2" />
                    수락하기
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => handleInviteAction(invite.id, 'reject')}
                disabled={processingInvite === invite.id}
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-2xl"
              >
                <X className="h-4 w-4 mr-2" />
                거절하기
              </Button>
            </div>
            
            <div className="mt-3 text-xs text-gray-500 text-center">
              초대는 {new Date(invite.expires_at).toLocaleDateString('ko-KR')}까지 유효합니다
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}