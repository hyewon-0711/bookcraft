'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Crown, 
  Trophy, 
  Plus, 
  Copy, 
  Check,
  UserPlus,
  Settings,
  Star,
  Target,
  BookOpen,
  Zap
} from 'lucide-react'
import { useAuth } from '@/lib/providers'
import { toast } from 'sonner'

interface FamilyMember {
  id: string
  name: string
  email: string
  role: 'parent' | 'child'
  avatar_url?: string
  total_xp: number
  total_coins: number
  current_streak: number
  books_read: number
}

interface Family {
  id: string
  name: string
  invite_code: string
  created_by: string
  description?: string
  members: FamilyMember[]
}

export default function FamilyPage() {
  const { user } = useAuth()
  const [family, setFamily] = useState<Family | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  // 가족 정보 불러오기
  const fetchFamily = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/family', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setFamily(data.family)
      } else if (response.status === 404) {
        // 가족이 없는 경우
        setFamily(null)
      } else {
        console.error('가족 정보 불러오기 실패')
      }
    } catch (error) {
      console.error('가족 정보 불러오기 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 가족 생성
  const createFamily = async () => {
    if (!familyName.trim()) {
      toast.error('가족 이름을 입력해주세요.')
      return
    }

    setIsCreating(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/family', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: familyName })
      })

      if (response.ok) {
        const data = await response.json()
        setFamily(data.family)
        setFamilyName('')
        toast.success('가족이 생성되었습니다!')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || '가족 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('가족 생성 오류:', error)
      toast.error('가족 생성에 실패했습니다.')
    } finally {
      setIsCreating(false)
    }
  }

  // 가족 참여
  const joinFamily = async () => {
    if (!inviteCode.trim()) {
      toast.error('초대 코드를 입력해주세요.')
      return
    }

    setIsJoining(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/family/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invite_code: inviteCode })
      })

      if (response.ok) {
        const data = await response.json()
        setFamily(data.family)
        setInviteCode('')
        toast.success('가족에 참여했습니다!')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || '가족 참여에 실패했습니다.')
      }
    } catch (error) {
      console.error('가족 참여 오류:', error)
      toast.error('가족 참여에 실패했습니다.')
    } finally {
      setIsJoining(false)
    }
  }

  // 초대 코드 복사
  const copyInviteCode = async () => {
    if (!family?.invite_code) return

    try {
      await navigator.clipboard.writeText(family.invite_code)
      setCopied(true)
      toast.success('초대 코드가 복사되었습니다!')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('복사에 실패했습니다.')
    }
  }

  // 이메일로 가족 구성원 초대
  const inviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('이메일을 입력해주세요.')
      return
    }

    setIsInviting(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/family/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      })

      if (response.ok) {
        toast.success('초대를 보냈습니다!')
        setInviteEmail('')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || '초대 보내기에 실패했습니다.')
      }
    } catch (error) {
      console.error('초대 보내기 오류:', error)
      toast.error('초대 보내기에 실패했습니다.')
    } finally {
      setIsInviting(false)
    }
  }

  useEffect(() => {
    fetchFamily()
  }, [user])

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-bl-3xl flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div className="relative">
            <h1 className="text-3xl font-semibold mb-2">👨‍👩‍👧‍👦 가족 챌린지</h1>
            <p className="text-blue-200">
              가족과 함께 독서 목표를 달성하고 순위를 경쟁해보세요!
            </p>
          </div>
        </div>

        {family ? (
          // 가족이 있는 경우
          <div className="space-y-6">
            {/* 가족 정보 */}
            <Card className="rounded-3xl shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-semibold text-gray-900">
                      {family.name}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {family.members.length}명의 가족 구성원
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyInviteCode}
                      className="rounded-2xl"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      초대 코드 복사
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <Label className="text-sm font-medium text-gray-700">초대 코드</Label>
                  <div className="mt-1 font-mono text-lg font-semibold text-blue-600">
                    {family.invite_code}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    이 코드를 가족에게 공유하여 초대하세요
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 가족 구성원 추가 */}
            <Card className="rounded-3xl shadow-md bg-gradient-to-r from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  👨‍👩‍👧‍👦 가족 구성원 추가하기
                </CardTitle>
                <CardDescription className="text-gray-600">
                  더 많은 가족 구성원을 초대하여 함께 독서해보세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl p-4">
                    <Label className="text-sm font-medium text-gray-700">초대 코드 공유</Label>
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="flex-1 font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg">
                        {family.invite_code}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyInviteCode}
                        className="rounded-lg"
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      가족에게 이 코드를 공유하세요
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-4">
                    <Label className="text-sm font-medium text-gray-700">직접 초대하기</Label>
                    <div className="mt-2 space-y-2">
                      <Input
                        placeholder="가족 구성원 이메일"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="rounded-lg text-sm"
                      />
                      <Button
                        onClick={inviteMember}
                        disabled={isInviting || !inviteEmail}
                        size="sm"
                        className="w-full rounded-lg"
                      >
                        {isInviting ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            <span>초대 중...</span>
                          </div>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3 mr-2" />
                            초대 보내기
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 가족 구성원 순위 */}
            <Card className="rounded-3xl shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  🏆 가족 순위
                </CardTitle>
                <CardDescription className="text-gray-600">
                  이번 달 독서 성과 순위
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {family.members
                    .sort((a, b) => b.total_xp - a.total_xp)
                    .map((member, index) => (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between p-4 rounded-2xl ${
                          index === 0
                            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200'
                            : index === 1
                            ? 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200'
                            : index === 2
                            ? 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200'
                            : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            {index === 0 && (
                              <Crown className="absolute -top-2 -right-2 h-4 w-4 text-yellow-500" />
                            )}
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {member.name}
                              {member.id === user?.id && (
                                <Badge variant="secondary" className="ml-2">
                                  나
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              {member.role === 'parent' ? '부모' : '자녀'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <Zap className="h-4 w-4 text-yellow-500" />
                              <span className="font-semibold">{member.total_xp} XP</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <BookOpen className="h-4 w-4 text-blue-500" />
                              <span>{member.books_read || 0}권</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Target className="h-4 w-4 text-green-500" />
                              <span>{member.current_streak}일</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* 가족 챌린지 (준비중) */}
            <Card className="rounded-3xl shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  🎯 가족 챌린지
                </CardTitle>
                <CardDescription className="text-gray-600">
                  곧 출시될 가족 챌린지 기능
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <div className="relative bg-gradient-to-r from-blue-400 to-indigo-400 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                      <Trophy className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    🚀 곧 출시됩니다!
                  </h3>
                  <p className="text-gray-500 mb-4">
                    가족과 함께하는 독서 챌린지 기능을 준비 중입니다.
                  </p>
                  <Button disabled className="rounded-2xl">
                    준비중
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // 가족이 없는 경우
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 가족 생성 */}
            <Card className="rounded-3xl shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  👨‍👩‍👧‍👦 새 가족 만들기
                </CardTitle>
                <CardDescription className="text-gray-600">
                  우리 가족만의 독서 공간을 만들어보세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="familyName">가족 이름</Label>
                  <Input
                    id="familyName"
                    placeholder="예: 김씨네 독서가족"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <Button
                  onClick={createFamily}
                  disabled={isCreating}
                  className="w-full rounded-2xl"
                >
                  {isCreating ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>생성 중...</span>
                    </div>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      가족 만들기
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 가족 참여 */}
            <Card className="rounded-3xl shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  🔗 가족 참여하기
                </CardTitle>
                <CardDescription className="text-gray-600">
                  초대 코드로 기존 가족에 참여하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="inviteCode">초대 코드</Label>
                  <Input
                    id="inviteCode"
                    placeholder="초대 코드를 입력하세요"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <Button
                  onClick={joinFamily}
                  disabled={isJoining}
                  variant="outline"
                  className="w-full rounded-2xl"
                >
                  {isJoining ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>참여 중...</span>
                    </div>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      가족 참여하기
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </MainLayout>
  )
}