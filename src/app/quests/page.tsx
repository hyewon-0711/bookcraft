'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Target, 
  Trophy, 
  Coins, 
  Clock, 
  CheckCircle,
  Circle,
  Star,
  Zap,
  BookOpen,
  Timer,
  Award,
  Crown,
  Sparkles,
  Gamepad2,
  Sword,
  Shield,
  Play,
  Pause,
  RotateCcw,
  Gift,
  Lock,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '@/lib/providers'
import { QuestManager } from '@/lib/quest-manager'
import { QuestStatus, QuestType, Quest } from '@/types'

// Quest 인터페이스는 types/index.ts에서 import

interface UserStats {
  total_xp: number
  total_coins: number
  level: number
  current_streak: number
  quests_completed_today: number
}

export default function QuestsPage() {
  const { user } = useAuth()
  const [quests, setQuests] = useState<Quest[]>([])
  const [filteredQuests, setFilteredQuests] = useState<Quest[]>([])
  const [statusFilter, setStatusFilter] = useState<QuestStatus[]>(['pending', 'active', 'paused'])
  const [sortBy, setSortBy] = useState<'priority' | 'expiry' | 'progress' | 'created'>('priority')
  const [userStats, setUserStats] = useState<UserStats>({
    total_xp: 0,
    total_coins: 0,
    level: 1,
    current_streak: 0,
    quests_completed_today: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  // 퀘스트 목록 불러오기
  const fetchQuests = async () => {
    if (!user) {
      console.log('사용자가 로그인되지 않음')
      setIsLoading(false)
      return
    }
    
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.error('인증 토큰이 없습니다.')
        setIsLoading(false)
        return
      }
      
      console.log('퀘스트 목록 요청 시작...')
      const response = await fetch('/api/quests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('응답 상태:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('퀘스트 데이터 수신:', data)
        const questsData = data.quests || []
        setQuests(questsData)
        setFilteredQuests(questsData)
        setUserStats(data.userStats || {
          total_xp: 0,
          total_coins: 0,
          level: 1,
          current_streak: 0,
          quests_completed_today: 0
        })
      } else {
        const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류' }))
        console.error('퀘스트 목록 불러오기 실패:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
      }
    } catch (error) {
      console.error('퀘스트 목록 불러오기 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 일일 퀘스트 생성
  const generateDailyQuests = async () => {
    if (!user) return
    
    setIsGenerating(true)
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/api/quests/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        await fetchQuests() // 퀘스트 목록 새로고침
        
        // 성공 메시지 개선
        const questCount = data.quests?.length || 0
        alert(`🎉 ${questCount}개의 새로운 퀘스트가 생성되었습니다!\n\n` +
              `✨ 개인화된 퀘스트로 오늘도 독서 모험을 시작해보세요!\n` +
              `🏆 퀘스트 완료 시 XP와 코인을 획득할 수 있어요!`)
      } else {
        const error = await response.json()
        alert(`❌ ${error.error || '퀘스트 생성에 실패했습니다.'}\n\n` +
              `💡 잠시 후 다시 시도해주세요.`)
      }
    } catch (error) {
      console.error('퀘스트 생성 오류:', error)
      alert('퀘스트 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  // 퀘스트 액션 정보 가져오기
  const getQuestActionInfo = (quest: Quest) => {
    return QuestManager.getQuestAction(quest.status, quest.progress, quest.target_value)
  }

  // 퀘스트 액션 처리
  const handleQuestAction = async (quest: Quest) => {
    if (!user) return
    
    const actionInfo = getQuestActionInfo(quest)
    
    try {
      const token = localStorage.getItem('auth_token')
      
      switch (actionInfo.action) {
        case 'start':
          await transitionQuestStatus(quest.id, 'active', '사용자가 퀘스트를 시작했습니다.')
          break
        case 'continue':
          // 퀘스트 상세 페이지로 이동하거나 진행 로직 실행
          alert('퀘스트를 계속 진행하세요!')
          break
        case 'complete':
          await completeQuest(quest.id)
          break
        case 'resume':
          await transitionQuestStatus(quest.id, 'active', '사용자가 퀘스트를 재개했습니다.')
          break
        case 'claim':
          await transitionQuestStatus(quest.id, 'completed', '보상을 수령했습니다.')
          break
        case 'retry':
          await transitionQuestStatus(quest.id, 'pending', '퀘스트를 재시도합니다.')
          break
        default:
          break
      }
    } catch (error) {
      console.error('퀘스트 액션 처리 오류:', error)
      alert('퀘스트 액션 처리 중 오류가 발생했습니다.')
    }
  }

  // 퀘스트 상태 전환
  const transitionQuestStatus = async (questId: string, newStatus: QuestStatus, reason?: string) => {
    const token = localStorage.getItem('auth_token')
    const response = await fetch(`/api/quests/${questId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        new_status: newStatus,
        reason
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      await fetchQuests() // 퀘스트 목록 새로고침
      
      if (data.rewards) {
        alert(`🎉 ${data.message}\n+${data.rewards.xp} XP, +${data.rewards.coins} 코인을 획득했습니다!`)
      } else {
        alert(data.message)
      }
    } else {
      const error = await response.json()
      throw new Error(error.error || '상태 전환에 실패했습니다.')
    }
  }

  // 퀘스트 완료
  const completeQuest = async (questId: string) => {
    if (!user) return
    
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/api/quests/${questId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        await fetchQuests() // 퀘스트 목록 새로고침
        alert(`퀘스트 완료! +${data.xp_reward} XP, +${data.coin_reward} 코인을 획득했습니다!`)
      } else {
        const error = await response.json()
        alert(error.message || '퀘스트 완료 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('퀘스트 완료 오류:', error)
      alert('퀘스트 완료 처리 중 오류가 발생했습니다.')
    }
  }

  // 컴포넌트 마운트 시 퀘스트 목록 불러오기
  useEffect(() => {
    if (user) {
      fetchQuests()
    } else {
      setIsLoading(false)
    }
  }, [user])

  // 퀘스트 타입별 아이콘
  const getQuestIcon = (type: string) => {
    switch (type) {
      case 'timer':
        return <Timer className="h-5 w-5" />
      case 'summary':
        return <BookOpen className="h-5 w-5" />
      case 'challenge':
        return <Trophy className="h-5 w-5" />
      case 'reading':
        return <Target className="h-5 w-5" />
      default:
        return <Circle className="h-5 w-5" />
    }
  }

  // 퀘스트 타입별 색상
  const getQuestColor = (type: string) => {
    switch (type) {
      case 'timer':
        return 'bg-blue-100 text-blue-800'
      case 'summary':
        return 'bg-green-100 text-green-800'
      case 'challenge':
        return 'bg-purple-100 text-purple-800'
      case 'reading':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 난이도별 별 표시
  const getDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${
          i < difficulty ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`} 
      />
    ))
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <Target className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-gray-600">퀘스트를 확인하려면 로그인해주세요.</p>
        </div>
      </MainLayout>
    )
  }

  const todayQuests = quests.filter(quest => {
    const today = new Date().toDateString()
    const questDate = new Date(quest.created_at).toDateString()
    return today === questDate
  })

  // 퀘스트를 상태별로 분류
  const activeQuests = quests.filter(quest => ['pending', 'active', 'paused'].includes(quest.status))
  const completedQuests = quests.filter(quest => ['completed', 'ready_to_claim'].includes(quest.status))
  const expiredQuests = quests.filter(quest => ['failed', 'expired'].includes(quest.status))
  const lockedQuests = quests.filter(quest => quest.status === 'locked')

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 rounded-3xl p-8">
          {/* Animated background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400 rounded-full opacity-10 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-400 rounded-full opacity-10 animate-bounce"></div>
          
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-full">
                  <Sword className="h-12 w-12 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
                  ⚔️ 일일 퀘스트
                </h1>
                <p className="text-gray-200 text-lg">
                  모험가여, 오늘의 도전을 완료하고 강해지세요!
                </p>
                <div className="mt-3 flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1 text-yellow-300">
                    <Trophy className="h-4 w-4" />
                    <span>완료: {completedQuests.length}/{todayQuests.length}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-green-300">
                    <Zap className="h-4 w-4" />
                    <span>레벨 {userStats.level}</span>
                  </div>
                </div>
              </div>
            </div>
            <Button 
              onClick={generateDailyQuests} 
              disabled={isGenerating}
              className="bg-white text-orange-600 hover:bg-gray-100 font-bold py-3 px-6 rounded-full shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <Sparkles className="h-5 w-5" />
              {isGenerating ? '🔄 생성 중...' : '✨ 새 퀘스트 생성'}
            </Button>
          </div>
        </div>

        {/* 사용자 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-bl-3xl flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">👑 레벨</p>
                  <p className="text-3xl font-black text-blue-600">{userStats.level}</p>
                </div>
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                  <Award className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-emerald-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-bl-3xl flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">⚡ 총 XP</p>
                  <p className="text-3xl font-black text-green-600">{userStats.total_xp}</p>
                </div>
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-yellow-50 to-orange-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-bl-3xl flex items-center justify-center">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">💰 총 코인</p>
                  <p className="text-3xl font-black text-yellow-600">{userStats.total_coins}</p>
                </div>
                <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                  <Coins className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-pink-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-bl-3xl flex items-center justify-center">
              <Target className="h-6 w-6 text-white" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">🔥 연속 일수</p>
                  <p className="text-3xl font-black text-purple-600">{userStats.current_streak}</p>
                </div>
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 오늘의 진행률 */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-indigo-50 to-purple-100">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-bl-3xl flex items-center justify-center">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">📊 오늘의 진행률</CardTitle>
                <p className="text-gray-600">모험가의 오늘 성과를 확인해보세요</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-lg font-semibold">
                <span className="text-gray-700">완료된 퀘스트</span>
                <span className="text-purple-600">{completedQuests.length} / {todayQuests.length}</span>
              </div>
              <Progress 
                value={todayQuests.length > 0 ? (completedQuests.length / todayQuests.length) * 100 : 0} 
                className="h-4 bg-gray-200"
              />
              <div className="text-center text-sm text-gray-600">
                {todayQuests.length > 0 ? 
                  `${Math.round((completedQuests.length / todayQuests.length) * 100)}% 완료` : 
                  '퀘스트를 생성해주세요'
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 활성 퀘스트 */}
        <div>
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg">
              <Sword className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">⚔️ 활성 퀘스트 ({activeQuests.length}개)</h2>
          </div>
          
          {activeQuests.length === 0 ? (
            <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-50 to-orange-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400 to-orange-500 rounded-bl-3xl opacity-10"></div>
              <CardContent className="text-center py-16">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-red-400 to-orange-500 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                    <Target className="h-12 w-12 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-3">
                  🎯 새로운 도전이 기다려요!
                </h3>
                <p className="text-gray-600 mb-6 text-lg">
                  활성 퀘스트가 없습니다.<br />
                  오늘의 퀘스트를 생성해서 독서 모험을 시작해보세요!
                </p>
                <Button 
                  onClick={generateDailyQuests} 
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-3 px-8 rounded-full shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {isGenerating ? '🔄 생성 중...' : '⚡ 퀘스트 생성하기'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeQuests.map((quest) => {
                const actionInfo = getQuestActionInfo(quest)
                const statusStyles = QuestManager.getStatusStyles(quest.status)
                const statusIcon = QuestManager.getStatusIcon(quest.status)
                const isExpiringSoon = quest.expires_at ? QuestManager.isExpiringSoon(quest.expires_at) : false
                const expiryRisk = quest.expires_at ? QuestManager.getExpiryRiskLevel(quest.expires_at) : 'safe'
                
                return (
                <Card key={quest.id} className={`group relative overflow-hidden border-2 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${statusStyles} ${isExpiringSoon ? 'animate-pulse' : ''}`}>
                  <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-3xl flex items-center justify-center ${
                    expiryRisk === 'critical' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                    expiryRisk === 'warning' ? 'bg-gradient-to-br from-orange-400 to-orange-500' :
                    'bg-gradient-to-br from-blue-400 to-indigo-500'
                  }`}>
                    <span className="text-white text-lg">{statusIcon}</span>
                  </div>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg shadow-lg ${
                          quest.status === 'active' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                          quest.status === 'pending' ? 'bg-gradient-to-r from-gray-500 to-gray-600' :
                          quest.status === 'paused' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                          'bg-gradient-to-r from-purple-500 to-purple-600'
                        }`}>
                          {getQuestIcon(quest.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{quest.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={`border-0 text-xs font-semibold ${
                              quest.status === 'active' ? 'bg-blue-100 text-blue-700' :
                              quest.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                              quest.status === 'paused' ? 'bg-orange-100 text-orange-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {quest.type}
                            </Badge>
                            <Badge className={`border-0 text-xs font-semibold ${
                              quest.status === 'active' ? 'bg-green-100 text-green-700' :
                              quest.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              quest.status === 'paused' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {quest.status === 'active' ? '진행중' :
                               quest.status === 'pending' ? '대기중' :
                               quest.status === 'paused' ? '일시정지' : quest.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-gray-700 leading-relaxed mt-2">{quest.description}</CardDescription>
                    
                    {/* 유효기간 표시 */}
                    {quest.expires_at && (
                      <div className={`mt-3 p-2 rounded-lg text-sm font-medium ${
                        expiryRisk === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' :
                        expiryRisk === 'warning' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                        'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{QuestManager.formatTimeRemaining(quest.expires_at)}</span>
                          {expiryRisk === 'critical' && <AlertTriangle className="h-4 w-4 animate-pulse" />}
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 난이도 */}
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                      <span className="text-sm font-semibold text-gray-700">🌟 난이도:</span>
                      <div className="flex gap-1">
                        {getDifficultyStars(quest.difficulty)}
                      </div>
                    </div>
                    
                    {/* 진행률 */}
                    <div className="space-y-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="text-gray-700">📈 진행률</span>
                        <span className="text-indigo-600">{quest.progress} / {quest.target_value}</span>
                      </div>
                      <Progress 
                        value={QuestManager.calculateProgress(quest.progress, quest.target_value)} 
                        className="h-3 bg-gray-200"
                      />
                      <div className="text-center text-xs text-gray-600">
                        {QuestManager.calculateProgress(quest.progress, quest.target_value)}% 완료
                      </div>
                    </div>
                    
                    {/* 보상 */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2 text-sm font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                          <Zap className="h-4 w-4" />
                          +{quest.xp_reward} XP
                        </span>
                        <span className="flex items-center gap-2 text-sm font-bold text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full">
                          <Coins className="h-4 w-4" />
                          +{quest.coin_reward}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleQuestAction(quest)}
                        disabled={getQuestActionInfo(quest).disabled}
                        className={`font-bold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 ${
                          getQuestActionInfo(quest).variant === 'success'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white' 
                            : getQuestActionInfo(quest).variant === 'gold'
                            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
                            : getQuestActionInfo(quest).disabled
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white'
                        }`}
                      >
                        {getQuestActionInfo(quest).text}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* 완료된 퀘스트 */}
        {completedQuests.length > 0 && (
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">🏆 완료된 퀘스트 ({completedQuests.length}개)</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {completedQuests.map((quest) => (
                <Card key={quest.id} className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-emerald-100 opacity-90 hover:opacity-100 transition-opacity">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-bl-3xl flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-lg">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-700 line-through">{quest.title}</CardTitle>
                          <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-0 text-xs font-semibold mt-1">
                            ✅ 완료
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-gray-600 mt-2">{quest.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2 text-sm font-bold text-green-600 bg-green-200 px-3 py-1 rounded-full">
                          <Zap className="h-4 w-4" />
                          +{quest.xp_reward} XP
                        </span>
                        <span className="flex items-center gap-2 text-sm font-bold text-yellow-600 bg-yellow-200 px-3 py-1 rounded-full">
                          <Coins className="h-4 w-4" />
                          +{quest.coin_reward}
                        </span>
                      </div>
                      {quest.completed_at && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {new Date(quest.completed_at).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}