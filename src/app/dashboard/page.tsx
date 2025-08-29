'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/providers'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FamilyInviteNotification } from '@/components/ui/family-invite-notification'
import { BookOpen, Trophy, Coins, Zap, Target, Users, TrendingUp, Clock, Crown, Star, Sparkles, Gamepad2 } from 'lucide-react'
import Link from 'next/link'

interface UserStats {
  total_books: number
  total_xp: number
  total_coins: number
  current_streak: number
  current_level: number
}

interface QuestStats {
  pending: number
  completed: number
  total: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [userStats, setUserStats] = useState<UserStats>({
    total_books: 0,
    total_xp: 0,
    total_coins: 0,
    current_streak: 0,
    current_level: 1
  })
  const [questStats, setQuestStats] = useState<QuestStats>({
    pending: 0,
    completed: 0,
    total: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  // 사용자 통계 데이터 불러오기
  const fetchUserStats = async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/users/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUserStats({
          total_books: data.total_books || 0,
          total_xp: data.total_xp || 0,
          total_coins: data.total_coins || 0,
          current_streak: data.current_streak || 0,
          current_level: Math.floor((data.total_xp || 0) / 100) + 1
        })
      }
    } catch (error) {
      console.error('사용자 통계 불러오기 오류:', error)
    }
  }

  // 퀘스트 통계 데이터 불러오기
  const fetchQuestStats = async () => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/quests/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setQuestStats({
          pending: data.pending || 0,
          completed: data.completed || 0,
          total: data.total || 0
        })
      }
    } catch (error) {
      console.error('퀘스트 통계 불러오기 오류:', error)
    }
  }

  // 데이터 로딩
  useEffect(() => {
    if (user) {
      Promise.all([
        fetchUserStats(),
        fetchQuestStats()
      ]).finally(() => {
        setIsLoading(false)
      })
    } else {
      setIsLoading(false)
    }
  }, [user])

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <Gamepad2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600">대시보드를 보려면 로그인해주세요.</p>
        </div>
      </MainLayout>
    )
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          {/* 로딩 상태 */}
          <div className="text-center py-12">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-400 to-purple-500 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center animate-spin">
                <Gamepad2 className="h-12 w-12 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">🎮 대시보드 로딩 중...</h3>
            <p className="text-gray-500">잠시만 기다려주세요!</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 가족 초대 알림 */}
        <FamilyInviteNotification />
        
        {/* 환영 메시지 */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-3xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-bl-3xl flex items-center justify-center">
            <Gamepad2 className="h-8 w-8 text-white" />
          </div>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="relative bg-gradient-to-r from-blue-400 to-indigo-400 p-4 rounded-2xl shadow-lg">
                <Gamepad2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-semibold text-white">🎮 모험가 대시보드</CardTitle>
                <CardDescription className="text-blue-200">
                  오늘도 새로운 퀘스트와 함께 독서 모험을 떠나볼까요?
                </CardDescription>
              </div>
            </div>
            <div className="mt-4 flex items-center space-x-4 text-sm">
              <span className="text-blue-200 font-medium">레벨 {userStats.current_level}</span> •
              <span className="text-indigo-200 font-medium">{userStats.total_xp.toLocaleString()} XP</span> •
              <span className="text-purple-200 font-medium">{userStats.total_coins.toLocaleString()} 코인</span>
            </div>
          </CardHeader>
        </Card>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-bl-3xl flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">📚 총 읽은 책</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-blue-600 mb-1">{userStats.total_books}권</div>
              <p className="text-xs text-blue-600 font-medium">
                {userStats.total_books === 0 ? '첫 번째 책을 등록해보세요!' : '독서 여정이 계속되고 있어요!'}
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-yellow-50 to-orange-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-bl-3xl flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">⚡ 획득 XP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-orange-600 mb-1">{userStats.total_xp.toLocaleString()} XP</div>
              <p className="text-xs text-orange-600 font-medium">
                {userStats.total_xp === 0 ? '퀘스트를 완료하여 XP를 획득하세요!' : `레벨 ${userStats.current_level + 1}까지 ${((userStats.current_level + 1) * 100 - userStats.total_xp).toLocaleString()} XP 남았어요!`}
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-emerald-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-bl-3xl flex items-center justify-center">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">💰 보유 코인</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-green-600 mb-1">{userStats.total_coins.toLocaleString()}개</div>
              <p className="text-xs text-green-600 font-medium">
                {userStats.total_coins === 0 ? '코인으로 아바타를 꾸며보세요!' : '풍부한 코인으로 더 많은 것을 구매해보세요!'}
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-pink-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-bl-3xl flex items-center justify-center">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">🔥 연속 독서</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-purple-600 mb-1">{userStats.current_streak}일</div>
              <p className="text-xs text-purple-600 font-medium">
                {userStats.current_streak === 0 ? '매일 독서하여 연속 기록을 늘려보세요!' : `${userStats.current_streak}일 연속 독서 중! 대단해요! 🔥`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 주요 기능 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/books">
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white rounded-3xl shadow-md cursor-pointer">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600 rounded-bl-3xl flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-blue-600 rounded-2xl shadow-md">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">📚 책 등록하기</CardTitle>
                    <div className="text-sm text-blue-600 font-semibold">+50 XP 보너스</div>
                  </div>
                </div>
                <CardDescription className="text-gray-700 leading-relaxed">
                  새로운 책을 등록하고 독서 여정을 시작하세요. 첫 등록 시 보너스 XP 획득!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-2xl shadow-md hover:shadow-lg transform group-hover:scale-105 transition-all duration-300">
                  🚀 모험 시작하기
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link href="/quests">
            <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white rounded-3xl shadow-md cursor-pointer">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-600 rounded-bl-3xl flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-3 bg-green-600 rounded-2xl shadow-md">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-semibold text-gray-900">⚔️ 오늘의 퀘스트</CardTitle>
                    <div className="text-sm text-green-600 font-semibold">
                      {questStats.pending === 0 ? '새 퀘스트 생성하기' : `${questStats.pending}개 대기중`}
                    </div>
                  </div>
                </div>
                <CardDescription className="text-gray-700 leading-relaxed">
                  일일 퀘스트를 완료하고 보상을 받아보세요. 연속 완료 시 보너스 배율 적용!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium rounded-2xl shadow-md hover:shadow-lg transform group-hover:scale-105 transition-all duration-300">
                  ⚡ 퀘스트 도전하기
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white rounded-3xl shadow-md cursor-pointer">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-600 rounded-bl-3xl flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-purple-600 rounded-2xl shadow-md">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">👨‍👩‍👧‍👦 가족 챌린지</CardTitle>
                  <div className="text-sm text-purple-600 font-semibold">곧 출시!</div>
                </div>
              </div>
              <CardDescription className="text-gray-700 leading-relaxed">
                가족과 함께 독서 챌린지에 참여해보세요. 협력과 경쟁의 재미를 동시에!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-2xl shadow-md hover:shadow-lg transform group-hover:scale-105 transition-all duration-300" disabled>
                🔜 준비중
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 최근 활동 */}
        <Card className="relative overflow-hidden border-0 bg-white rounded-3xl shadow-md">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-600 rounded-bl-3xl flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold text-gray-900">📊 최근 활동</CardTitle>
                <CardDescription className="text-gray-600">
                  최근 독서 활동과 성과를 확인해보세요
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              {/* Empty state with game-like design */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-blue-400 to-purple-500 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">🎮 모험이 시작되기를 기다리고 있어요!</h3>
              <p className="text-gray-500 mb-4">아직 독서 활동이 없습니다.</p>
              <p className="text-sm text-gray-400 mb-6">첫 번째 책을 등록하고 독서 모험을 시작해보세요!</p>
              
              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/books">
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white font-medium px-6 py-3 rounded-2xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                    📚 첫 책 등록하기
                  </Button>
                </Link>
                <Link href="/reading">
                  <Button className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded-2xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                    ⏱️ 독서 세션 시작
                  </Button>
                </Link>
                <Link href="/quests">
                  <Button variant="outline" className="border-2 border-purple-300 text-purple-600 hover:bg-purple-50 font-medium px-6 py-3 rounded-2xl transition-all duration-300">
                    ⚔️ 퀘스트 보기
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}