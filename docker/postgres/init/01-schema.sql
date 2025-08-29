-- BookCraft 데이터베이스 스키마
-- PostgreSQL 전용 스키마

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 가족 테이블 (먼저 생성)
CREATE TABLE IF NOT EXISTS public.families (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_by UUID, -- 외래키는 나중에 추가
    description TEXT,
    max_members INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK (role IN ('child', 'parent')),
    family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
    birth_date DATE,
    reading_level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    total_coins INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 외래키 추가 (사용자 테이블 생성 후)
ALTER TABLE public.families ADD CONSTRAINT fk_families_created_by 
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

-- 책 테이블
CREATE TABLE IF NOT EXISTS public.books (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    cover_image_url TEXT,
    description TEXT,
    page_count INTEGER,
    publisher TEXT,
    published_date DATE,
    genre TEXT,
    age_rating TEXT,
    language TEXT DEFAULT 'ko',
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 퀘스트 테이블
CREATE TABLE IF NOT EXISTS public.quests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('reading', 'summary', 'review', 'timer', 'challenge')),
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    xp_reward INTEGER NOT NULL DEFAULT 0,
    coin_reward INTEGER NOT NULL DEFAULT 0,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    progress INTEGER DEFAULT 0,
    target_value INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 보상 아이템 테이블
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('xp', 'coin', 'badge', 'sticker', 'avatar_item')),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    value INTEGER NOT NULL DEFAULT 0,
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 보상 테이블
CREATE TABLE IF NOT EXISTS public.user_rewards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
    UNIQUE(user_id, reward_id)
);

-- 독서 세션 테이블
CREATE TABLE IF NOT EXISTS public.reading_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    focus_score INTEGER CHECK (focus_score BETWEEN 0 AND 100),
    pages_read INTEGER DEFAULT 0,
    summary TEXT,
    ai_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 챌린지 테이블
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('individual', 'family')),
    goal_type TEXT NOT NULL CHECK (goal_type IN ('books_read', 'pages_read', 'time_spent', 'quests_completed')),
    goal_value INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    reward_xp INTEGER DEFAULT 0,
    reward_coins INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 챌린지 참여 테이블
CREATE TABLE IF NOT EXISTS public.challenge_participations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    current_progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(challenge_id, user_id)
);

-- 배지 테이블
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT NOT NULL,
    condition_type TEXT NOT NULL CHECK (condition_type IN ('books_read', 'days_streak', 'quests_completed', 'special')),
    condition_value INTEGER,
    rarity TEXT NOT NULL DEFAULT 'bronze' CHECK (rarity IN ('bronze', 'silver', 'gold', 'platinum')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 배지 테이블
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress INTEGER DEFAULT 0,
    UNIQUE(user_id, badge_id)
);

-- 주간 리포트 테이블
CREATE TABLE IF NOT EXISTS public.weekly_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    books_read INTEGER DEFAULT 0,
    pages_read INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    quests_completed INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    badges_earned INTEGER DEFAULT 0,
    highlights JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- 아바타 커스터마이징 테이블
CREATE TABLE IF NOT EXISTS public.avatar_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('hair', 'face', 'clothing', 'accessory', 'background')),
    image_url TEXT NOT NULL,
    unlock_condition TEXT,
    unlock_value INTEGER,
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 아바타 아이템 테이블
CREATE TABLE IF NOT EXISTS public.user_avatar_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    avatar_item_id UUID REFERENCES public.avatar_items(id) ON DELETE CASCADE NOT NULL,
    is_equipped BOOLEAN DEFAULT FALSE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, avatar_item_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_family_id ON public.users(family_id);
CREATE INDEX IF NOT EXISTS idx_books_user_id ON public.books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON public.books(isbn);
CREATE INDEX IF NOT EXISTS idx_quests_user_id ON public.quests(user_id);
CREATE INDEX IF NOT EXISTS idx_quests_status ON public.quests(status);
CREATE INDEX IF NOT EXISTS idx_quests_book_id ON public.quests(book_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_id ON public.reading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_id ON public.reading_sessions(book_id);
CREATE INDEX IF NOT EXISTS idx_challenges_family_id ON public.challenges(family_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participations_user_id ON public.challenge_participations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON public.user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_id ON public.weekly_reports(user_id);

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_families_updated_at BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quests_updated_at BEFORE UPDATE ON public.quests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PostgreSQL에서는 애플리케이션 레벨에서 권한 관리
-- RLS 대신 애플리케이션에서 사용자 권한 체크

-- 기본 데이터 삽입

-- 기본 보상 아이템
INSERT INTO public.rewards (type, name, description, value, rarity) VALUES
('xp', '기본 XP', '퀘스트 완료 시 획득하는 기본 경험치', 10, 'common'),
('coin', '기본 코인', '퀘스트 완료 시 획득하는 기본 코인', 5, 'common'),
('badge', '첫 책 등록', '첫 번째 책을 등록했을 때 획득하는 배지', 0, 'bronze'),
('badge', '독서왕', '10권의 책을 읽었을 때 획득하는 배지', 0, 'gold'),
('sticker', '별 스티커', '퀘스트 완료 시 획득할 수 있는 별 모양 스티커', 0, 'common')
ON CONFLICT DO NOTHING;

-- 기본 배지
INSERT INTO public.badges (name, description, icon_url, condition_type, condition_value, rarity) VALUES
('첫걸음', '첫 번째 책을 등록한 독서 초보자', '/badges/first-book.svg', 'books_read', 1, 'bronze'),
('책벌레', '5권의 책을 읽은 열정적인 독서가', '/badges/bookworm.svg', 'books_read', 5, 'silver'),
('독서왕', '10권의 책을 읽은 진정한 독서왕', '/badges/reading-king.svg', 'books_read', 10, 'gold'),
('꾸준함', '7일 연속 독서한 꾸준한 독서가', '/badges/consistency.svg', 'days_streak', 7, 'silver'),
('퀘스트 마스터', '50개의 퀘스트를 완료한 퀘스트 전문가', '/badges/quest-master.svg', 'quests_completed', 50, 'gold')
ON CONFLICT DO NOTHING;

-- 기본 아바타 아이템
INSERT INTO public.avatar_items (name, category, image_url, is_default, rarity) VALUES
('기본 머리', 'hair', '/avatar/hair/default.svg', true, 'common'),
('기본 얼굴', 'face', '/avatar/face/default.svg', true, 'common'),
('기본 옷', 'clothing', '/avatar/clothing/default.svg', true, 'common'),
('기본 배경', 'background', '/avatar/background/default.svg', true, 'common')
ON CONFLICT DO NOTHING;