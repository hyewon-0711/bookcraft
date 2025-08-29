-- BookCraft 보상 시스템 데이터베이스 스키마
-- 이 파일은 보상 시스템에 필요한 테이블들을 생성합니다.

-- 사용자 테이블에 보상 관련 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_date DATE;

-- 보상 히스토리 테이블
CREATE TABLE IF NOT EXISTS reward_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reward_type VARCHAR(50) NOT NULL, -- 'quest', 'reading', 'streak', 'levelup', 'book_completion', 'first_book', 'manual'
  xp_amount INTEGER DEFAULT 0,
  coin_amount INTEGER DEFAULT 0,
  source_id UUID, -- quest_id, session_id, book_id 등
  multiplier DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 레벨업 히스토리 테이블
CREATE TABLE IF NOT EXISTS level_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  old_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,
  total_xp_at_levelup INTEGER NOT NULL,
  rewards_given JSONB, -- 레벨업 시 지급된 보상
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 배지 데이터 삽입
INSERT INTO badges (name, description, icon_url, category, condition_type, condition_value, rarity) VALUES
-- 진행 배지
('첫 책', '첫 번째 책을 등록한 독서 초보자', '/badges/first-book.svg', 'progress', 'books_read', 1, 'bronze'),
('수집가', '50권의 책을 등록한 열정적인 수집가', '/badges/collector.svg', 'progress', 'books_read', 50, 'silver'),
('도서관장', '200권의 책을 등록한 진정한 도서관장', '/badges/librarian.svg', 'progress', 'books_read', 200, 'gold'),

-- 연속 배지
('일주일 연속', '7일 연속 독서한 꾸준한 독서가', '/badges/week-streak.svg', 'streak', 'days_streak', 7, 'bronze'),
('2주 연속', '14일 연속 독서한 인내심 있는 독서가', '/badges/two-week-streak.svg', 'streak', 'days_streak', 14, 'silver'),
('한 달 연속', '30일 연속 독서한 진정한 독서 마니아', '/badges/month-streak.svg', 'streak', 'days_streak', 30, 'gold'),
('두 달 연속', '60일 연속 독서한 독서의 달인', '/badges/two-month-streak.svg', 'streak', 'days_streak', 60, 'epic'),
('백일 연속', '100일 연속 독서한 독서의 전설', '/badges/hundred-days.svg', 'streak', 'days_streak', 100, 'legendary'),

-- 레벨 배지
('독서 입문자', '레벨 5에 도달한 독서 입문자', '/badges/beginner.svg', 'achievement', 'level_reached', 5, 'bronze'),
('책 애호가', '레벨 10에 도달한 책 애호가', '/badges/book-lover.svg', 'achievement', 'level_reached', 10, 'silver'),
('독서 열정가', '레벨 15에 도달한 독서 열정가', '/badges/enthusiast.svg', 'achievement', 'level_reached', 15, 'gold'),
('책 마스터', '레벨 20에 도달한 책 마스터', '/badges/master.svg', 'achievement', 'level_reached', 20, 'epic'),
('독서 전설', '레벨 25에 도달한 독서의 전설', '/badges/legend.svg', 'achievement', 'level_reached', 25, 'legendary'),
('궁극의 독서가', '레벨 30에 도달한 궁극의 독서가', '/badges/ultimate.svg', 'achievement', 'level_reached', 30, 'legendary'),

-- 성취 배지
('속독왕', '하루에 5권을 완독한 속독의 달인', '/badges/speed-reader.svg', 'achievement', 'books_per_day', 5, 'epic'),
('올빼미', '밤 12시 이후에 독서한 야행성 독서가', '/badges/night-owl.svg', 'achievement', 'special', 0, 'rare'),
('일찍 일어나는 새', '오전 6시 이전에 독서한 부지런한 독서가', '/badges/early-bird.svg', 'achievement', 'special', 0, 'rare'),
('완벽주의자', '모든 퀘스트를 완벽하게 완료한 완벽주의자', '/badges/perfectionist.svg', 'achievement', 'perfect_quests', 10, 'legendary'),

-- 주간/월간 챌린지 배지
('주간 전사', '주간 챌린지를 완료한 전사', '/badges/weekly-warrior.svg', 'challenge', 'weekly_challenge', 1, 'silver'),
('월간 챔피언', '월간 챌린지를 완료한 챔피언', '/badges/monthly-champion.svg', 'challenge', 'monthly_challenge', 1, 'gold'),
('시간의 주인', '주간 10시간 독서를 달성한 시간의 주인', '/badges/time-master.svg', 'challenge', 'weekly_hours', 10, 'epic'),
('헌신의 달인', '월간 50시간 독서를 달성한 헌신의 달인', '/badges/dedication-master.svg', 'challenge', 'monthly_hours', 50, 'legendary')

ON CONFLICT (name) DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reward_history_user_id ON reward_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_created_at ON reward_history(created_at);
CREATE INDEX IF NOT EXISTS idx_level_history_user_id ON level_history(user_id);
CREATE INDEX IF NOT EXISTS idx_level_history_new_level ON level_history(new_level);
CREATE INDEX IF NOT EXISTS idx_users_current_level ON users(current_level);
CREATE INDEX IF NOT EXISTS idx_users_total_xp ON users(total_xp);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_date);

-- RLS 정책 생성

-- 보상 히스토리는 소유자만 접근 가능
CREATE POLICY "Users can view own reward history" ON reward_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert reward history" ON reward_history FOR INSERT WITH CHECK (true);

-- 레벨업 히스토리는 소유자만 접근 가능
CREATE POLICY "Users can view own level history" ON level_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert level history" ON level_history FOR INSERT WITH CHECK (true);

-- RLS 활성화
ALTER TABLE reward_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_history ENABLE ROW LEVEL SECURITY;

-- 보상 시스템 함수들

-- 사용자 레벨 계산 함수
CREATE OR REPLACE FUNCTION calculate_user_level(total_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(total_xp / 100) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 다음 레벨까지 필요한 XP 계산 함수
CREATE OR REPLACE FUNCTION xp_to_next_level(total_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  current_level INTEGER;
  next_level_xp INTEGER;
BEGIN
  current_level := calculate_user_level(total_xp);
  next_level_xp := current_level * 100;
  RETURN next_level_xp - total_xp;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 레벨 진행률 계산 함수 (0-100)
CREATE OR REPLACE FUNCTION level_progress_percentage(total_xp INTEGER)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  xp_in_current_level INTEGER;
BEGIN
  xp_in_current_level := total_xp % 100;
  RETURN (xp_in_current_level::DECIMAL / 100) * 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 사용자 통계 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  -- total_xp가 변경되었을 때 current_level 자동 업데이트
  IF OLD.total_xp IS DISTINCT FROM NEW.total_xp THEN
    NEW.current_level := calculate_user_level(NEW.total_xp);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 사용자 레벨 자동 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_update_user_level ON users;
CREATE TRIGGER trigger_update_user_level
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level();

-- 보상 통계 뷰
CREATE OR REPLACE VIEW user_reward_stats AS
SELECT 
  u.id,
  u.name,
  u.total_xp,
  u.total_coins,
  u.current_level,
  u.current_streak,
  u.longest_streak,
  u.last_activity_date,
  calculate_user_level(u.total_xp) as calculated_level,
  xp_to_next_level(u.total_xp) as xp_to_next_level,
  level_progress_percentage(u.total_xp) as level_progress,
  COALESCE(rh.total_rewards, 0) as total_rewards_received,
  COALESCE(lh.total_levelups, 0) as total_levelups,
  COALESCE(ub.badge_count, 0) as badge_count
FROM users u
LEFT JOIN (
  SELECT 
    user_id, 
    COUNT(*) as total_rewards,
    SUM(xp_amount) as total_xp_from_rewards,
    SUM(coin_amount) as total_coins_from_rewards
  FROM reward_history 
  GROUP BY user_id
) rh ON u.id = rh.user_id
LEFT JOIN (
  SELECT 
    user_id, 
    COUNT(*) as total_levelups,
    MAX(new_level) as highest_level
  FROM level_history 
  GROUP BY user_id
) lh ON u.id = lh.user_id
LEFT JOIN (
  SELECT 
    user_id, 
    COUNT(*) as badge_count
  FROM user_badges 
  GROUP BY user_id
) ub ON u.id = ub.user_id;

-- 일일 보상 통계 뷰
CREATE OR REPLACE VIEW daily_reward_stats AS
SELECT 
  DATE(created_at) as reward_date,
  COUNT(*) as total_rewards,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(xp_amount) as total_xp_given,
  SUM(coin_amount) as total_coins_given,
  AVG(xp_amount) as avg_xp_per_reward,
  AVG(coin_amount) as avg_coins_per_reward,
  reward_type,
  COUNT(*) as rewards_by_type
FROM reward_history
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), reward_type
ORDER BY reward_date DESC, reward_type;