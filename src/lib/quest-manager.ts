import { QuestStatus, QuestType, Quest, QuestStatusTransition, QuestRenewalPattern } from '@/types'

/**
 * 퀘스트 상태 관리 유틸리티 클래스
 */
export class QuestManager {
  /**
   * 유효한 상태 전환인지 확인
   */
  static isValidTransition(fromStatus: QuestStatus, toStatus: QuestStatus): boolean {
    const validTransitions: Record<QuestStatus, QuestStatus[]> = {
      pending: ['active', 'locked'],
      active: ['paused', 'completed', 'failed'],
      paused: ['active', 'failed'],
      completed: ['ready_to_claim'],
      ready_to_claim: ['completed'],
      failed: ['pending'],
      expired: ['pending'],
      locked: ['pending'],
      legendary: ['completed'],
      streak: ['active', 'completed']
    }

    return validTransitions[fromStatus]?.includes(toStatus) || false
  }

  /**
   * 상태에 따른 액션 버튼 정보 반환
   */
  static getQuestAction(status: QuestStatus, progress: number, target: number) {
    const isCompleted = progress >= target
    
    switch (status) {
      case 'pending':
        return { text: '🚀 시작하기', action: 'start', disabled: false, variant: 'default' as const }
      case 'active':
        if (isCompleted) {
          return { text: '🎉 완료하기', action: 'complete', disabled: false, variant: 'success' as const }
        }
        return { text: '📈 계속하기', action: 'continue', disabled: false, variant: 'default' as const }
      case 'paused':
        return { text: '▶️ 재개하기', action: 'resume', disabled: false, variant: 'default' as const }
      case 'completed':
        return { text: '✅ 완료됨', action: 'view', disabled: true, variant: 'success' as const }
      case 'ready_to_claim':
        return { text: '🎁 보상받기', action: 'claim', disabled: false, variant: 'gold' as const }
      case 'failed':
        return { text: '🔄 재시도', action: 'retry', disabled: false, variant: 'destructive' as const }
      case 'expired':
        return { text: '⏰ 만료됨', action: 'none', disabled: true, variant: 'secondary' as const }
      case 'locked':
        return { text: '🔒 잠김', action: 'none', disabled: true, variant: 'secondary' as const }
      case 'legendary':
        return { text: '👑 전설', action: 'view', disabled: true, variant: 'gold' as const }
      case 'streak':
        return { text: '🔥 연속', action: 'continue', disabled: false, variant: 'default' as const }
      default:
        return { text: '❓ 알 수 없음', action: 'none', disabled: true, variant: 'secondary' as const }
    }
  }

  /**
   * 상태에 따른 CSS 클래스 반환
   */
  static getStatusStyles(status: QuestStatus) {
    const baseClasses = 'transition-all duration-300'
    
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-gray-100 border-gray-300 text-gray-700`
      case 'active':
        return `${baseClasses} bg-blue-100 border-blue-400 text-blue-700`
      case 'paused':
        return `${baseClasses} bg-orange-100 border-orange-400 text-orange-700`
      case 'completed':
        return `${baseClasses} bg-green-100 border-green-400 text-green-700`
      case 'ready_to_claim':
        return `${baseClasses} bg-yellow-100 border-yellow-400 text-yellow-700 animate-pulse`
      case 'failed':
        return `${baseClasses} bg-red-100 border-red-400 text-red-700`
      case 'expired':
        return `${baseClasses} bg-gray-200 border-gray-400 text-gray-500 opacity-60`
      case 'locked':
        return `${baseClasses} bg-purple-100 border-purple-400 text-purple-700`
      case 'legendary':
        return `${baseClasses} bg-gradient-to-r from-yellow-200 to-orange-200 border-yellow-500 text-yellow-800`
      case 'streak':
        return `${baseClasses} bg-gradient-to-r from-orange-200 to-red-200 border-orange-500 text-orange-800`
      default:
        return `${baseClasses} bg-gray-100 border-gray-300 text-gray-700`
    }
  }

  /**
   * 상태에 따른 아이콘 반환
   */
  static getStatusIcon(status: QuestStatus): string {
    switch (status) {
      case 'pending': return '⏸️'
      case 'active': return '▶️'
      case 'paused': return '⏸️'
      case 'completed': return '✅'
      case 'ready_to_claim': return '🎁'
      case 'failed': return '❌'
      case 'expired': return '⏰'
      case 'locked': return '🔒'
      case 'legendary': return '👑'
      case 'streak': return '🔥'
      default: return '❓'
    }
  }

  /**
   * 퀘스트 만료 시간 계산
   */
  static calculateExpiryTime(questType: QuestType, userTimezone: string = 'Asia/Seoul'): Date {
    const now = new Date()
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }))
    
    switch (questType) {
      case 'daily':
        // 다음날 자정
        const tomorrow = new Date(userTime)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        return tomorrow
        
      case 'weekly':
        // 다음 일요일 자정
        const nextSunday = new Date(userTime)
        const daysUntilSunday = (7 - nextSunday.getDay()) % 7 || 7
        nextSunday.setDate(nextSunday.getDate() + daysUntilSunday)
        nextSunday.setHours(0, 0, 0, 0)
        return nextSunday
        
      case 'monthly':
        // 다음달 1일 자정
        const nextMonth = new Date(userTime)
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1)
        nextMonth.setHours(0, 0, 0, 0)
        return nextMonth
        
      case 'event':
        // 이벤트별로 다르므로 기본 7일
        const eventEnd = new Date(userTime)
        eventEnd.setDate(eventEnd.getDate() + 7)
        return eventEnd
        
      case 'adaptive':
        // 사용자 패턴 기반 (기본 3일)
        const adaptiveEnd = new Date(userTime)
        adaptiveEnd.setDate(adaptiveEnd.getDate() + 3)
        return adaptiveEnd
        
      case 'streak':
        // 연속 퀘스트는 다음날 자정
        const streakEnd = new Date(userTime)
        streakEnd.setDate(streakEnd.getDate() + 1)
        streakEnd.setHours(0, 0, 0, 0)
        return streakEnd
        
      default:
        // 기본 24시간
        const defaultEnd = new Date(userTime)
        defaultEnd.setHours(defaultEnd.getHours() + 24)
        return defaultEnd
    }
  }

  /**
   * 남은 시간 포맷팅
   */
  static formatTimeRemaining(expiresAt: string): string {
    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const difference = expiry - now

    if (difference <= 0) {
      return '만료됨'
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) {
      return `${days}일 ${hours}시간 남음`
    } else if (hours > 0) {
      return `${hours}시간 ${minutes}분 남음`
    } else {
      return `${minutes}분 남음`
    }
  }

  /**
   * 만료 임박 여부 확인
   */
  static isExpiringSoon(expiresAt: string, thresholdHours: number = 24): boolean {
    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const difference = expiry - now
    const thresholdMs = thresholdHours * 60 * 60 * 1000

    return difference > 0 && difference <= thresholdMs
  }

  /**
   * 만료 위험도 레벨 반환
   */
  static getExpiryRiskLevel(expiresAt: string): 'safe' | 'warning' | 'critical' | 'expired' {
    const now = new Date().getTime()
    const expiry = new Date(expiresAt).getTime()
    const difference = expiry - now

    if (difference <= 0) return 'expired'
    if (difference <= 60 * 60 * 1000) return 'critical' // 1시간 이내
    if (difference <= 6 * 60 * 60 * 1000) return 'warning' // 6시간 이내
    return 'safe'
  }

  /**
   * 퀘스트 진행률 계산
   */
  static calculateProgress(current: number, target: number): number {
    if (target === 0) return 0
    return Math.min(Math.round((current / target) * 100), 100)
  }

  /**
   * 퀘스트 완료 여부 확인
   */
  static isQuestCompleted(current: number, target: number): boolean {
    return current >= target
  }

  /**
   * 보상 배율 계산 (연속 완료, 조기 완료 등)
   */
  static calculateRewardMultiplier(
    quest: Quest,
    completionTime?: Date,
    streakCount: number = 0
  ): number {
    let multiplier = 1.0

    // 연속 완료 보너스
    if (streakCount > 0) {
      multiplier += Math.min(streakCount * 0.1, 1.0) // 최대 100% 보너스
    }

    // 조기 완료 보너스
    if (completionTime && quest.expires_at) {
      const totalTime = new Date(quest.expires_at).getTime() - new Date(quest.created_at).getTime()
      const usedTime = completionTime.getTime() - new Date(quest.created_at).getTime()
      const timeRatio = usedTime / totalTime

      if (timeRatio <= 0.5) {
        multiplier += 0.5 // 50% 이내 완료 시 50% 보너스
      } else if (timeRatio <= 0.75) {
        multiplier += 0.25 // 75% 이내 완료 시 25% 보너스
      }
    }

    // 난이도 보너스
    if (quest.difficulty >= 4) {
      multiplier += 0.2 // 고난이도 퀘스트 20% 보너스
    }

    return Math.round(multiplier * 100) / 100 // 소수점 2자리까지
  }

  /**
   * 갱신 패턴에 따른 다음 갱신 시간 계산
   */
  static getNextRenewalTime(pattern: QuestRenewalPattern, timezone: string = 'Asia/Seoul'): Date {
    const now = new Date()
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const [hours, minutes] = pattern.time.split(':').map(Number)

    switch (pattern.interval) {
      case 'daily':
        const nextDay = new Date(userTime)
        nextDay.setDate(nextDay.getDate() + 1)
        nextDay.setHours(hours, minutes, 0, 0)
        return nextDay

      case 'weekly':
        const nextWeek = new Date(userTime)
        const targetDay = pattern.dayOfWeek || 1 // 기본 월요일
        const daysUntilTarget = (targetDay - nextWeek.getDay() + 7) % 7 || 7
        nextWeek.setDate(nextWeek.getDate() + daysUntilTarget)
        nextWeek.setHours(hours, minutes, 0, 0)
        return nextWeek

      case 'monthly':
        const nextMonth = new Date(userTime)
        const targetDate = pattern.dayOfMonth || 1
        nextMonth.setMonth(nextMonth.getMonth() + 1, targetDate)
        nextMonth.setHours(hours, minutes, 0, 0)
        return nextMonth

      default:
        return this.calculateExpiryTime('daily', timezone)
    }
  }

  /**
   * 퀘스트 필터링
   */
  static filterQuests(quests: Quest[], filters: {
    status?: QuestStatus[]
    questType?: QuestType[]
    difficulty?: number[]
    expiringWithin?: number // hours
  }): Quest[] {
    return quests.filter(quest => {
      // 상태 필터
      if (filters.status && !filters.status.includes(quest.status)) {
        return false
      }

      // 퀘스트 타입 필터
      if (filters.questType && !filters.questType.includes(quest.quest_type)) {
        return false
      }

      // 난이도 필터
      if (filters.difficulty && !filters.difficulty.includes(quest.difficulty)) {
        return false
      }

      // 만료 임박 필터
      if (filters.expiringWithin && quest.expires_at) {
        const hoursUntilExpiry = (new Date(quest.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)
        if (hoursUntilExpiry > filters.expiringWithin) {
          return false
        }
      }

      return true
    })
  }

  /**
   * 퀘스트 정렬
   */
  static sortQuests(quests: Quest[], sortBy: 'priority' | 'expiry' | 'progress' | 'created'): Quest[] {
    return [...quests].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          // 상태 우선순위: active > pending > paused > ready_to_claim > completed > failed > expired
          const statusPriority: Record<QuestStatus, number> = {
            active: 1, pending: 2, paused: 3, ready_to_claim: 4,
            completed: 5, failed: 6, expired: 7, locked: 8, legendary: 9, streak: 0
          }
          return statusPriority[a.status] - statusPriority[b.status]

        case 'expiry':
          if (!a.expires_at && !b.expires_at) return 0
          if (!a.expires_at) return 1
          if (!b.expires_at) return -1
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()

        case 'progress':
          const aProgress = this.calculateProgress(a.progress, a.target_value)
          const bProgress = this.calculateProgress(b.progress, b.target_value)
          return bProgress - aProgress // 높은 진행률 우선

        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // 최신 우선

        default:
          return 0
      }
    })
  }
}

/**
 * 퀘스트 상태 전환 헬퍼 함수들
 */
export const questTransitions = {
  start: (questId: string): QuestStatusTransition => ({
    quest_id: questId,
    new_status: 'active',
    reason: 'User started the quest'
  }),

  pause: (questId: string): QuestStatusTransition => ({
    quest_id: questId,
    new_status: 'paused',
    reason: 'User paused the quest'
  }),

  resume: (questId: string): QuestStatusTransition => ({
    quest_id: questId,
    new_status: 'active',
    reason: 'User resumed the quest'
  }),

  complete: (questId: string): QuestStatusTransition => ({
    quest_id: questId,
    new_status: 'completed',
    reason: 'Quest completed successfully'
  }),

  fail: (questId: string, reason?: string): QuestStatusTransition => ({
    quest_id: questId,
    new_status: 'failed',
    reason: reason || 'Quest failed'
  }),

  expire: (questId: string): QuestStatusTransition => ({
    quest_id: questId,
    new_status: 'expired',
    reason: 'Quest expired due to time limit'
  }),

  claim: (questId: string): QuestStatusTransition => ({
    quest_id: questId,
    new_status: 'completed',
    reason: 'Rewards claimed'
  })
}