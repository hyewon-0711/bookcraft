--
-- PostgreSQL database dump
--

\restrict rGhIJEtdVQGF0tQMD0P8lAzGaqxvBOlyttvXzavKOf1mGRGlYPTMu4xwTUNh06b

-- Dumped from database version 16.10 (Debian 16.10-1.pgdg13+1)
-- Dumped by pg_dump version 16.10 (Debian 16.10-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: check_and_award_badges(uuid); Type: FUNCTION; Schema: public; Owner: hyewon87
--

CREATE FUNCTION public.check_and_award_badges(user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    badge_record RECORD;
    user_progress INTEGER;
BEGIN
    -- 모든 활성 배지에 대해 조건 확인
    FOR badge_record IN 
        SELECT * FROM public.badges 
        WHERE is_active = true 
        AND id NOT IN (SELECT badge_id FROM public.user_badges WHERE user_badges.user_id = check_and_award_badges.user_id)
    LOOP
        user_progress := 0;
        
        -- 배지 조건에 따른 진행도 계산
        CASE badge_record.condition_type
            WHEN 'books_read' THEN
                SELECT COUNT(DISTINCT book_id) INTO user_progress
                FROM public.reading_sessions
                WHERE reading_sessions.user_id = check_and_award_badges.user_id;
                
            WHEN 'days_streak' THEN
                SELECT current_streak INTO user_progress
                FROM public.users
                WHERE id = check_and_award_badges.user_id;
                
            WHEN 'quests_completed' THEN
                SELECT COUNT(*) INTO user_progress
                FROM public.quests
                WHERE quests.user_id = check_and_award_badges.user_id AND status = 'completed';
        END CASE;
        
        -- 조건 달성 시 배지 지급
        IF user_progress >= badge_record.condition_value THEN
            INSERT INTO public.user_badges (user_id, badge_id, progress)
            VALUES (user_id, badge_record.id, user_progress)
            ON CONFLICT (user_id, badge_id) DO NOTHING;
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION public.check_and_award_badges(user_id uuid) OWNER TO hyewon87;

--
-- Name: complete_quest(uuid, uuid); Type: FUNCTION; Schema: public; Owner: hyewon87
--

CREATE FUNCTION public.complete_quest(quest_id uuid, user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    quest_record RECORD;
    xp_reward INTEGER;
    coin_reward INTEGER;
BEGIN
    -- 퀘스트 정보 조회
    SELECT * INTO quest_record
    FROM public.quests
    WHERE id = quest_id AND quests.user_id = complete_quest.user_id AND status = 'in_progress';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- 퀘스트 완료 상태로 업데이트
    UPDATE public.quests
    SET status = 'completed', completed_at = NOW()
    WHERE id = quest_id;
    
    -- 사용자에게 XP와 코인 지급
    UPDATE public.users
    SET 
        total_xp = total_xp + quest_record.xp_reward,
        total_coins = total_coins + quest_record.coin_reward
    WHERE id = user_id;
    
    -- 보상 기록 추가
    INSERT INTO public.user_rewards (user_id, reward_id, quest_id, earned_at)
    SELECT 
        user_id,
        r.id,
        quest_id,
        NOW()
    FROM public.rewards r
    WHERE r.type IN ('xp', 'coin') AND r.value <= quest_record.xp_reward;
    
    -- 배지 조건 확인 및 지급
    PERFORM check_and_award_badges(user_id);
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION public.complete_quest(quest_id uuid, user_id uuid) OWNER TO hyewon87;

--
-- Name: generate_daily_quests(uuid); Type: FUNCTION; Schema: public; Owner: hyewon87
--

CREATE FUNCTION public.generate_daily_quests(user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    user_level INTEGER;
    user_books_count INTEGER;
    quest_difficulty INTEGER;
BEGIN
    -- 사용자 레벨 조회
    SELECT FLOOR(total_xp / 100) + 1 INTO user_level
    FROM public.users WHERE id = user_id;
    
    -- 사용자가 등록한 책 수 조회
    SELECT COUNT(*) INTO user_books_count
    FROM public.books WHERE books.user_id = generate_daily_quests.user_id;
    
    -- 사용자 레벨에 따른 퀘스트 난이도 설정
    quest_difficulty := LEAST(user_level, 5);
    
    -- 오늘 날짜의 퀘스트가 이미 있는지 확인
    IF NOT EXISTS (
        SELECT 1 FROM public.quests 
        WHERE quests.user_id = generate_daily_quests.user_id 
        AND DATE(created_at) = CURRENT_DATE
    ) THEN
        -- 기본 독서 퀘스트
        INSERT INTO public.quests (title, description, type, difficulty, xp_reward, coin_reward, user_id, target_value)
        VALUES (
            '오늘의 독서',
            '20분 동안 집중해서 책을 읽어보세요!',
            'timer',
            quest_difficulty,
            quest_difficulty * 10,
            quest_difficulty * 5,
            user_id,
            20
        );
        
        -- 책이 있는 경우에만 요약 퀘스트 생성
        IF user_books_count > 0 THEN
            INSERT INTO public.quests (title, description, type, difficulty, xp_reward, coin_reward, user_id, target_value)
            VALUES (
                '3문장 요약',
                '읽은 내용을 3문장으로 요약해보세요!',
                'summary',
                quest_difficulty,
                quest_difficulty * 15,
                quest_difficulty * 7,
                user_id,
                3
            );
        END IF;
        
        -- 주간 챌린지 퀘스트 (주말에만)
        IF EXTRACT(DOW FROM CURRENT_DATE) IN (0, 6) THEN
            INSERT INTO public.quests (title, description, type, difficulty, xp_reward, coin_reward, user_id, target_value)
            VALUES (
                '주말 특별 챌린지',
                '주말에는 평소보다 더 많이 읽어보세요!',
                'challenge',
                quest_difficulty + 1,
                quest_difficulty * 25,
                quest_difficulty * 12,
                user_id,
                2
            );
        END IF;
    END IF;
END;
$$;


ALTER FUNCTION public.generate_daily_quests(user_id uuid) OWNER TO hyewon87;

--
-- Name: generate_weekly_report(uuid, date); Type: FUNCTION; Schema: public; Owner: hyewon87
--

CREATE FUNCTION public.generate_weekly_report(user_id uuid, week_start date) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    report_id UUID;
    week_end DATE;
    books_read INTEGER;
    pages_read INTEGER;
    time_spent INTEGER;
    quests_completed INTEGER;
    xp_earned INTEGER;
    coins_earned INTEGER;
    badges_earned INTEGER;
    highlights JSONB;
BEGIN
    week_end := week_start + INTERVAL '6 days';
    
    -- 주간 통계 계산
    SELECT 
        COUNT(DISTINCT rs.book_id),
        COALESCE(SUM(rs.pages_read), 0),
        COALESCE(SUM(rs.duration_minutes), 0)
    INTO books_read, pages_read, time_spent
    FROM public.reading_sessions rs
    WHERE rs.user_id = generate_weekly_report.user_id
    AND DATE(rs.start_time) BETWEEN week_start AND week_end;
    
    -- 완료한 퀘스트 수
    SELECT COUNT(*) INTO quests_completed
    FROM public.quests q
    WHERE q.user_id = generate_weekly_report.user_id
    AND q.status = 'completed'
    AND DATE(q.completed_at) BETWEEN week_start AND week_end;
    
    -- 획득한 XP와 코인
    SELECT 
        COALESCE(SUM(q.xp_reward), 0),
        COALESCE(SUM(q.coin_reward), 0)
    INTO xp_earned, coins_earned
    FROM public.quests q
    WHERE q.user_id = generate_weekly_report.user_id
    AND q.status = 'completed'
    AND DATE(q.completed_at) BETWEEN week_start AND week_end;
    
    -- 획득한 배지 수
    SELECT COUNT(*) INTO badges_earned
    FROM public.user_badges ub
    WHERE ub.user_id = generate_weekly_report.user_id
    AND DATE(ub.earned_at) BETWEEN week_start AND week_end;
    
    -- 하이라이트 생성
    highlights := jsonb_build_array(
        CASE WHEN books_read > 0 THEN format('%s권의 책을 읽었어요!', books_read) ELSE NULL END,
        CASE WHEN time_spent >= 60 THEN format('%s시간 동안 독서했어요!', ROUND(time_spent / 60.0, 1)) ELSE NULL END,
        CASE WHEN quests_completed >= 5 THEN format('%s개의 퀘스트를 완료했어요!', quests_completed) ELSE NULL END,
        CASE WHEN badges_earned > 0 THEN format('%s개의 새로운 배지를 획득했어요!', badges_earned) ELSE NULL END
    );
    
    -- NULL 값 제거
    highlights := (SELECT jsonb_agg(value) FROM jsonb_array_elements(highlights) WHERE value IS NOT NULL);
    
    -- 리포트 생성
    INSERT INTO public.weekly_reports (
        user_id, week_start, week_end, books_read, pages_read, time_spent_minutes,
        quests_completed, xp_earned, coins_earned, badges_earned, highlights
    ) VALUES (
        user_id, week_start, week_end, books_read, pages_read, time_spent,
        quests_completed, xp_earned, coins_earned, badges_earned, highlights
    ) RETURNING id INTO report_id;
    
    RETURN report_id;
END;
$$;


ALTER FUNCTION public.generate_weekly_report(user_id uuid, week_start date) OWNER TO hyewon87;

--
-- Name: get_book_recommendations(uuid, integer); Type: FUNCTION; Schema: public; Owner: hyewon87
--

CREATE FUNCTION public.get_book_recommendations(user_id uuid, limit_count integer DEFAULT 5) RETURNS TABLE(book_id uuid, title text, author text, cover_image_url text, genre text, recommendation_score numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    WITH user_books AS (
        -- 사용자가 읽은 책들
        SELECT DISTINCT b.id, b.genre
        FROM public.books b
        JOIN public.reading_sessions rs ON b.id = rs.book_id
        WHERE rs.user_id = get_book_recommendations.user_id
    ),
    similar_users AS (
        -- 비슷한 책을 읽은 다른 사용자들
        SELECT DISTINCT rs.user_id, COUNT(*) as common_books
        FROM public.reading_sessions rs
        JOIN user_books ub ON rs.book_id = ub.id
        WHERE rs.user_id != get_book_recommendations.user_id
        GROUP BY rs.user_id
        HAVING COUNT(*) >= 1
        ORDER BY common_books DESC
        LIMIT 10
    ),
    recommended_books AS (
        -- 비슷한 사용자들이 읽은 책 중 현재 사용자가 읽지 않은 책
        SELECT 
            b.id,
            b.title,
            b.author,
            b.cover_image_url,
            b.genre,
            COUNT(*) as recommendation_count,
            AVG(rs.focus_score) as avg_focus_score
        FROM public.books b
        JOIN public.reading_sessions rs ON b.id = rs.book_id
        JOIN similar_users su ON rs.user_id = su.user_id
        WHERE b.id NOT IN (SELECT id FROM user_books)
        AND b.is_public = true
        GROUP BY b.id, b.title, b.author, b.cover_image_url, b.genre
    )
    SELECT 
        rb.id,
        rb.title,
        rb.author,
        rb.cover_image_url,
        rb.genre,
        (rb.recommendation_count * 0.7 + COALESCE(rb.avg_focus_score, 50) * 0.3 / 100) as score
    FROM recommended_books rb
    ORDER BY score DESC
    LIMIT limit_count;
END;
$$;


ALTER FUNCTION public.get_book_recommendations(user_id uuid, limit_count integer) OWNER TO hyewon87;

--
-- Name: get_family_ranking(uuid, text); Type: FUNCTION; Schema: public; Owner: hyewon87
--

CREATE FUNCTION public.get_family_ranking(family_id uuid, period text DEFAULT 'week'::text) RETURNS TABLE(user_id uuid, user_name text, avatar_url text, total_xp integer, books_read integer, time_spent integer, rank integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    start_date DATE;
BEGIN
    -- 기간에 따른 시작 날짜 설정
    CASE period
        WHEN 'week' THEN
            start_date := DATE_TRUNC('week', CURRENT_DATE);
        WHEN 'month' THEN
            start_date := DATE_TRUNC('month', CURRENT_DATE);
        ELSE
            start_date := '1900-01-01';
    END CASE;
    
    RETURN QUERY
    WITH family_stats AS (
        SELECT 
            u.id,
            u.name,
            u.avatar_url,
            u.total_xp,
            COUNT(DISTINCT rs.book_id) as books_read,
            COALESCE(SUM(rs.duration_minutes), 0) as time_spent
        FROM public.users u
        LEFT JOIN public.reading_sessions rs ON u.id = rs.user_id 
            AND DATE(rs.start_time) >= start_date
        WHERE u.family_id = get_family_ranking.family_id
        GROUP BY u.id, u.name, u.avatar_url, u.total_xp
    )
    SELECT 
        fs.id,
        fs.name,
        fs.avatar_url,
        fs.total_xp,
        fs.books_read::INTEGER,
        fs.time_spent::INTEGER,
        ROW_NUMBER() OVER (ORDER BY fs.total_xp DESC, fs.books_read DESC, fs.time_spent DESC)::INTEGER
    FROM family_stats fs
    ORDER BY fs.total_xp DESC, fs.books_read DESC, fs.time_spent DESC;
END;
$$;


ALTER FUNCTION public.get_family_ranking(family_id uuid, period text) OWNER TO hyewon87;

--
-- Name: get_user_reading_stats(uuid); Type: FUNCTION; Schema: public; Owner: hyewon87
--

CREATE FUNCTION public.get_user_reading_stats(user_id uuid) RETURNS TABLE(total_books integer, total_pages integer, total_time_minutes integer, current_streak integer, longest_streak integer, total_xp integer, total_coins integer, level integer, badges_count integer, quests_completed integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- 총 읽은 책 수
        (SELECT COUNT(DISTINCT book_id) FROM public.reading_sessions WHERE reading_sessions.user_id = get_user_reading_stats.user_id)::INTEGER,
        -- 총 읽은 페이지 수
        (SELECT COALESCE(SUM(pages_read), 0) FROM public.reading_sessions WHERE reading_sessions.user_id = get_user_reading_stats.user_id)::INTEGER,
        -- 총 독서 시간 (분)
        (SELECT COALESCE(SUM(duration_minutes), 0) FROM public.reading_sessions WHERE reading_sessions.user_id = get_user_reading_stats.user_id)::INTEGER,
        -- 현재 연속 독서 일수
        u.current_streak,
        -- 최장 연속 독서 일수
        u.longest_streak,
        -- 총 XP
        u.total_xp,
        -- 총 코인
        u.total_coins,
        -- 레벨 (XP 기반 계산)
        (FLOOR(u.total_xp / 100) + 1)::INTEGER,
        -- 획득한 배지 수
        (SELECT COUNT(*) FROM public.user_badges WHERE user_badges.user_id = get_user_reading_stats.user_id)::INTEGER,
        -- 완료한 퀘스트 수
        (SELECT COUNT(*) FROM public.quests WHERE quests.user_id = get_user_reading_stats.user_id AND status = 'completed')::INTEGER
    FROM public.users u
    WHERE u.id = get_user_reading_stats.user_id;
END;
$$;


ALTER FUNCTION public.get_user_reading_stats(user_id uuid) OWNER TO hyewon87;

--
-- Name: update_reading_streak(uuid); Type: FUNCTION; Schema: public; Owner: hyewon87
--

CREATE FUNCTION public.update_reading_streak(user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    last_reading_date DATE;
    current_streak INTEGER;
    longest_streak INTEGER;
BEGIN
    -- 마지막 독서 날짜 조회
    SELECT DATE(MAX(start_time)) INTO last_reading_date
    FROM public.reading_sessions
    WHERE reading_sessions.user_id = update_reading_streak.user_id;
    
    -- 현재 연속 일수 조회
    SELECT users.current_streak, users.longest_streak INTO current_streak, longest_streak
    FROM public.users
    WHERE id = user_id;
    
    -- 오늘 독서했는지 확인
    IF last_reading_date = CURRENT_DATE THEN
        -- 어제도 독서했다면 연속 일수 증가
        IF last_reading_date - INTERVAL '1 day' = (SELECT DATE(MAX(start_time)) 
                                                   FROM public.reading_sessions 
                                                   WHERE reading_sessions.user_id = update_reading_streak.user_id 
                                                   AND DATE(start_time) < CURRENT_DATE) THEN
            current_streak := current_streak + 1;
        ELSE
            -- 첫 독서라면 연속 일수 1로 설정
            current_streak := 1;
        END IF;
    ELSE
        -- 오늘 독서하지 않았다면 연속 일수 초기화
        current_streak := 0;
    END IF;
    
    -- 최장 연속 일수 업데이트
    IF current_streak > longest_streak THEN
        longest_streak := current_streak;
    END IF;
    
    -- 사용자 정보 업데이트
    UPDATE public.users
    SET 
        current_streak = current_streak,
        longest_streak = longest_streak
    WHERE id = user_id;
END;
$$;


ALTER FUNCTION public.update_reading_streak(user_id uuid) OWNER TO hyewon87;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: hyewon87
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO hyewon87;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: avatar_items; Type: TABLE; Schema: public; Owner: hyewon87
--

CREATE TABLE public.avatar_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    image_url text NOT NULL,
    unlock_condition text,
    unlock_value integer,
    rarity text DEFAULT 'common'::text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT avatar_items_category_check CHECK ((category = ANY (ARRAY['hair'::text, 'face'::text, 'clothing'::text, 'accessory'::text, 'background'::text]))),
    CONSTRAINT avatar_items_rarity_check CHECK ((rarity = ANY (ARRAY['common'::text, 'rare'::text, 'epic'::text, 'legendary'::text])))
);


ALTER TABLE public.avatar_items OWNER TO hyewon87;

--
-- Name: badges; Type: TABLE; Schema: public; Owner: hyewon87
--

CREATE TABLE public.badges (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon_url text NOT NULL,
    condition_type text NOT NULL,
    condition_value integer,
    rarity text DEFAULT 'bronze'::text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT badges_condition_type_check CHECK ((condition_type = ANY (ARRAY['books_read'::text, 'days_streak'::text, 'quests_completed'::text, 'special'::text]))),
    CONSTRAINT badges_rarity_check CHECK ((rarity = ANY (ARRAY['bronze'::text, 'silver'::text, 'gold'::text, 'platinum'::text])))
);


ALTER TABLE public.badges OWNER TO hyewon87;

--
-- Name: rewards; Type: TABLE; Schema: public; Owner: hyewon87
--

CREATE TABLE public.rewards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    value integer DEFAULT 0 NOT NULL,
    rarity text DEFAULT 'common'::text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT rewards_rarity_check CHECK ((rarity = ANY (ARRAY['common'::text, 'rare'::text, 'epic'::text, 'legendary'::text]))),
    CONSTRAINT rewards_type_check CHECK ((type = ANY (ARRAY['xp'::text, 'coin'::text, 'badge'::text, 'sticker'::text, 'avatar_item'::text])))
);


ALTER TABLE public.rewards OWNER TO hyewon87;

--
-- Data for Name: avatar_items; Type: TABLE DATA; Schema: public; Owner: hyewon87
--

COPY public.avatar_items (id, name, category, image_url, unlock_condition, unlock_value, rarity, is_default, created_at) FROM stdin;
39725c9d-6a3b-473d-8497-5db9dc83ec49	기본 머리	hair	/avatar/hair/default.svg	\N	\N	common	t	2025-08-27 03:25:33.202501+00
7013adae-eda1-4839-ad01-02b2a7fd2603	기본 얼굴	face	/avatar/face/default.svg	\N	\N	common	t	2025-08-27 03:25:33.202501+00
477e4c3c-7dad-4067-91b9-20b07912d7e1	기본 옷	clothing	/avatar/clothing/default.svg	\N	\N	common	t	2025-08-27 03:25:33.202501+00
4e09cca2-7601-47f9-8a8c-f25a6ee092f8	기본 배경	background	/avatar/background/default.svg	\N	\N	common	t	2025-08-27 03:25:33.202501+00
4d2f8fb4-733e-438b-88a1-a5de3bbba155	기본 머리	hair	/avatar/hair/default.svg	\N	\N	common	t	2025-08-27 03:25:33.354749+00
db6c4a88-c861-4466-996c-64b45e46078d	기본 얼굴	face	/avatar/face/default.svg	\N	\N	common	t	2025-08-27 03:25:33.354749+00
5ca1055b-7ddc-452e-8e47-7c8ab193551e	기본 옷	clothing	/avatar/clothing/default.svg	\N	\N	common	t	2025-08-27 03:25:33.354749+00
7552c8bb-c534-4c30-ba27-d082f3e09cc2	기본 배경	background	/avatar/background/default.svg	\N	\N	common	t	2025-08-27 03:25:33.354749+00
\.


--
-- Data for Name: badges; Type: TABLE DATA; Schema: public; Owner: hyewon87
--

COPY public.badges (id, name, description, icon_url, condition_type, condition_value, rarity, is_active, created_at) FROM stdin;
b7b75c0c-1ce9-4673-8693-f8468c7783fe	첫걸음	첫 번째 책을 등록한 독서 초보자	/badges/first-book.svg	books_read	1	bronze	t	2025-08-27 03:25:33.201921+00
fe9c808b-a3c2-46bc-a6f4-0a955c01b5e1	책벌레	5권의 책을 읽은 열정적인 독서가	/badges/bookworm.svg	books_read	5	silver	t	2025-08-27 03:25:33.201921+00
7afa5dde-3fe5-4413-8a0c-4a14ec3daa9d	독서왕	10권의 책을 읽은 진정한 독서왕	/badges/reading-king.svg	books_read	10	gold	t	2025-08-27 03:25:33.201921+00
1c2ec92e-e4a8-41bc-bc9e-c7a400c17729	꾸준함	7일 연속 독서한 꾸준한 독서가	/badges/consistency.svg	days_streak	7	silver	t	2025-08-27 03:25:33.201921+00
4323e832-d251-4448-9e24-dacd8cc0e972	퀘스트 마스터	50개의 퀘스트를 완료한 퀘스트 전문가	/badges/quest-master.svg	quests_completed	50	gold	t	2025-08-27 03:25:33.201921+00
e6500b15-fe4e-42bb-87c6-7f5673f082b2	첫걸음	첫 번째 책을 등록한 독서 초보자	/badges/first-book.svg	books_read	1	bronze	t	2025-08-27 03:25:33.353394+00
6ec17870-f214-41b7-97f0-06099119a3be	책벌레	5권의 책을 읽은 열정적인 독서가	/badges/bookworm.svg	books_read	5	silver	t	2025-08-27 03:25:33.353394+00
5b2d878f-8d7b-40cd-a0d7-e94b143e3ff2	독서왕	10권의 책을 읽은 진정한 독서왕	/badges/reading-king.svg	books_read	10	gold	t	2025-08-27 03:25:33.353394+00
6d56aac4-9c16-413a-ae9b-0fbf1b257b38	꾸준함	7일 연속 독서한 꾸준한 독서가	/badges/consistency.svg	days_streak	7	silver	t	2025-08-27 03:25:33.353394+00
c4b82ea7-630d-4f4f-a610-c04a329410ab	퀘스트 마스터	50개의 퀘스트를 완료한 퀘스트 전문가	/badges/quest-master.svg	quests_completed	50	gold	t	2025-08-27 03:25:33.353394+00
\.


--
-- Data for Name: rewards; Type: TABLE DATA; Schema: public; Owner: hyewon87
--

COPY public.rewards (id, type, name, description, image_url, value, rarity, is_active, created_at) FROM stdin;
\.


--
-- Name: avatar_items avatar_items_pkey; Type: CONSTRAINT; Schema: public; Owner: hyewon87
--

ALTER TABLE ONLY public.avatar_items
    ADD CONSTRAINT avatar_items_pkey PRIMARY KEY (id);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: hyewon87
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (id);


--
-- Name: rewards rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: hyewon87
--

ALTER TABLE ONLY public.rewards
    ADD CONSTRAINT rewards_pkey PRIMARY KEY (id);


--
-- Name: badges All users can view badges; Type: POLICY; Schema: public; Owner: hyewon87
--

CREATE POLICY "All users can view badges" ON public.badges FOR SELECT USING (true);


--
-- Name: rewards All users can view rewards; Type: POLICY; Schema: public; Owner: hyewon87
--

CREATE POLICY "All users can view rewards" ON public.rewards FOR SELECT USING (true);


--
-- PostgreSQL database dump complete
--

\unrestrict rGhIJEtdVQGF0tQMD0P8lAzGaqxvBOlyttvXzavKOf1mGRGlYPTMu4xwTUNh06b

