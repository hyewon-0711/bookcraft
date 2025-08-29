'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User, 
  Mail, 
  Calendar, 
  Crown, 
  Trophy, 
  Star, 
  Coins, 
  Target, 
  BookOpen,
  Edit,
  Save,
  X,
  Shield,
  Zap
} from 'lucide-react'
import { useAuth } from '@/lib/providers'
import { toast } from 'sonner'

interface UserStats {
  total_xp: number
  total_coins: number
  current_streak: number
  longest_streak: number
  books_read: number
  quests_completed: number
  level: number
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  })

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name,
        email: user.email
      })
      fetchUserStats()
    }
  }, [user])

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch('/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUserStats(data)
      }
    } catch (error) {
      console.error('사용자 통계 조회 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      })

      if (response.ok) {
        toast.success('프로필이 업데이트되었습니다!')
        setIsEditing(false)
        // 사용자 정보 새로고침 로직 필요
      } else {
        toast.error('프로필 업데이트에 실패했습니다.')
      }
    } catch (error) {
      console.error('프로필 업데이트 오류:', error)
      toast.error('프로필 업데이트에 실패했습니다.')
    }
  }

  const handleCancel = () => {
    setEditForm({
      name: user?.name || '',
      email: user?.email || ''
    })
    setIsEditing(false)
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h2>
            <p className="text-gray-600">프로필을 보려면 먼저 로그인해주세요.</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                <AvatarImage src={user.avatar_url || ''} alt={user.name} />
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
                <div className="flex items-center space-x-4 text-blue-100">
                  <div className="flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Shield className="h-4 w-4" />
                    <span>{user.role === 'child' ? '어린이' : '부모'}</span>
                  </div>
                </div>
                {userStats && (
                  <div className="flex items-center space-x-4 mt-3">
                    <div className="flex items-center space-x-1">
                      <Crown className="h-4 w-4 text-yellow-300" />
                      <span className="font-semibold">레벨 {userStats.level}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Zap className="h-4 w-4 text-yellow-300" />
                      <span>{userStats.total_xp.toLocaleString()} XP</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Coins className="h-4 w-4 text-yellow-300" />
                      <span>{userStats.total_coins.toLocaleString()} 코인</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Edit className="h-4 w-4 mr-2" />
              프로필 편집
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 기본 정보 */}
          <div className="lg:col-span-2">
            <Card className="rounded-3xl border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>기본 정보</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">이름</Label>
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="rounded-2xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">이메일</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="rounded-2xl"
                      />
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <Button onClick={handleSave} className="rounded-2xl">
                        <Save className="h-4 w-4 mr-2" />
                        저장
                      </Button>
                      <Button onClick={handleCancel} variant="outline" className="rounded-2xl">
                        <X className="h-4 w-4 mr-2" />
                        취소
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-500">이름</Label>
                        <p className="text-lg font-medium">{user.name}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">이메일</Label>
                        <p className="text-lg font-medium">{user.email}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">역할</Label>
                        <Badge variant={user.role === 'child' ? 'default' : 'secondary'} className="rounded-full">
                          {user.role === 'child' ? '어린이' : '부모'}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-gray-500">가입일</Label>
                        <p className="text-lg font-medium">
                          {new Date(user.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 통계 */}
          <div className="space-y-6">
            {userStats && (
              <>
                {/* 레벨 & XP */}
                <Card className="rounded-3xl border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-orange-700">
                      <Crown className="h-5 w-5" />
                      <span>레벨 & 경험치</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-2">
                        레벨 {userStats.level}
                      </div>
                      <div className="text-lg text-gray-600">
                        {userStats.total_xp.toLocaleString()} XP
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 코인 */}
                <Card className="rounded-3xl border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-blue-700">
                      <Coins className="h-5 w-5" />
                      <span>보유 코인</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {userStats.total_coins.toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 활동 통계 */}
                <Card className="rounded-3xl border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="h-5 w-5" />
                      <span>활동 통계</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-green-500" />
                        <span className="text-sm">읽은 책</span>
                      </div>
                      <span className="font-semibold">{userStats.books_read}권</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">완료한 퀘스트</span>
                      </div>
                      <span className="font-semibold">{userStats.quests_completed}개</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">현재 연속 기록</span>
                      </div>
                      <span className="font-semibold">{userStats.current_streak}일</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Trophy className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">최고 연속 기록</span>
                      </div>
                      <span className="font-semibold">{userStats.longest_streak}일</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}