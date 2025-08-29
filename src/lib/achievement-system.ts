import { query } from '@/lib/database'
import { Badge, UserBadge } from '@/types'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: 'reading' | 'quests' | 'social' | 'time' | 'special'
  type: 'milestone' | 'streak' | 'challenge' | 'hidden'
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  condition: {
    type: 'books_read' | 'pages_read' | 'time_spent' | 'quests_completed' | 
          'streak_days' | 'level_reached' | 'genre_diversity' | 'speed_reading' |
          'early_bird' | 'night_owl' | 'weekend_warrior' | 'perfectionist'
    value?: number
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time'
    additional_params?: Record<string, any>
  }
  rewards: {
    xp: number
    coins: number
    title?: string
    avatar_item?: string
  }
  is_secret: boolean
  unlock_message: string
}

/**
 * 성취 시스템 관리 클래스
 */
export class AchievementSystem {
  private static achievements: Achievement[] = [
    // 독서 관련 성취
    {
      id: 'first_book',
      name: '첫 번째 책',
      description: '첫 번째 책을 등록했습니다',
      icon: '📚',
      category: 'reading',
      type: 'milestone',
      rarity: 'bronze',
      condition: { type: 'books_read', value: 1 },
      rewards: { xp: 50, coins: 25 },
      is_secret: false,
      unlock_message: '독서 여행의 첫 걸음을 내디뎠습니다! 🎉'
    },
    {
      id: 'bookworm',
      name: '책벌레',
      description: '10권의 책을 등록했습니다',
      icon: '🐛',
      category: 'reading',
      type: 'milestone',
      rarity: 'silver',
      condition: { type: 'books_read', value: 10 },
      rewards: { xp: 200, coins: 100 },
      is_secret: false,
      unlock_message: '진정한 책벌레가 되었습니다! 📖'
    },
    {
      id: 'library_master',
      name: '도서관 마스터',
      description: '50권의 책을 등록했습니다',
      icon: '🏛️',
      category: 'reading',
      type: 'milestone',
      rarity: 'gold',
      condition: { type: 'books_read', value: 50 },
      rewards: { xp: 500, coins: 300, title: '도서관 마스터' },
      is_secret: false,
      unlock_message: '당신만의 도서관을 완성했습니다! 🏆'
    },
    {
      id: 'speed_reader',
      name: '속독왕',
      description: '1시간에 100페이지 이상 읽었습니다',
      icon: '⚡',
      category: 'reading',
      type: 'challenge',
      rarity: 'gold',
      condition: { 
        type: 'speed_reading', 
        additional_params: { pages_per_hour: 100 }
      },
      rewards: { xp: 300, coins: 150, title: '속독왕' },
      is_secret: false,
      unlock_message: '번개처럼 빠른 독서 실력을 보여주셨습니다! ⚡'
    },
    
    // 퀘스트 관련 성취
    {
      id: 'quest_beginner',
      name: '퀘스트 초보자',
      description: '첫 번째 퀘스트를 완료했습니다',
      icon: '🎯',
      category: 'quests',
      type: 'milestone',
      rarity: 'bronze',
      condition: { type: 'quests_completed', value: 1 },
      rewards: { xp: 30, coins: 15 },
      is_secret: false,
      unlock_message: '퀘스트 모험이 시작되었습니다! 🚀'
    },
    {
      id: 'quest_master',
      name: '퀘스트 마스터',
      description: '100개의 퀘스트를 완료했습니다',
      icon: '🏅',
      category: 'quests',
      type: 'milestone',
      rarity: 'platinum',
      condition: { type: 'quests_completed', value: 100 },
      rewards: { xp: 1000, coins: 500, title: '퀘스트 마스터' },
      is_secret: false,
      unlock_message: '퀘스트의 진정한 마스터가 되었습니다! 👑'
    },
    {
      id: 'perfectionist',
      name: '완벽주의자',
      description: '연속 10개 퀘스트를 100% 달성했습니다',
      icon: '💎',
      category: 'quests',
      type: 'challenge',
      rarity: 'diamond',
      condition: { 
        type: 'perfectionist',
        additional_params: { consecutive_perfect: 10 }
      },
      rewards: { xp: 800, coins: 400, title: '완벽주의자' },
      is_secret: false,
      unlock_message: '완벽한 실행력을 보여주셨습니다! 💎'
    },
    
    // 연속 기록 관련 성취
    {
      id: 'streak_week',
      name: '일주일 연속',
      description: '7일 연속 독서했습니다',
      icon: '🔥',
      category: 'time',
      type: 'streak',
      rarity: 'bronze',
      condition: { type: 'streak_days', value: 7 },
      rewards: { xp: 150, coins: 75 },
      is_secret: false,
      unlock_message: '일주일 연속 독서 습관을 만들었습니다! 🔥'
    },
    {
      id: 'streak_month',
      name: '한 달 연속',
      description: '30일 연속 독서했습니다',
      icon: '🌟',
      category: 'time',
      type: 'streak',
      rarity: 'gold',
      condition: { type: 'streak_days', value: 30 },
      rewards: { xp: 600, coins: 300, title: '꾸준한 독서가' },
      is_secret: false,
      unlock_message: '한 달 연속 독서의 위대한 성취입니다! 🌟'
    },
    {
      id: 'streak_year',
      name: '일 년 연속',
      description: '365일 연속 독서했습니다',
      icon: '👑',
      category: 'time',
      type: 'streak',
      rarity: 'diamond',
      condition: { type: 'streak_days', value: 365 },
      rewards: { xp: 3650, coins: 1825, title: '독서 전설' },
      is_secret: false,
      unlock_message: '전설적인 독서 연속 기록을 달성했습니다! 👑'
    },
    
    // 시간대별 성취
    {
      id: 'early_bird',
      name: '일찍 일어나는 새',
      description: '오전 6시 이전에 독서를 시작했습니다',
      icon: '🐦',
      category: 'time',
      type: 'challenge',
      rarity: 'silver',
      condition: { 
        type: 'early_bird',
        additional_params: { before_hour: 6 }
      },
      rewards: { xp: 100, coins: 50 },
      is_secret: false,
      unlock_message: '새벽 독서의 고요함을 즐기는 분이시군요! 🌅'
    },
    {
      id: 'night_owl',
      name: '올빼미',
      description: '밤 11시 이후에 독서했습니다',
      icon: '🦉',
      category: 'time',
      type: 'challenge',
      rarity: 'silver',
      condition: { 
        type: 'night_owl',
        additional_params: { after_hour: 23 }
      },
      rewards: { xp: 100, coins: 50 },
      is_secret: false,
      unlock_message: '밤의 정적 속에서 독서하는 올빼미! 🌙'
    },
    {
      id: 'weekend_warrior',
      name: '주말 전사',
      description: '주말에 평일보다 2배 많이 읽었습니다',
      icon: '⚔️',
      category: 'time',
      type: 'challenge',
      rarity: 'gold',
      condition: { 
        type: 'weekend_warrior',
        additional_params: { multiplier: 2 }
      },
      rewards: { xp: 250, coins: 125 },
      is_secret: false,
      unlock_message: '주말을 독서로 알차게 보내는 전사! ⚔️'
    },
    
    // 장르 다양성 성취
    {
      id: 'genre_explorer',
      name: '장르 탐험가',
      description: '5개 이상의 다른 장르를 읽었습니다',
      icon: '🗺️',
      category: 'reading',
      type: 'challenge',
      rarity: 'silver',
      condition: { 
        type: 'genre_diversity',
        value: 5
      },
      rewards: { xp: 200, coins: 100 },
      is_secret: false,
      unlock_message: '다양한 장르를 탐험하는 모험가! 🗺️'
    },
    
    // 숨겨진 성취
    {
      id: 'midnight_reader',
      name: '자정의 독서가',
      description: '정확히 자정에 독서를 시작했습니다',
      icon: '🕛',
      category: 'special',
      type: 'hidden',
      rarity: 'platinum',
      condition: { 
        type: 'early_bird',
        additional_params: { exact_hour: 0 }
      },
      rewards: { xp: 500, coins: 250, title: '자정의 독서가' },
      is_secret: true,
      unlock_message: '자정의 신비로운 독서 시간을 발견했습니다! 🌙✨'
    },
    {
      id: 'page_turner',
      name: '페이지 터너',
      description: '하루에 1000페이지를 읽었습니다',
      icon: '📄',
      category: 'reading',
      type: 'hidden',
      rarity: 'diamond',
      condition: { 
        type: 'pages_read',
        value: 1000,
        timeframe: 'daily'
      },
      rewards: { xp: 1000, coins: 500, title: '페이지 터너' },
      is_secret: true,
      unlock_message: '놀라운 독서 속도를 보여주셨습니다! 📄💨'
    }
  ]

  /**
   * 모든 성취 조회
   */
  static getAllAchievements(): Achievement[] {
    return this.achievements
  }

  /**
   * 공개된 성취만 조회
   */
  static getPublicAchievements(): Achievement[] {
    return this.achievements.filter(achievement => !achievement.is_secret)
  }

  /**
   * 카테고리별 성취 조회
   */
  static getAchievementsByCategory(category: string): Achievement[] {
    return this.achievements.filter(achievement => achievement.category === category)
  }

  /**
   * 사용자의 성취 진행도 확인
   */
  static async checkUserAchievements(userId: string): Promise<{
    unlocked: Achievement[]
    progress: { achievement: Achievement, current: number, required: number }[]
  }> {
    const unlockedAchievements: Achievement[] = []
    const progressData: { achievement: Achievement, current: number, required: number }[] = []

    // 사용자 통계 조회
    const userStatsQuery = `
      SELECT 
        u.total_xp,
        u.total_coins,
        FLOOR(u.total_xp / 100) + 1 as level,
        (
          SELECT COUNT(*) 
          FROM books 
          WHERE user_id = u.id
        ) as books_count,
        (
          SELECT COUNT(*) 
          FROM quests 
          WHERE user_id = u.id AND status = 'completed'
        ) as quests_completed,
        (
          SELECT COUNT(DISTINCT DATE(created_at))
          FROM reading_sessions 
          WHERE user_id = u.id AND end_time IS NOT NULL
        ) as reading_days,
        (
          SELECT MAX(streak_count)
          FROM quest_metadata qm
          JOIN quests q ON qm.quest_id = q.id
          WHERE q.user_id = u.id
        ) as max_streak,
        (
          SELECT COUNT(DISTINCT genre)
          FROM books
          WHERE user_id = u.id AND genre IS NOT NULL
        ) as genre_count,
        (
          SELECT SUM(pages_read)
          FROM reading_sessions
          WHERE user_id = u.id
        ) as total_pages
      FROM users u
      WHERE u.id = $1
    `
    
    const statsResult = await query(userStatsQuery, [userId])
    const userStats = statsResult.rows[0] || {
      books_count: 0,
      quests_completed: 0,
      reading_days: 0,
      max_streak: 0,
      genre_count: 0,
      total_pages: 0
    }

    // 이미 획득한 성취 조회
    const earnedAchievementsQuery = `
      SELECT achievement_id 
      FROM user_achievements 
      WHERE user_id = $1
    `
    
    const earnedResult = await query(earnedAchievementsQuery, [userId])
    const earnedAchievementIds = earnedResult.rows.map(row => row.achievement_id)

    // 각 성취에 대해 진행도 확인
    for (const achievement of this.achievements) {
      if (earnedAchievementIds.includes(achievement.id)) {
        continue // 이미 획득한 성취는 건너뛰기
      }

      const { current, required, unlocked } = await this.checkAchievementProgress(
        achievement,
        userStats,
        userId
      )

      if (unlocked) {
        unlockedAchievements.push(achievement)
      } else {
        progressData.push({
          achievement,
          current,
          required
        })
      }
    }

    return {
      unlocked: unlockedAchievements,
      progress: progressData
    }
  }

  /**
   * 특정 성취의 진행도 확인
   */
  private static async checkAchievementProgress(
    achievement: Achievement,
    userStats: any,
    userId: string
  ): Promise<{ current: number, required: number, unlocked: boolean }> {
    const condition = achievement.condition
    let current = 0
    let required = condition.value || 1
    let unlocked = false

    switch (condition.type) {
      case 'books_read':
        current = userStats.books_count || 0
        unlocked = current >= required
        break

      case 'quests_completed':
        current = userStats.quests_completed || 0
        unlocked = current >= required
        break

      case 'streak_days':
        current = userStats.max_streak || 0
        unlocked = current >= required
        break

      case 'genre_diversity':
        current = userStats.genre_count || 0
        unlocked = current >= required
        break

      case 'pages_read':
        if (condition.timeframe === 'daily') {
          // 하루 최대 페이지 수 조회
          const dailyPagesQuery = `
            SELECT MAX(daily_pages) as max_daily_pages
            FROM (
              SELECT DATE(created_at) as read_date, SUM(pages_read) as daily_pages
              FROM reading_sessions
              WHERE user_id = $1 AND pages_read IS NOT NULL
              GROUP BY DATE(created_at)
            ) daily_stats
          `
          const dailyResult = await query(dailyPagesQuery, [userId])
          current = dailyResult.rows[0]?.max_daily_pages || 0
        } else {
          current = userStats.total_pages || 0
        }
        unlocked = current >= required
        break

      case 'early_bird':
      case 'night_owl':
        // 시간대별 독서 기록 확인
        const timeCondition = condition.additional_params
        const timeQuery = `
          SELECT COUNT(*) as count
          FROM reading_sessions
          WHERE user_id = $1 
            AND EXTRACT(HOUR FROM start_time) ${condition.type === 'early_bird' ? '<' : '>='} $2
        `
        const timeResult = await query(timeQuery, [
          userId,
          timeCondition?.before_hour || timeCondition?.after_hour || 6
        ])
        current = timeResult.rows[0]?.count || 0
        required = 1
        unlocked = current >= required
        break

      case 'speed_reading':
        // 속독 기록 확인
        const speedQuery = `
          SELECT MAX(pages_read::float / GREATEST(duration_minutes::float / 60, 0.1)) as max_pages_per_hour
          FROM reading_sessions
          WHERE user_id = $1 AND pages_read > 0 AND duration_minutes > 0
        `
        const speedResult = await query(speedQuery, [userId])
        current = Math.floor(speedResult.rows[0]?.max_pages_per_hour || 0)
        required = condition.additional_params?.pages_per_hour || 100
        unlocked = current >= required
        break

      case 'perfectionist':
        // 연속 완벽 퀘스트 완료 확인
        const perfectQuery = `
          WITH quest_completion AS (
            SELECT 
              id,
              progress,
              target_value,
              completed_at,
              CASE WHEN progress >= target_value THEN 1 ELSE 0 END as is_perfect
            FROM quests
            WHERE user_id = $1 AND status = 'completed'
            ORDER BY completed_at DESC
          ),
          consecutive_perfect AS (
            SELECT 
              *,
              ROW_NUMBER() OVER (ORDER BY completed_at DESC) - 
              ROW_NUMBER() OVER (PARTITION BY is_perfect ORDER BY completed_at DESC) as grp
            FROM quest_completion
          )
          SELECT COUNT(*) as consecutive_count
          FROM consecutive_perfect
          WHERE is_perfect = 1 AND grp = 0
        `
        const perfectResult = await query(perfectQuery, [userId])
        current = perfectResult.rows[0]?.consecutive_count || 0
        required = condition.additional_params?.consecutive_perfect || 10
        unlocked = current >= required
        break

      default:
        // 기본적으로 달성되지 않은 것으로 처리
        break
    }

    return { current, required, unlocked }
  }

  /**
   * 성취 달성 처리
   */
  static async unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
    try {
      const achievement = this.achievements.find(a => a.id === achievementId)
      if (!achievement) {
        console.error('존재하지 않는 성취:', achievementId)
        return false
      }

      // 이미 획득했는지 확인
      const existingQuery = `
        SELECT id FROM user_achievements 
        WHERE user_id = $1 AND achievement_id = $2
      `
      const existingResult = await query(existingQuery, [userId, achievementId])
      
      if (existingResult.rows.length > 0) {
        console.log('이미 획득한 성취:', achievementId)
        return false
      }

      // 성취 기록 저장
      const insertQuery = `
        INSERT INTO user_achievements (
          user_id,
          achievement_id,
          earned_at
        ) VALUES ($1, $2, CURRENT_TIMESTAMP)
      `
      
      await query(insertQuery, [userId, achievementId])

      // 보상 지급
      const rewardQuery = `
        UPDATE users 
        SET 
          total_xp = total_xp + $2,
          total_coins = total_coins + $3
        WHERE id = $1
      `
      
      await query(rewardQuery, [userId, achievement.rewards.xp, achievement.rewards.coins])

      console.log(`성취 달성: ${achievement.name} (사용자: ${userId})`, {
        xp: achievement.rewards.xp,
        coins: achievement.rewards.coins
      })

      return true
    } catch (error) {
      console.error('성취 달성 처리 오류:', error)
      return false
    }
  }

  /**
   * 사용자의 모든 성취 조회
   */
  static async getUserAchievements(userId: string): Promise<{
    earned: (Achievement & { earned_at: string })[]
    available: Achievement[]
    progress: { achievement: Achievement, current: number, required: number }[]
  }> {
    // 획득한 성취 조회
    const earnedQuery = `
      SELECT 
        ua.achievement_id,
        ua.earned_at
      FROM user_achievements ua
      WHERE ua.user_id = $1
      ORDER BY ua.earned_at DESC
    `
    
    const earnedResult = await query(earnedQuery, [userId])
    const earnedAchievements = earnedResult.rows
      .map(row => {
        const achievement = this.achievements.find(a => a.id === row.achievement_id)
        return achievement ? { ...achievement, earned_at: row.earned_at } : null
      })
      .filter((item): item is Achievement & { earned_at: string } => item !== null)

    // 진행도 확인
    const { unlocked, progress } = await this.checkUserAchievements(userId)
    
    // 사용 가능한 성취 (공개된 것만)
    const availableAchievements = this.getPublicAchievements().filter(achievement => 
      !earnedAchievements.some(earned => earned.id === achievement.id)
    )

    return {
      earned: earnedAchievements,
      available: availableAchievements,
      progress
    }
  }
}

export default AchievementSystem