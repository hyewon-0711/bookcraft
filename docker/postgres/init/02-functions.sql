-- BookCraft 데이터베이스 함수들
-- 이 파일은 비즈니스 로직을 처리하는 PostgreSQL 함수들을 정의합니다.

-- 사용자 독서 통계 조회 함수
CREATE OR REPLACE FUNCTION get_user_reading_stats(user_id UUID)
RETURNS TABLE (
    total_books INTEGER,
    total_pages INTEGER,
    total_time_minutes INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER,
    total_xp INTEGER,
    total_coins INTEGER,
    level INTEGER,
    badges_count INTEGER,
    quests_completed INTEGER
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 일일 퀘스트 생성 함수
CREATE OR REPLACE FUNCTION generate_daily_quests(user_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 퀘스트 완료 처리 함수
CREATE OR REPLACE FUNCTION complete_quest(quest_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 배지 조건 확인 및 지급 함수
CREATE OR REPLACE FUNCTION check_and_award_badges(user_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 연속 독서 일수 업데이트 함수
CREATE OR REPLACE FUNCTION update_reading_streak(user_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 가족 랭킹 조회 함수
CREATE OR REPLACE FUNCTION get_family_ranking(family_id UUID, period TEXT DEFAULT 'week')
RETURNS TABLE (
    user_id UUID,
    user_name TEXT,
    avatar_url TEXT,
    total_xp INTEGER,
    books_read INTEGER,
    time_spent INTEGER,
    rank INTEGER
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 주간 리포트 생성 함수
CREATE OR REPLACE FUNCTION generate_weekly_report(user_id UUID, week_start DATE)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 책 추천 함수 (기본적인 협업 필터링)
CREATE OR REPLACE FUNCTION get_book_recommendations(user_id UUID, limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
    book_id UUID,
    title TEXT,
    author TEXT,
    cover_image_url TEXT,
    genre TEXT,
    recommendation_score NUMERIC
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;