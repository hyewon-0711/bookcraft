// 사용자 관련 타입 정의
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  role: 'child' | 'parent'
  family_id?: string
  created_at: string
  updated_at: string
}

// 퀘스트 상태 타입 정의
export type QuestStatus = 
  | 'pending'
  | 'active' 
  | 'paused'
  | 'completed'
  | 'failed'
  | 'expired'
  | 'locked'
  | 'ready_to_claim'
  | 'legendary'
  | 'streak'

// 퀘스트 타입 정의
export type QuestType = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'event'
  | 'adaptive'
  | 'streak'

// 퀘스트 갱신 패턴
export interface QuestRenewalPattern {
  interval: 'daily' | 'weekly' | 'monthly'
  time: string // '00:00' 형식
  dayOfWeek?: number // 0-6 (Sunday-Saturday)
  dayOfMonth?: number // 1-31
}

// 퀘스트 만료 알림 설정
export interface QuestExpiryNotifications {
  '24h_before'?: boolean
  '6h_before'?: boolean
  '1h_before'?: boolean
  '15m_before'?: boolean
  'expired'?: boolean
}

// 퀘스트 메타데이터
export interface QuestMetadata {
  id: string
  quest_id: string
  renewal_pattern?: QuestRenewalPattern
  expiry_notifications?: QuestExpiryNotifications
  streak_count: number
  bonus_multiplier: number
  created_at: string
  updated_at: string
}

// 퀘스트 상태 변경 이력
export interface QuestStatusHistory {
  id: string
  quest_id: string
  from_status: QuestStatus
  to_status: QuestStatus
  changed_by: string
  reason?: string
  metadata?: Record<string, any>
  created_at: string
}

// 가족 관련 타입 정의
export interface Family {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
  updated_at: string
}

// 책 관련 타입 정의
export interface Book {
  id: string
  title: string
  author: string
  isbn?: string
  cover_image_url?: string
  description?: string
  page_count?: number
  publisher?: string
  published_date?: string
  genre?: string
  age_rating?: string
  user_id: string
  created_at: string
  updated_at: string
}

// 업데이트된 퀘스트 인터페이스
export interface Quest {
  id: string
  title: string
  description: string
  type: 'timer' | 'summary' | 'challenge' | 'reading'
  quest_type: QuestType
  difficulty: number
  xp_reward: number
  coin_reward: number
  target_value: number
  progress: number
  status: QuestStatus
  user_id: string
  created_at: string
  updated_at?: string
  completed_at?: string
  expires_at?: string
  auto_renew: boolean
  grace_period_minutes: number
  started_at?: string
  paused_at?: string
  failed_at?: string
  claimed_at?: string
  metadata?: QuestMetadata
}

// 퀘스트 상태 전환 요청
export interface QuestStatusTransition {
  quest_id: string
  new_status: QuestStatus
  reason?: string
}

// 퀘스트 통계
export interface QuestStats {
  total_quests: number
  completed_quests: number
  active_quests: number
  pending_quests: number
  failed_quests: number
  expired_quests: number
  avg_completion_rate: number
  max_streak: number
}

// 퀘스트 필터 옵션
export interface QuestFilters {
  status?: QuestStatus[]
  quest_type?: QuestType[]
  difficulty?: number[]
  expires_within?: string // '24h', '7d', etc.
}

// 퀘스트 생성 요청
export interface CreateQuestRequest {
  title: string
  description: string
  type: 'timer' | 'summary' | 'challenge' | 'reading'
  quest_type: QuestType
  difficulty: number
  target_value: number
  xp_reward?: number
  coin_reward?: number
  expires_at?: string
  auto_renew?: boolean
  grace_period_minutes?: number
  renewal_pattern?: QuestRenewalPattern
  expiry_notifications?: QuestExpiryNotifications
}

// 보상 관련 타입 정의
export interface Reward {
  id: string
  type: 'xp' | 'coin' | 'badge' | 'sticker' | 'avatar_item'
  name: string
  description?: string
  image_url?: string
  value: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  created_at: string
}

// 사용자 보상 관련 타입 정의
export interface UserReward {
  id: string
  user_id: string
  reward_id: string
  quantity: number
  earned_at: string
  quest_id?: string
}

// 독서 세션 관련 타입 정의
export interface ReadingSession {
  id: string
  user_id: string
  book_id: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  focus_score?: number
  pages_read?: number
  summary?: string
  ai_feedback?: string
  created_at: string
}

// 챌린지 관련 타입 정의
export interface Challenge {
  id: string
  title: string
  description: string
  type: 'individual' | 'family'
  goal_type: 'books_read' | 'pages_read' | 'time_spent' | 'quests_completed'
  goal_value: number
  start_date: string
  end_date: string
  family_id?: string
  created_by: string
  status: 'active' | 'completed' | 'expired'
  created_at: string
  updated_at: string
}

// 챌린지 참여 관련 타입 정의
export interface ChallengeParticipation {
  id: string
  challenge_id: string
  user_id: string
  current_progress: number
  completed: boolean
  completed_at?: string
  joined_at: string
}

// 배지 관련 타입 정의
export interface Badge {
  id: string
  name: string
  description: string
  icon_url: string
  condition_type: 'books_read' | 'days_streak' | 'quests_completed' | 'special'
  condition_value?: number
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum'
  created_at: string
}

// 사용자 배지 관련 타입 정의
export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  progress?: number
}

// API 응답 타입 정의
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

// 페이지네이션 타입 정의
export interface PaginationParams {
  page: number
  limit: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

// 폼 관련 타입 정의
export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  email: string
  password: string
  name: string
  role: 'child' | 'parent'
}

export interface BookForm {
  title: string
  author: string
  isbn?: string
  description?: string
  page_count?: number
  publisher?: string
  published_date?: string
  genre?: string
  age_rating?: string
}

// 통계 관련 타입 정의
export interface ReadingStats {
  total_books: number
  total_pages: number
  total_time_minutes: number
  current_streak: number
  longest_streak: number
  total_xp: number
  total_coins: number
  level: number
  badges_count: number
  quests_completed: number
}

// 주간 리포트 타입 정의
export interface WeeklyReport {
  id: string
  user_id: string
  week_start: string
  week_end: string
  books_read: number
  pages_read: number
  time_spent_minutes: number
  quests_completed: number
  xp_earned: number
  coins_earned: number
  badges_earned: number
  highlights: string[]
  generated_at: string
}