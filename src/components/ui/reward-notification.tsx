'use client'

import { useState, useEffect } from 'react'
import { 
  Zap, 
  Coins, 
  Trophy, 
  Crown, 
  Star, 
  X,
  Sparkles
} from 'lucide-react'
import { Button } from './button'
import { Badge } from './badge'

export interface RewardData {
  xp: number
  coins: number
  badges?: string[]
  leveledUp?: boolean
  newLevel?: number
}

interface RewardNotificationProps {
  reward: RewardData | null
  onClose: () => void
  autoClose?: boolean
  duration?: number
}

export function RewardNotification({ 
  reward, 
  onClose, 
  autoClose = true, 
  duration = 5000 
}: RewardNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (reward) {
      setIsVisible(true)
      
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose()
        }, duration)
        
        return () => clearTimeout(timer)
      }
    }
  }, [reward, autoClose, duration])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // 애니메이션 완료 후 onClose 호출
  }

  if (!reward) return null

  return (
    <>
      {isVisible && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-sm transition-all duration-500 transform ${
            isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4'
          }`}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* 헤더 */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-bl-3xl flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="text-3xl">🎉</div>
                    <h3 className="text-xl font-semibold text-white">
                      {reward.leveledUp ? '레벨업!' : '보상 획득!'}
                    </h3>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-white hover:bg-white/20 rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {reward.leveledUp && (
                  <div className="mt-2 flex items-center space-x-2 animate-pulse">
                    <Crown className="h-5 w-5 text-yellow-300" />
                    <span className="text-lg font-bold text-yellow-300">
                      레벨 {reward.newLevel} 달성!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 보상 내용 */}
            <div className="p-6 space-y-4">
              {/* XP와 코인 */}
              <div className="flex items-center justify-center space-x-6">
                {reward.xp > 0 && (
                  <div className="flex items-center space-x-2 bg-yellow-50 px-4 py-2 rounded-2xl transform hover:scale-105 transition-transform">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <span className="font-bold text-yellow-700">+{reward.xp} XP</span>
                  </div>
                )}
                
                {reward.coins > 0 && (
                  <div className="flex items-center space-x-2 bg-amber-50 px-4 py-2 rounded-2xl transform hover:scale-105 transition-transform">
                    <Coins className="h-5 w-5 text-amber-500" />
                    <span className="font-bold text-amber-700">+{reward.coins} 코인</span>
                  </div>
                )}
              </div>

              {/* 배지 */}
              {reward.badges && reward.badges.length > 0 && (
                <div className="space-y-2 animate-fade-in">
                  <div className="flex items-center justify-center space-x-1 text-sm text-gray-600">
                    <Trophy className="h-4 w-4" />
                    <span>새로운 배지 획득!</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center">
                    {reward.badges.map((badge, index) => (
                      <div
                        key={badge}
                        className="transform hover:scale-110 transition-transform"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <Badge 
                          variant="secondary" 
                          className="bg-purple-100 text-purple-700 border-purple-200 animate-bounce"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          {badge}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 레벨업 특별 메시지 */}
              {reward.leveledUp && (
                <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 animate-pulse">
                  <div className="text-2xl mb-2">🎊</div>
                  <p className="text-blue-700 font-medium">
                    축하합니다! 새로운 기능이 해제되었습니다.
                  </p>
                  <p className="text-blue-600 text-sm mt-1">
                    레벨 {reward.newLevel}의 특별 혜택을 확인해보세요!
                  </p>
                </div>
              )}
            </div>

            {/* 진행률 바 (자동 닫기용) */}
            {autoClose && (
              <div className="h-1 bg-gray-100">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all ease-linear"
                  style={{
                    width: isVisible ? '0%' : '100%',
                    transitionDuration: `${duration}ms`
                  }}
                />
              </div>
            )}
          </div>
        </div>
       )}
     </>
  )
}

// 보상 알림 훅
export function useRewardNotification() {
  const [currentReward, setCurrentReward] = useState<RewardData | null>(null)
  const [rewardQueue, setRewardQueue] = useState<RewardData[]>([])

  const showReward = (reward: RewardData) => {
    if (currentReward) {
      // 현재 알림이 표시 중이면 큐에 추가
      setRewardQueue(prev => [...prev, reward])
    } else {
      // 즉시 표시
      setCurrentReward(reward)
    }
  }

  const closeReward = () => {
    setCurrentReward(null)
    
    // 큐에 대기 중인 보상이 있으면 다음 보상 표시
    if (rewardQueue.length > 0) {
      const nextReward = rewardQueue[0]
      setRewardQueue(prev => prev.slice(1))
      setTimeout(() => {
        setCurrentReward(nextReward)
      }, 500) // 잠시 대기 후 다음 알림 표시
    }
  }

  return {
    currentReward,
    showReward,
    closeReward,
    hasQueuedRewards: rewardQueue.length > 0
  }
}