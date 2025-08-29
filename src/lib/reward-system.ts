import { query } from './database'

// 보상 타입 정의
export interface Reward {
  xp: number
  coins: number
  badges?: string[]
  leveledUp?: boolean
  newLevel?: number
}

export interface UserStats {
  id: string
  total_xp: number
  total_coins: number
  current_level: number
  current_streak: number
  longest_streak: number
  last_activity_date?: string
}

export interface QuestReward {
  difficulty: number
  completionQuality: 'perfect' | 'good' | 'normal' | 'poor'
}

export interface ReadingSessionData {
  duration: number // 분 단위
  focusScore: number // 0-100
  pagesRead: number
}

// 보상 계산 클래스
export class RewardCalculator {
  // 퀘스트 완료 보상 계산
  static calculateQuestReward(quest: QuestReward): Reward {
    const baseXP = quest.difficulty * 20 // 난이도별 기본 XP
    const baseCoins = quest.difficulty * 10 // 난이도별 기본 코인
    
    // 완료 품질에 따른 보너스
    const qualityMultiplier = {
      'perfect': 1.5,    // 완벽 완료
      'good': 1.2,       // 우수 완료
      'normal': 1.0,     // 일반 완료
      'poor': 0.8        // 미흡 완료
    }
    
    const multiplier = qualityMultiplier[quest.completionQuality]
    
    return {
      xp: Math.floor(baseXP * multiplier),
      coins: Math.floor(baseCoins * multiplier)
    }
  }

  // 독서 세션 보상 계산
  static calculateReadingReward(sessionData: ReadingSessionData): Reward {
    const { duration, focusScore, pagesRead } = sessionData
    
    // 시간 기반 XP (1분 = 1 XP, 최대 120분)
    const timeXP = Math.min(duration, 120)
    
    // 집중도 보너스 (70% 이상 시 보너스)
    const focusBonus = focusScore >= 70 ? 1.2 : 1.0
    
    // 페이지 기반 보너스
    const pageBonus = pagesRead * 2
    
    const totalXP = Math.floor((timeXP + pageBonus) * focusBonus)
    const totalCoins = Math.floor(totalXP * 0.4) // XP의 40%
    
    return {
      xp: totalXP,
      coins: totalCoins
    }
  }

  // 연속 독서 보너스 계산
  static calculateStreakBonus(currentStreak: number): Reward | null {
    const streakBonuses: Record<number, Reward> = {
      7: { xp: 100, coins: 50, badges: ['일주일 연속'] },
      14: { xp: 250, coins: 125, badges: ['2주 연속'] },
      30: { xp: 500, coins: 250, badges: ['한 달 연속'] },
      60: { xp: 1000, coins: 500, badges: ['두 달 연속'] },
      100: { xp: 2000, coins: 1000, badges: ['백일 연속'] }
    }
    
    return streakBonuses[currentStreak] || null
  }

  // 책 완독 보상 계산
  static calculateBookCompletionReward(pageCount: number): Reward {
    const baseXP = Math.floor(pageCount * 0.5)
    const baseCoins = Math.floor(pageCount * 0.2)
    
    return {
      xp: baseXP,
      coins: baseCoins
    }
  }

  // 첫 책 등록 보상
  static getFirstBookReward(): Reward {
    return {
      xp: 50,
      coins: 25,
      badges: ['첫 책']
    }
  }
}

// 레벨 시스템 클래스
export class LevelSystem {
  // 레벨 계산
  static calculateLevel(totalXP: number): number {
    return Math.floor(totalXP / 100) + 1
  }

  // 레벨별 필요 XP 계산
  static getRequiredXP(level: number): number {
    return (level - 1) * 100
  }

  // 다음 레벨까지 남은 XP
  static getXPToNextLevel(currentXP: number): number {
    const currentLevel = this.calculateLevel(currentXP)
    const nextLevelXP = currentLevel * 100
    return nextLevelXP - currentXP
  }

  // 레벨 진행률 (0-100%)
  static getLevelProgress(currentXP: number): number {
    const xpInCurrentLevel = currentXP % 100
    return (xpInCurrentLevel / 100) * 100
  }

  // 레벨업 보상 계산
  static calculateLevelUpReward(newLevel: number): Reward {
    const baseReward = {
      xp: 0, // 레벨업 자체로는 XP 지급 안함
      coins: newLevel * 25 // 레벨당 25코인
    }

    // 특별 레벨 보상
    const specialRewards: Record<number, Partial<Reward>> = {
      5: { badges: ['독서 입문자'], coins: 100 },
      10: { badges: ['책 애호가'], coins: 200 },
      15: { badges: ['독서 열정가'], coins: 300 },
      20: { badges: ['책 마스터'], coins: 500 },
      25: { badges: ['독서 전설'], coins: 750 },
      30: { badges: ['궁극의 독서가'], coins: 1000 }
    }

    const specialReward = specialRewards[newLevel]
    if (specialReward) {
      return {
        ...baseReward,
        ...specialReward,
        badges: specialReward.badges || []
      }
    }

    return baseReward
  }
}

// 보상 지급 시스템 클래스
export class RewardSystem {
  // 사용자 통계 조회
  static async getUserStats(userId: string): Promise<UserStats | null> {
    try {
      const result = await query(
        `SELECT 
          id, total_xp, total_coins, current_streak, longest_streak, last_activity_date,
          FLOOR(total_xp / 100) + 1 as current_level
         FROM users 
         WHERE id = $1`,
        [userId]
      )
      
      return result.rows[0] || null
    } catch (error) {
      console.error('사용자 통계 조회 오류:', error)
      return null
    }
  }

  // 보상 지급
  static async giveReward(
    userId: string, 
    reward: Reward, 
    rewardType: string = 'manual',
    sourceId?: string
  ): Promise<Reward> {
    try {
      const userStats = await this.getUserStats(userId)
      if (!userStats) {
        throw new Error('사용자를 찾을 수 없습니다.')
      }

      const newTotalXP = userStats.total_xp + reward.xp
      const newTotalCoins = userStats.total_coins + reward.coins
      const oldLevel = userStats.current_level
      const newLevel = LevelSystem.calculateLevel(newTotalXP)
      
      // 레벨업 체크
      let levelUpReward: Reward = { xp: 0, coins: 0 }
      let leveledUp = false
      
      if (newLevel > oldLevel) {
        leveledUp = true
        levelUpReward = LevelSystem.calculateLevelUpReward(newLevel)
        
        // 레벨업 히스토리 기록
        await query(
          `INSERT INTO level_history (user_id, old_level, new_level, total_xp_at_levelup, rewards_given)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, oldLevel, newLevel, newTotalXP, JSON.stringify(levelUpReward)]
        )
      }

      // 사용자 통계 업데이트
      await query(
        `UPDATE users 
         SET total_xp = $1, total_coins = $2, current_level = $3, last_activity_date = CURRENT_DATE
         WHERE id = $4`,
        [newTotalXP, newTotalCoins + levelUpReward.coins, newLevel, userId]
      )

      // 보상 히스토리 기록
      await query(
        `INSERT INTO reward_history (user_id, reward_type, xp_amount, coin_amount, source_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, rewardType, reward.xp, reward.coins, sourceId]
      )

      // 배지 지급 (있는 경우)
      if (reward.badges && reward.badges.length > 0) {
        await this.giveBadges(userId, reward.badges)
      }
      
      if (levelUpReward.badges && levelUpReward.badges.length > 0) {
        await this.giveBadges(userId, levelUpReward.badges)
      }

      return {
        xp: reward.xp,
        coins: reward.coins + levelUpReward.coins,
        badges: [...(reward.badges || []), ...(levelUpReward.badges || [])],
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined
      }
    } catch (error) {
      console.error('보상 지급 오류:', error)
      throw error
    }
  }

  // 배지 지급
  static async giveBadges(userId: string, badgeNames: string[]): Promise<void> {
    try {
      for (const badgeName of badgeNames) {
        // 배지 존재 확인
        const badgeResult = await query(
          'SELECT id FROM badges WHERE name = $1',
          [badgeName]
        )
        
        if (badgeResult.rows.length > 0) {
          const badgeId = badgeResult.rows[0].id
          
          // 이미 보유한 배지인지 확인
          const existingBadge = await query(
            'SELECT id FROM user_badges WHERE user_id = $1 AND badge_id = $2',
            [userId, badgeId]
          )
          
          if (existingBadge.rows.length === 0) {
            // 배지 지급
            await query(
              'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)',
              [userId, badgeId]
            )
          }
        }
      }
    } catch (error) {
      console.error('배지 지급 오류:', error)
    }
  }

  // 연속 독서 업데이트
  static async updateStreak(userId: string): Promise<Reward | null> {
    try {
      const userStats = await this.getUserStats(userId)
      if (!userStats) return null

      const today = new Date().toISOString().split('T')[0]
      const lastActivity = userStats.last_activity_date
      
      let newStreak = 1
      
      if (lastActivity) {
        const lastDate = new Date(lastActivity)
        const todayDate = new Date(today)
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays === 1) {
          // 연속 독서
          newStreak = userStats.current_streak + 1
        } else if (diffDays === 0) {
          // 오늘 이미 활동함
          return null
        } else {
          // 연속 끊김
          newStreak = 1
        }
      }

      // 연속 독서 기록 업데이트
      const longestStreak = Math.max(newStreak, userStats.longest_streak)
      
      await query(
        `UPDATE users 
         SET current_streak = $1, longest_streak = $2, last_activity_date = $3
         WHERE id = $4`,
        [newStreak, longestStreak, today, userId]
      )

      // 연속 독서 보너스 체크
      const streakBonus = RewardCalculator.calculateStreakBonus(newStreak)
      if (streakBonus) {
        return await this.giveReward(userId, streakBonus, 'streak')
      }

      return null
    } catch (error) {
      console.error('연속 독서 업데이트 오류:', error)
      return null
    }
  }

  // 퀘스트 완료 보상 지급
  static async giveQuestReward(
    userId: string, 
    questId: string, 
    difficulty: number, 
    completionQuality: 'perfect' | 'good' | 'normal' | 'poor' = 'normal'
  ): Promise<Reward> {
    const questReward = RewardCalculator.calculateQuestReward({ difficulty, completionQuality })
    const streakReward = await this.updateStreak(userId)
    
    const totalReward = {
      xp: questReward.xp + (streakReward?.xp || 0),
      coins: questReward.coins + (streakReward?.coins || 0),
      badges: [...(questReward.badges || []), ...(streakReward?.badges || [])]
    }
    
    return await this.giveReward(userId, totalReward, 'quest', questId)
  }

  // 독서 세션 완료 보상 지급
  static async giveReadingReward(
    userId: string, 
    sessionId: string, 
    sessionData: ReadingSessionData
  ): Promise<Reward> {
    const readingReward = RewardCalculator.calculateReadingReward(sessionData)
    const streakReward = await this.updateStreak(userId)
    
    const totalReward = {
      xp: readingReward.xp + (streakReward?.xp || 0),
      coins: readingReward.coins + (streakReward?.coins || 0),
      badges: [...(readingReward.badges || []), ...(streakReward?.badges || [])]
    }
    
    return await this.giveReward(userId, totalReward, 'reading', sessionId)
  }

  // 책 완독 보상 지급
  static async giveBookCompletionReward(
    userId: string, 
    bookId: string, 
    pageCount: number
  ): Promise<Reward> {
    const bookReward = RewardCalculator.calculateBookCompletionReward(pageCount)
    return await this.giveReward(userId, bookReward, 'book_completion', bookId)
  }

  // 첫 책 등록 보상 지급
  static async giveFirstBookReward(userId: string, bookId: string): Promise<Reward> {
    const firstBookReward = RewardCalculator.getFirstBookReward()
    return await this.giveReward(userId, firstBookReward, 'first_book', bookId)
  }

  // 사용자 보상 히스토리 조회
  static async getRewardHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      const result = await query(
        `SELECT reward_type, xp_amount, coin_amount, created_at
         FROM reward_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      )
      
      return result.rows
    } catch (error) {
      console.error('보상 히스토리 조회 오류:', error)
      return []
    }
  }

  // 사용자 배지 조회
  static async getUserBadges(userId: string): Promise<any[]> {
    try {
      const result = await query(
        `SELECT b.name, b.description, b.icon_url, b.rarity, ub.earned_at
         FROM user_badges ub
         JOIN badges b ON ub.badge_id = b.id
         WHERE ub.user_id = $1
         ORDER BY ub.earned_at DESC`,
        [userId]
      )
      
      return result.rows
    } catch (error) {
      console.error('사용자 배지 조회 오류:', error)
      return []
    }
  }
}

// 보상 밸런싱 시스템
export class RewardBalancer {
  // 동적 보상 조정
  static calculateMultiplier(userStats: UserStats): number {
    let multiplier = 1.0
    
    // 신규 사용자 보너스 (가입 후 7일)
    const signupDate = new Date(userStats.last_activity_date || Date.now())
    const daysSinceSignup = Math.floor((Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceSignup <= 7) {
      multiplier *= 1.5
    }
    
    // 복귀 사용자 보너스 (7일 이상 비활성)
    if (userStats.last_activity_date) {
      const lastActivity = new Date(userStats.last_activity_date)
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysSinceActivity >= 7) {
        multiplier *= 2.0
      }
    }
    
    // 레벨 기반 조정 (고레벨 사용자는 보상 감소)
    if (userStats.current_level > 20) {
      multiplier *= 0.9
    } else if (userStats.current_level > 50) {
      multiplier *= 0.8
    }
    
    return Math.max(0.5, Math.min(3.0, multiplier)) // 0.5배~3배 제한
  }
}