import { query } from '@/lib/database'

export interface AnalyticsData {
  overview: {
    total_users: number
    active_users_today: number
    active_users_week: number
    total_quests: number
    completed_quests: number
    total_books: number
    total_reading_time: number
  }
  quest_analytics: {
    completion_rate: number
    avg_completion_time: number
    popular_quest_types: { type: string, count: number }[]
    difficulty_distribution: { difficulty: number, count: number }[]
    daily_completions: { date: string, count: number }[]
    status_distribution: { status: string, count: number }[]
  }
  user_engagement: {
    daily_active_users: { date: string, count: number }[]
    retention_rate: {
      day_1: number
      day_7: number
      day_30: number
    }
    session_duration: {
      avg_minutes: number
      median_minutes: number
    }
    streak_distribution: { streak_days: number, user_count: number }[]
  }
  reading_patterns: {
    reading_time_by_hour: { hour: number, total_minutes: number }[]
    reading_time_by_day: { day_of_week: number, total_minutes: number }[]
    popular_genres: { genre: string, count: number }[]
    avg_pages_per_session: number
    focus_score_distribution: { score_range: string, count: number }[]
  }
  performance_metrics: {
    quest_generation_success_rate: number
    api_response_times: { endpoint: string, avg_ms: number }[]
    error_rates: { error_type: string, count: number }[]
  }
}

/**
 * 분석 데이터 관리 클래스
 */
export class Analytics {
  /**
   * 전체 분석 데이터 조회
   */
  static async getAnalyticsData(timeframe: 'day' | 'week' | 'month' | 'year' = 'week'): Promise<AnalyticsData> {
    const timeframeCondition = this.getTimeframeCondition(timeframe)
    
    const [overview, questAnalytics, userEngagement, readingPatterns, performanceMetrics] = await Promise.all([
      this.getOverviewData(timeframeCondition),
      this.getQuestAnalytics(timeframeCondition),
      this.getUserEngagement(timeframeCondition),
      this.getReadingPatterns(timeframeCondition),
      this.getPerformanceMetrics(timeframeCondition)
    ])

    return {
      overview,
      quest_analytics: questAnalytics,
      user_engagement: userEngagement,
      reading_patterns: readingPatterns,
      performance_metrics: performanceMetrics
    }
  }

  /**
   * 개요 데이터 조회
   */
  private static async getOverviewData(timeframeCondition: string) {
    const overviewQuery = `
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(DISTINCT user_id) FROM reading_sessions WHERE DATE(start_time) = CURRENT_DATE) as active_users_today,
        (SELECT COUNT(DISTINCT user_id) FROM reading_sessions WHERE start_time >= CURRENT_DATE - INTERVAL '7 days') as active_users_week,
        (SELECT COUNT(*) FROM quests ${timeframeCondition}) as total_quests,
        (SELECT COUNT(*) FROM quests WHERE status = 'completed' ${timeframeCondition}) as completed_quests,
        (SELECT COUNT(*) FROM books ${timeframeCondition}) as total_books,
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM reading_sessions WHERE end_time IS NOT NULL ${timeframeCondition}) as total_reading_time
    `
    
    const result = await query(overviewQuery, [])
    return result.rows[0] || {
      total_users: 0,
      active_users_today: 0,
      active_users_week: 0,
      total_quests: 0,
      completed_quests: 0,
      total_books: 0,
      total_reading_time: 0
    }
  }

  /**
   * 퀘스트 분석 데이터 조회
   */
  private static async getQuestAnalytics(timeframeCondition: string) {
    // 완료율
    const completionRateQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM quests 
      WHERE 1=1 ${timeframeCondition}
    `
    const completionResult = await query(completionRateQuery, [])
    const completionData = completionResult.rows[0]
    const completion_rate = completionData.total > 0 
      ? Math.round((completionData.completed / completionData.total) * 100) 
      : 0

    // 평균 완료 시간
    const avgTimeQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_hours
      FROM quests 
      WHERE status = 'completed' AND completed_at IS NOT NULL ${timeframeCondition}
    `
    const avgTimeResult = await query(avgTimeQuery, [])
    const avg_completion_time = Math.round(avgTimeResult.rows[0]?.avg_hours || 0)

    // 인기 퀘스트 타입
    const popularTypesQuery = `
      SELECT type, COUNT(*) as count
      FROM quests 
      WHERE 1=1 ${timeframeCondition}
      GROUP BY type
      ORDER BY count DESC
      LIMIT 10
    `
    const popularTypesResult = await query(popularTypesQuery, [])
    const popular_quest_types = popularTypesResult.rows

    // 난이도 분포
    const difficultyQuery = `
      SELECT difficulty, COUNT(*) as count
      FROM quests 
      WHERE 1=1 ${timeframeCondition}
      GROUP BY difficulty
      ORDER BY difficulty
    `
    const difficultyResult = await query(difficultyQuery, [])
    const difficulty_distribution = difficultyResult.rows

    // 일별 완료 수
    const dailyCompletionsQuery = `
      SELECT 
        DATE(completed_at) as date,
        COUNT(*) as count
      FROM quests 
      WHERE status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(completed_at)
      ORDER BY date DESC
      LIMIT 30
    `
    const dailyCompletionsResult = await query(dailyCompletionsQuery, [])
    const daily_completions = dailyCompletionsResult.rows.map(row => ({
      date: row.date,
      count: parseInt(row.count)
    }))

    // 상태 분포
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM quests 
      WHERE 1=1 ${timeframeCondition}
      GROUP BY status
      ORDER BY count DESC
    `
    const statusResult = await query(statusQuery, [])
    const status_distribution = statusResult.rows

    return {
      completion_rate,
      avg_completion_time,
      popular_quest_types,
      difficulty_distribution,
      daily_completions,
      status_distribution
    }
  }

  /**
   * 사용자 참여도 분석
   */
  private static async getUserEngagement(timeframeCondition: string) {
    // 일별 활성 사용자
    const dailyActiveQuery = `
      SELECT 
        DATE(start_time) as date,
        COUNT(DISTINCT user_id) as count
      FROM reading_sessions 
      WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(start_time)
      ORDER BY date DESC
      LIMIT 30
    `
    const dailyActiveResult = await query(dailyActiveQuery, [])
    const daily_active_users = dailyActiveResult.rows.map(row => ({
      date: row.date,
      count: parseInt(row.count)
    }))

    // 리텐션 비율 (간단한 버전)
    const retentionQuery = `
      WITH user_first_session AS (
        SELECT 
          user_id,
          MIN(DATE(start_time)) as first_session_date
        FROM reading_sessions
        GROUP BY user_id
      ),
      retention_data AS (
        SELECT 
          ufs.user_id,
          ufs.first_session_date,
          CASE WHEN EXISTS (
            SELECT 1 FROM reading_sessions rs 
            WHERE rs.user_id = ufs.user_id 
            AND DATE(rs.start_time) = ufs.first_session_date + INTERVAL '1 day'
          ) THEN 1 ELSE 0 END as day_1_return,
          CASE WHEN EXISTS (
            SELECT 1 FROM reading_sessions rs 
            WHERE rs.user_id = ufs.user_id 
            AND DATE(rs.start_time) BETWEEN ufs.first_session_date + INTERVAL '7 days' 
            AND ufs.first_session_date + INTERVAL '14 days'
          ) THEN 1 ELSE 0 END as day_7_return,
          CASE WHEN EXISTS (
            SELECT 1 FROM reading_sessions rs 
            WHERE rs.user_id = ufs.user_id 
            AND DATE(rs.start_time) BETWEEN ufs.first_session_date + INTERVAL '30 days' 
            AND ufs.first_session_date + INTERVAL '37 days'
          ) THEN 1 ELSE 0 END as day_30_return
        FROM user_first_session ufs
        WHERE ufs.first_session_date >= CURRENT_DATE - INTERVAL '60 days'
      )
      SELECT 
        COUNT(*) as total_users,
        AVG(day_1_return) * 100 as day_1_retention,
        AVG(day_7_return) * 100 as day_7_retention,
        AVG(day_30_return) * 100 as day_30_retention
      FROM retention_data
    `
    const retentionResult = await query(retentionQuery, [])
    const retentionData = retentionResult.rows[0] || { day_1_retention: 0, day_7_retention: 0, day_30_retention: 0 }
    
    const retention_rate = {
      day_1: Math.round(retentionData.day_1_retention || 0),
      day_7: Math.round(retentionData.day_7_retention || 0),
      day_30: Math.round(retentionData.day_30_retention || 0)
    }

    // 세션 지속 시간
    const sessionDurationQuery = `
      SELECT 
        AVG(duration_minutes) as avg_minutes,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_minutes) as median_minutes
      FROM reading_sessions 
      WHERE duration_minutes IS NOT NULL AND duration_minutes > 0 ${timeframeCondition}
    `
    const sessionResult = await query(sessionDurationQuery, [])
    const sessionData = sessionResult.rows[0] || { avg_minutes: 0, median_minutes: 0 }
    const session_duration = {
      avg_minutes: Math.round(sessionData.avg_minutes || 0),
      median_minutes: Math.round(sessionData.median_minutes || 0)
    }

    // 연속 기록 분포
    const streakQuery = `
      SELECT 
        CASE 
          WHEN streak_count = 0 THEN 0
          WHEN streak_count BETWEEN 1 AND 3 THEN 3
          WHEN streak_count BETWEEN 4 AND 7 THEN 7
          WHEN streak_count BETWEEN 8 AND 14 THEN 14
          WHEN streak_count BETWEEN 15 AND 30 THEN 30
          ELSE 31
        END as streak_range,
        COUNT(DISTINCT qm.quest_id) as user_count
      FROM quest_metadata qm
      JOIN quests q ON qm.quest_id = q.id
      WHERE q.status = 'completed'
      GROUP BY streak_range
      ORDER BY streak_range
    `
    const streakResult = await query(streakQuery, [])
    const streak_distribution = streakResult.rows.map(row => ({
      streak_days: parseInt(row.streak_range),
      user_count: parseInt(row.user_count)
    }))

    return {
      daily_active_users,
      retention_rate,
      session_duration,
      streak_distribution
    }
  }

  /**
   * 독서 패턴 분석
   */
  private static async getReadingPatterns(timeframeCondition: string) {
    // 시간대별 독서 시간
    const hourlyQuery = `
      SELECT 
        EXTRACT(HOUR FROM start_time) as hour,
        SUM(duration_minutes) as total_minutes
      FROM reading_sessions 
      WHERE duration_minutes IS NOT NULL ${timeframeCondition}
      GROUP BY EXTRACT(HOUR FROM start_time)
      ORDER BY hour
    `
    const hourlyResult = await query(hourlyQuery, [])
    const reading_time_by_hour = hourlyResult.rows.map(row => ({
      hour: parseInt(row.hour),
      total_minutes: parseInt(row.total_minutes || 0)
    }))

    // 요일별 독서 시간
    const dailyQuery = `
      SELECT 
        EXTRACT(DOW FROM start_time) as day_of_week,
        SUM(duration_minutes) as total_minutes
      FROM reading_sessions 
      WHERE duration_minutes IS NOT NULL ${timeframeCondition}
      GROUP BY EXTRACT(DOW FROM start_time)
      ORDER BY day_of_week
    `
    const dailyResult = await query(dailyQuery, [])
    const reading_time_by_day = dailyResult.rows.map(row => ({
      day_of_week: parseInt(row.day_of_week),
      total_minutes: parseInt(row.total_minutes || 0)
    }))

    // 인기 장르
    const genreQuery = `
      SELECT 
        COALESCE(b.genre, '미분류') as genre,
        COUNT(DISTINCT rs.id) as count
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE 1=1 ${timeframeCondition.replace('WHERE', 'AND')}
      GROUP BY b.genre
      ORDER BY count DESC
      LIMIT 10
    `
    const genreResult = await query(genreQuery, [])
    const popular_genres = genreResult.rows

    // 세션당 평균 페이지 수
    const avgPagesQuery = `
      SELECT AVG(pages_read) as avg_pages
      FROM reading_sessions 
      WHERE pages_read IS NOT NULL AND pages_read > 0 ${timeframeCondition}
    `
    const avgPagesResult = await query(avgPagesQuery, [])
    const avg_pages_per_session = Math.round(avgPagesResult.rows[0]?.avg_pages || 0)

    // 집중도 점수 분포
    const focusQuery = `
      SELECT 
        CASE 
          WHEN focus_score >= 90 THEN '90-100'
          WHEN focus_score >= 80 THEN '80-89'
          WHEN focus_score >= 70 THEN '70-79'
          WHEN focus_score >= 60 THEN '60-69'
          ELSE '0-59'
        END as score_range,
        COUNT(*) as count
      FROM reading_sessions 
      WHERE focus_score IS NOT NULL ${timeframeCondition}
      GROUP BY score_range
      ORDER BY score_range DESC
    `
    const focusResult = await query(focusQuery, [])
    const focus_score_distribution = focusResult.rows

    return {
      reading_time_by_hour,
      reading_time_by_day,
      popular_genres,
      avg_pages_per_session,
      focus_score_distribution
    }
  }

  /**
   * 성능 지표 분석
   */
  private static async getPerformanceMetrics(timeframeCondition: string) {
    // 퀘스트 생성 성공률 (간단한 버전)
    const questSuccessQuery = `
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN status != 'failed' THEN 1 END) as successful_attempts
      FROM quests 
      WHERE 1=1 ${timeframeCondition}
    `
    const questSuccessResult = await query(questSuccessQuery, [])
    const questSuccessData = questSuccessResult.rows[0] || { total_attempts: 0, successful_attempts: 0 }
    const quest_generation_success_rate = questSuccessData.total_attempts > 0 
      ? Math.round((questSuccessData.successful_attempts / questSuccessData.total_attempts) * 100)
      : 100

    // API 응답 시간 (모의 데이터)
    const api_response_times = [
      { endpoint: '/api/quests', avg_ms: 150 },
      { endpoint: '/api/books', avg_ms: 120 },
      { endpoint: '/api/auth', avg_ms: 80 },
      { endpoint: '/api/reading-sessions', avg_ms: 200 }
    ]

    // 오류율 (간단한 버전)
    const error_rates = [
      { error_type: 'Authentication Error', count: 5 },
      { error_type: 'Database Error', count: 2 },
      { error_type: 'API Timeout', count: 3 }
    ]

    return {
      quest_generation_success_rate,
      api_response_times,
      error_rates
    }
  }

  /**
   * 시간 프레임 조건 생성
   */
  private static getTimeframeCondition(timeframe: string): string {
    switch (timeframe) {
      case 'day':
        return 'AND created_at >= CURRENT_DATE'
      case 'week':
        return 'AND created_at >= CURRENT_DATE - INTERVAL \'7 days\''
      case 'month':
        return 'AND created_at >= CURRENT_DATE - INTERVAL \'30 days\''
      case 'year':
        return 'AND created_at >= CURRENT_DATE - INTERVAL \'365 days\''
      default:
        return 'AND created_at >= CURRENT_DATE - INTERVAL \'7 days\''
    }
  }

  /**
   * 사용자별 분석 데이터 조회
   */
  static async getUserAnalytics(userId: string) {
    const userAnalyticsQuery = `
      SELECT 
        u.name,
        u.total_xp,
        u.total_coins,
        FLOOR(u.total_xp / 100) + 1 as level,
        (
          SELECT COUNT(*) 
          FROM books 
          WHERE user_id = u.id
        ) as total_books,
        (
          SELECT COUNT(*) 
          FROM quests 
          WHERE user_id = u.id AND status = 'completed'
        ) as completed_quests,
        (
          SELECT COUNT(*) 
          FROM quests 
          WHERE user_id = u.id
        ) as total_quests,
        (
          SELECT COALESCE(SUM(duration_minutes), 0) 
          FROM reading_sessions 
          WHERE user_id = u.id AND end_time IS NOT NULL
        ) as total_reading_time,
        (
          SELECT COUNT(DISTINCT DATE(start_time))
          FROM reading_sessions 
          WHERE user_id = u.id
        ) as reading_days,
        (
          SELECT MAX(streak_count)
          FROM quest_metadata qm
          JOIN quests q ON qm.quest_id = q.id
          WHERE q.user_id = u.id
        ) as max_streak
      FROM users u
      WHERE u.id = $1
    `
    
    const result = await query(userAnalyticsQuery, [userId])
    const userData = result.rows[0]
    
    if (!userData) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    // 최근 활동 조회
    const recentActivityQuery = `
      SELECT 
        'quest_completed' as activity_type,
        q.title as description,
        q.completed_at as timestamp
      FROM quests q
      WHERE q.user_id = $1 AND q.status = 'completed'
      
      UNION ALL
      
      SELECT 
        'reading_session' as activity_type,
        CONCAT('책 읽기: ', b.title) as description,
        rs.start_time as timestamp
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = $1
      
      ORDER BY timestamp DESC
      LIMIT 10
    `
    
    const activityResult = await query(recentActivityQuery, [userId])
    const recent_activities = activityResult.rows

    return {
      user_info: userData,
      recent_activities,
      completion_rate: userData.total_quests > 0 
        ? Math.round((userData.completed_quests / userData.total_quests) * 100)
        : 0
    }
  }
}

export default Analytics