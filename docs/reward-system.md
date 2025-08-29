# BookCraft 보상 시스템 설계서

## 📋 목차

1. [시스템 개요](#시스템-개요)
2. [보상 화폐 체계](#보상-화폐-체계)
3. [보상 지급 로직](#보상-지급-로직)
4. [레벨링 시스템](#레벨링-시스템)
5. [보상 패턴 및 밸런싱](#보상-패턴-및-밸런싱)
6. [특별 보상 시스템](#특별-보상-시스템)
7. [구현 가이드](#구현-가이드)
8. [밸런스 조정 가이드](#밸런스-조정-가이드)

---

## 시스템 개요

BookCraft의 보상 시스템은 독서 활동을 게임화하여 사용자의 지속적인 참여를 유도하는 핵심 메커니즘입니다. 세 가지 주요 화폐(XP, 코인, 레벨)를 통해 즉시 보상과 장기적 성장을 동시에 제공합니다.

### 🎯 설계 목표

- **즉시 만족**: 모든 독서 활동에 대한 즉각적인 보상
- **장기 동기**: 레벨업과 성취감을 통한 지속적 참여
- **개인화**: 다양한 보상 활용 방식 제공
- **균형**: 과도하지 않은 적절한 보상 체계
- **확장성**: 새로운 보상 유형 추가 가능한 구조

---

## 보상 화폐 체계

### ⚡ XP (Experience Points)

#### 정의 및 특성
- **목적**: 사용자의 독서 경험과 실력을 나타내는 누적 지표
- **특성**: 누적형, 소비 불가, 레벨 계산 기준
- **범위**: 0 ~ 무제한
- **표시**: 정수형 (예: 1,250 XP)

#### 획득 방법
```
기본 독서 활동:
- 퀘스트 완료: 10~100 XP (난이도별)
- 독서 세션: 1분당 1 XP (최대 120 XP/세션)
- 책 완독: 페이지 수 × 0.5 XP
- 첫 책 등록: 50 XP (일회성)

보너스 활동:
- 연속 독서 (7일): +100 XP
- 연속 독서 (30일): +500 XP
- 월간 목표 달성: +300 XP
- 완벽한 퀘스트 완료: 기본 XP × 1.5배
```

### 💰 코인 (Coins)

#### 정의 및 특성
- **목적**: 게임 내 구매 가능한 가상 화폐
- **특성**: 소비형, 아바타 꾸미기 및 특별 아이템 구매
- **범위**: 0 ~ 무제한
- **표시**: 정수형 (예: 1,250 코인)

#### 획득 방법
```
기본 독서 활동:
- 퀘스트 완료: 5~50 코인 (난이도별)
- 독서 세션: 10~30 코인 (시간별)
- 책 완독: 페이지 수 × 0.2 코인
- 일일 로그인: 5 코인

보너스 활동:
- 연속 독서 보너스: +50 코인
- 주간 목표 달성: +100 코인
- 가족 챌린지 참여: +75 코인
- 특별 이벤트: +200 코인
```

#### 소비 방법
```
아바타 시스템:
- 기본 아이템: 50~100 코인
- 희귀 아이템: 200~500 코인
- 전설 아이템: 1000+ 코인

특별 기능:
- 퀘스트 스킵: 100 코인
- 추가 퀘스트 슬롯: 200 코인
- 특별 배지: 300 코인
```

### 🏆 레벨 (Level)

#### 정의 및 특성
- **목적**: 사용자의 독서 숙련도를 시각적으로 표현
- **특성**: XP 기반 자동 계산, 명예 지표
- **범위**: 1 ~ 무제한
- **표시**: 정수형 (예: 레벨 15)

#### 계산 공식
```javascript
// 기본 공식
level = Math.floor(total_xp / 100) + 1

// 예시
0~99 XP = 레벨 1
100~199 XP = 레벨 2
1000~1099 XP = 레벨 11
```

#### 레벨별 혜택
```
레벨 5: 특별 배지 "독서 입문자" 획득
레벨 10: 아바타 슬롯 +1 개방
레벨 15: 일일 퀘스트 슬롯 +1 개방
레벨 20: 특별 배지 "독서 애호가" 획득
레벨 25: 가족 챌린지 생성 권한
레벨 30: 특별 배지 "독서 마스터" 획득
```

---

## 보상 지급 로직

### 🔄 동시 지급 시스템

모든 독서 활동은 XP와 코인을 동시에 지급하여 즉시 만족과 장기 성장을 모두 제공합니다.

```javascript
// 보상 지급 함수
const giveReward = async (userId, activity) => {
  const baseReward = getBaseReward(activity)
  const multiplier = getMultiplier(userId, activity)
  
  const finalXP = Math.floor(baseReward.xp * multiplier)
  const finalCoins = Math.floor(baseReward.coins * multiplier)
  
  await updateUserStats(userId, {
    total_xp: user.total_xp + finalXP,
    total_coins: user.total_coins + finalCoins
  })
  
  // 레벨업 체크
  await checkLevelUp(userId)
  
  return { xp: finalXP, coins: finalCoins }
}
```

### 📊 보상 계산 로직

#### 1. 퀘스트 완료 보상

```javascript
const calculateQuestReward = (quest, completionQuality) => {
  const baseXP = quest.difficulty * 20 // 난이도별 기본 XP
  const baseCoins = quest.difficulty * 10 // 난이도별 기본 코인
  
  // 완료 품질에 따른 보너스
  const qualityMultiplier = {
    'perfect': 1.5,    // 완벽 완료
    'good': 1.2,       // 우수 완료
    'normal': 1.0,     // 일반 완료
    'poor': 0.8        // 미흡 완료
  }
  
  return {
    xp: Math.floor(baseXP * qualityMultiplier[completionQuality]),
    coins: Math.floor(baseCoins * qualityMultiplier[completionQuality])
  }
}
```

#### 2. 독서 세션 보상

```javascript
const calculateReadingReward = (sessionData) => {
  const { duration, focusScore, pagesRead } = sessionData
  
  // 시간 기반 XP (1분 = 1 XP, 최대 120분)
  const timeXP = Math.min(duration, 120)
  
  // 집중도 보너스 (70% 이상 시 보너스)
  const focusBonus = focusScore >= 70 ? 1.2 : 1.0
  
  // 페이지 기반 보너스
  const pageBonus = pagesRead * 2
  
  const totalXP = Math.floor((timeXP + pageBonus) * focusBonus)
  const totalCoins = Math.floor(totalXP * 0.4) // XP의 40%
  
  return { xp: totalXP, coins: totalCoins }
}
```

#### 3. 연속 독서 보너스

```javascript
const calculateStreakBonus = (currentStreak) => {
  const streakBonuses = {
    7: { xp: 100, coins: 50, badge: '일주일 연속' },
    14: { xp: 250, coins: 125, badge: '2주 연속' },
    30: { xp: 500, coins: 250, badge: '한 달 연속' },
    60: { xp: 1000, coins: 500, badge: '두 달 연속' },
    100: { xp: 2000, coins: 1000, badge: '백일 연속' }
  }
  
  return streakBonuses[currentStreak] || null
}
```

---

## 레벨링 시스템

### 📈 레벨 진행 곡선

```javascript
// 레벨별 필요 XP 계산
const getRequiredXP = (level) => {
  return (level - 1) * 100 // 선형 증가
}

// 다음 레벨까지 남은 XP
const getXPToNextLevel = (currentXP) => {
  const currentLevel = Math.floor(currentXP / 100) + 1
  const nextLevelXP = currentLevel * 100
  return nextLevelXP - currentXP
}

// 레벨업 체크 및 처리
const checkLevelUp = async (userId) => {
  const user = await getUser(userId)
  const newLevel = Math.floor(user.total_xp / 100) + 1
  
  if (newLevel > user.current_level) {
    await handleLevelUp(userId, user.current_level, newLevel)
  }
}
```

### 🎉 레벨업 보상

```javascript
const handleLevelUp = async (userId, oldLevel, newLevel) => {
  // 기본 레벨업 보상
  const levelUpReward = {
    coins: newLevel * 25, // 레벨당 25코인
    xp: 0 // 레벨업 자체로는 XP 지급 안함
  }
  
  // 특별 레벨 보상
  const specialRewards = {
    5: { badge: 'reading_beginner', coins: 100 },
    10: { badge: 'book_lover', coins: 200, avatar_slot: 1 },
    15: { badge: 'reading_enthusiast', coins: 300, quest_slot: 1 },
    20: { badge: 'book_master', coins: 500 },
    25: { badge: 'reading_legend', coins: 750, family_create: true },
    30: { badge: 'ultimate_reader', coins: 1000 }
  }
  
  await giveReward(userId, levelUpReward)
  
  if (specialRewards[newLevel]) {
    await giveSpecialReward(userId, specialRewards[newLevel])
  }
  
  await notifyLevelUp(userId, newLevel)
}
```

---

## 보상 패턴 및 밸런싱

### 🎯 난이도별 보상 체계

#### 퀘스트 난이도 (1-5)

```javascript
const questRewards = {
  1: { xp: 20, coins: 10, time: '10분' },   // 매우 쉬움
  2: { xp: 40, coins: 20, time: '20분' },   // 쉬움
  3: { xp: 60, coins: 30, time: '30분' },   // 보통
  4: { xp: 80, coins: 40, time: '45분' },   // 어려움
  5: { xp: 100, coins: 50, time: '60분' }   // 매우 어려움
}
```

#### 독서 시간별 보상

```javascript
const readingTimeRewards = {
  '10min': { xp: 15, coins: 8 },
  '20min': { xp: 25, coins: 12 },
  '30min': { xp: 35, coins: 18 },
  '45min': { xp: 50, coins: 25 },
  '60min': { xp: 70, coins: 35 },
  '90min': { xp: 100, coins: 50 },
  '120min': { xp: 130, coins: 65 }
}
```

### 📊 보상 밸런스 지표

#### 일일 획득 가능 보상

```
최소 활동 (30분 독서):
- XP: 35 XP
- 코인: 18 코인
- 예상 레벨업: 3일마다

보통 활동 (60분 독서 + 퀘스트 2개):
- XP: 190 XP
- 코인: 95 코인
- 예상 레벨업: 매일

최대 활동 (120분 독서 + 퀘스트 5개):
- XP: 430 XP
- 코인: 215 코인
- 예상 레벨업: 하루 4레벨
```

#### 경제 밸런스

```
아바타 아이템 가격 대비 획득 시간:
- 기본 아이템 (50코인): 3일 최소 활동
- 희귀 아이템 (200코인): 2일 보통 활동
- 전설 아이템 (1000코인): 5일 최대 활동
```

---

## 특별 보상 시스템

### 🎁 이벤트 보상

#### 계절별 이벤트

```javascript
const seasonalEvents = {
  spring: {
    name: '봄맞이 독서 축제',
    duration: '3월 1일 ~ 3월 31일',
    bonus: 'XP 1.5배, 특별 배지',
    rewards: { xp_multiplier: 1.5, special_badge: 'spring_reader' }
  },
  summer: {
    name: '여름 독서 캠프',
    duration: '7월 1일 ~ 8월 31일',
    bonus: '코인 2배, 여름 아바타',
    rewards: { coin_multiplier: 2.0, avatar_items: ['summer_hat', 'beach_shirt'] }
  },
  autumn: {
    name: '가을 독서의 계절',
    duration: '9월 1일 ~ 11월 30일',
    bonus: '연속 독서 보너스 증가',
    rewards: { streak_bonus: 2.0, special_quests: true }
  },
  winter: {
    name: '겨울 독서 마라톤',
    duration: '12월 1일 ~ 2월 28일',
    bonus: '완독 보상 3배',
    rewards: { completion_multiplier: 3.0, winter_theme: true }
  }
}
```

#### 주간/월간 챌린지

```javascript
const challenges = {
  weekly: {
    '7일_연속_독서': { xp: 200, coins: 100, badge: 'weekly_warrior' },
    '주간_5권_완독': { xp: 500, coins: 250, badge: 'speed_reader' },
    '주간_10시간_독서': { xp: 300, coins: 150, badge: 'time_master' }
  },
  monthly: {
    '월간_20권_완독': { xp: 2000, coins: 1000, badge: 'monthly_champion' },
    '월간_50시간_독서': { xp: 1500, coins: 750, badge: 'dedication_master' },
    '완벽한_한달': { xp: 3000, coins: 1500, badge: 'perfectionist' }
  }
}
```

### 🏅 배지 시스템

#### 배지 카테고리

```javascript
const badgeCategories = {
  progress: {
    name: '진행 배지',
    badges: [
      { id: 'first_book', name: '첫 책', condition: '첫 책 등록' },
      { id: 'book_collector', name: '수집가', condition: '책 50권 등록' },
      { id: 'library_master', name: '도서관장', condition: '책 200권 등록' }
    ]
  },
  streak: {
    name: '연속 배지',
    badges: [
      { id: 'week_streak', name: '일주일 연속', condition: '7일 연속 독서' },
      { id: 'month_streak', name: '한 달 연속', condition: '30일 연속 독서' },
      { id: 'year_streak', name: '일 년 연속', condition: '365일 연속 독서' }
    ]
  },
  achievement: {
    name: '성취 배지',
    badges: [
      { id: 'speed_reader', name: '속독왕', condition: '하루 5권 완독' },
      { id: 'night_owl', name: '올빼미', condition: '밤 12시 이후 독서' },
      { id: 'early_bird', name: '일찍 일어나는 새', condition: '오전 6시 이전 독서' }
    ]
  }
}
```

---

## 구현 가이드

### 🔧 데이터베이스 스키마

#### 사용자 보상 테이블

```sql
-- 사용자 기본 정보 (users 테이블에 추가)
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_coins INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- 보상 히스토리 테이블
CREATE TABLE reward_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reward_type VARCHAR(50) NOT NULL, -- 'quest', 'reading', 'streak', 'levelup'
  xp_amount INTEGER DEFAULT 0,
  coin_amount INTEGER DEFAULT 0,
  source_id UUID, -- quest_id, session_id 등
  multiplier DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 레벨업 히스토리 테이블
CREATE TABLE level_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  old_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,
  total_xp_at_levelup INTEGER NOT NULL,
  rewards_given JSONB, -- 레벨업 시 지급된 보상
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 배지 시스템 테이블

```sql
-- 배지 정의 테이블
CREATE TABLE badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url VARCHAR(255),
  category VARCHAR(50), -- 'progress', 'streak', 'achievement', 'special'
  condition_type VARCHAR(50), -- 'books_read', 'days_streak', 'quests_completed'
  condition_value INTEGER,
  rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 배지 테이블
CREATE TABLE user_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0, -- 배지 획득 진행률
  UNIQUE(user_id, badge_id)
);
```

### 🚀 API 엔드포인트

#### 보상 지급 API

```javascript
// POST /api/rewards/give
export async function POST(request) {
  const { userId, rewardType, sourceId, customAmount } = await request.json()
  
  try {
    const reward = await calculateReward(userId, rewardType, sourceId, customAmount)
    const result = await giveReward(userId, reward)
    
    return NextResponse.json({
      success: true,
      reward: result,
      newLevel: await getCurrentLevel(userId),
      leveledUp: result.leveledUp || false
    })
  } catch (error) {
    return NextResponse.json(
      { error: '보상 지급에 실패했습니다.' },
      { status: 500 }
    )
  }
}
```

#### 사용자 통계 API

```javascript
// GET /api/users/[userId]/stats
export async function GET(request, { params }) {
  try {
    const stats = await getUserStats(params.userId)
    const nextLevelXP = getXPToNextLevel(stats.total_xp)
    const recentRewards = await getRecentRewards(params.userId, 10)
    
    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        next_level_xp: nextLevelXP,
        level_progress: ((stats.total_xp % 100) / 100) * 100
      },
      recent_rewards: recentRewards
    })
  } catch (error) {
    return NextResponse.json(
      { error: '통계 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}
```

### 🎮 프론트엔드 컴포넌트

#### 보상 알림 컴포넌트

```typescript
interface RewardNotificationProps {
  reward: {
    xp: number
    coins: number
    leveledUp?: boolean
    newLevel?: number
    badges?: string[]
  }
  onClose: () => void
}

export function RewardNotification({ reward, onClose }: RewardNotificationProps) {
  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-6 z-50">
      <div className="flex items-center space-x-4">
        <div className="text-2xl">🎉</div>
        <div>
          <h3 className="font-semibold text-lg">보상 획득!</h3>
          <div className="flex items-center space-x-4 mt-2">
            {reward.xp > 0 && (
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">+{reward.xp} XP</span>
              </div>
            )}
            {reward.coins > 0 && (
              <div className="flex items-center space-x-1">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="font-medium">+{reward.coins} 코인</span>
              </div>
            )}
          </div>
          {reward.leveledUp && (
            <div className="mt-2 text-blue-600 font-semibold">
              🎊 레벨 {reward.newLevel} 달성!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 밸런스 조정 가이드

### 📈 모니터링 지표

#### 핵심 KPI

```javascript
const monitoringMetrics = {
  engagement: {
    daily_active_users: 'DAU 추이',
    session_duration: '평균 세션 시간',
    retention_rate: '사용자 유지율'
  },
  progression: {
    average_level: '평균 사용자 레벨',
    level_distribution: '레벨별 사용자 분포',
    xp_per_session: '세션당 평균 XP'
  },
  economy: {
    coin_inflation: '코인 인플레이션율',
    spending_rate: '코인 소비율',
    earning_rate: '코인 획득율'
  }
}
```

#### 밸런스 조정 기준

```javascript
const balanceThresholds = {
  // 너무 빠른 진행
  too_fast: {
    level_per_day: 5, // 하루 5레벨 이상
    xp_per_hour: 200, // 시간당 200 XP 이상
    coin_accumulation: 1000 // 일일 1000 코인 이상
  },
  
  // 너무 느린 진행
  too_slow: {
    level_per_week: 0.5, // 주당 0.5레벨 미만
    xp_per_session: 10, // 세션당 10 XP 미만
    coin_per_day: 5 // 일일 5 코인 미만
  },
  
  // 이상적인 진행
  optimal: {
    level_per_day: 1.5, // 하루 1-2레벨
    xp_per_hour: 60, // 시간당 60 XP
    coin_per_day: 50 // 일일 50 코인
  }
}
```

### 🔧 조정 방법

#### 보상량 조정

```javascript
// 동적 보상 조정 시스템
const adjustRewards = (userStats, globalStats) => {
  let multiplier = 1.0
  
  // 신규 사용자 보너스
  if (userStats.days_since_signup <= 7) {
    multiplier *= 1.5
  }
  
  // 복귀 사용자 보너스
  if (userStats.days_since_last_activity >= 7) {
    multiplier *= 2.0
  }
  
  // 글로벌 밸런스 조정
  if (globalStats.average_progression > balanceThresholds.too_fast.level_per_day) {
    multiplier *= 0.8 // 보상 감소
  } else if (globalStats.average_progression < balanceThresholds.too_slow.level_per_day) {
    multiplier *= 1.2 // 보상 증가
  }
  
  return Math.max(0.5, Math.min(3.0, multiplier)) // 0.5배~3배 제한
}
```

#### A/B 테스트 프레임워크

```javascript
const abTestConfigs = {
  reward_amount: {
    control: { xp_multiplier: 1.0, coin_multiplier: 1.0 },
    variant_a: { xp_multiplier: 1.2, coin_multiplier: 0.8 },
    variant_b: { xp_multiplier: 0.8, coin_multiplier: 1.2 }
  },
  level_curve: {
    control: { xp_per_level: 100 },
    variant_a: { xp_per_level: 80 }, // 더 빠른 레벨업
    variant_b: { xp_per_level: 120 } // 더 느린 레벨업
  }
}
```

---

## 결론

BookCraft의 보상 시스템은 사용자의 독서 동기를 지속적으로 유지하면서도 과도하지 않은 적절한 보상을 제공하도록 설계되었습니다. 이 문서의 가이드라인을 따라 구현하고, 지속적인 모니터링과 조정을 통해 최적의 사용자 경험을 제공할 수 있습니다.

### 핵심 원칙

1. **즉시 보상**: 모든 활동에 즉각적인 피드백
2. **장기 성장**: 레벨업을 통한 성취감
3. **개인화**: 다양한 보상 활용 방식
4. **균형**: 적절한 난이도와 보상
5. **확장성**: 새로운 기능 추가 용이성

이 시스템을 통해 BookCraft는 독서를 게임처럼 재미있게 만들면서도 실제 독서 습관 형성에 도움이 되는 플랫폼으로 발전할 수 있습니다.