-- 퀘스트 상태값 및 유효기간 시스템 업데이트
-- 실행 날짜: 2024년

-- 1. 기존 quests 테이블에 새로운 컬럼 추가
ALTER TABLE quests 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS quest_type VARCHAR(20) DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS grace_period_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP;

-- 2. 상태값 ENUM 타입 업데이트 (기존 status 컬럼 확장)
DO $$ 
BEGIN
    -- 기존 status 타입이 있는지 확인하고 새로운 값들 추가
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quest_status_new') THEN
        CREATE TYPE quest_status_new AS ENUM (
            'pending',
            'active', 
            'paused',
            'completed',
            'failed',
            'expired',
            'locked',
            'ready_to_claim',
            'legendary',
            'streak'
        );
    END IF;
END $$;

-- 3. 기존 status 컬럼을 새로운 타입으로 변경
ALTER TABLE quests 
ALTER COLUMN status TYPE quest_status_new 
USING (
    CASE 
        WHEN status = 'in_progress' THEN 'active'::quest_status_new
        WHEN status = 'completed' THEN 'completed'::quest_status_new
        WHEN status = 'failed' THEN 'failed'::quest_status_new
        ELSE 'pending'::quest_status_new
    END
);

-- 4. 퀘스트 타입 ENUM 생성
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quest_type_enum') THEN
        CREATE TYPE quest_type_enum AS ENUM (
            'daily',
            'weekly',
            'monthly',
            'event',
            'adaptive',
            'streak'
        );
    END IF;
END $$;

-- 5. quest_type 컬럼을 ENUM 타입으로 변경
ALTER TABLE quests 
ALTER COLUMN quest_type TYPE quest_type_enum 
USING quest_type::quest_type_enum;

-- 6. 퀘스트 메타데이터 테이블 생성
CREATE TABLE IF NOT EXISTS quest_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    renewal_pattern JSONB, -- {"interval": "daily", "time": "00:00", "dayOfWeek": 1}
    expiry_notifications JSONB, -- 알림 설정
    streak_count INTEGER DEFAULT 0,
    bonus_multiplier DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 퀘스트 상태 변경 이력 테이블 생성
CREATE TABLE IF NOT EXISTS quest_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
    from_status quest_status_new,
    to_status quest_status_new,
    changed_by UUID REFERENCES users(id),
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_quests_expires_at ON quests(expires_at);
CREATE INDEX IF NOT EXISTS idx_quests_status_type ON quests(status, quest_type);
CREATE INDEX IF NOT EXISTS idx_quests_user_status ON quests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quests_auto_renew ON quests(auto_renew, expires_at) WHERE auto_renew = true;
CREATE INDEX IF NOT EXISTS idx_quest_metadata_quest_id ON quest_metadata(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_status_history_quest_id ON quest_status_history(quest_id);

-- 9. 기존 데이터 마이그레이션
-- 기존 퀘스트들에 대해 기본 만료 시간 설정 (일일 퀘스트는 다음날 자정)
UPDATE quests 
SET 
    expires_at = DATE_TRUNC('day', created_at) + INTERVAL '1 day',
    quest_type = 'daily',
    auto_renew = true
WHERE expires_at IS NULL;

-- 10. 트리거 함수 생성 - 상태 변경 시 이력 기록
CREATE OR REPLACE FUNCTION log_quest_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO quest_status_history (
            quest_id, 
            from_status, 
            to_status, 
            changed_by, 
            reason,
            metadata
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.user_id,
            'Status changed',
            jsonb_build_object(
                'progress', NEW.progress,
                'target_value', NEW.target_value,
                'timestamp', CURRENT_TIMESTAMP
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. 트리거 생성
DROP TRIGGER IF EXISTS quest_status_change_trigger ON quests;
CREATE TRIGGER quest_status_change_trigger
    AFTER UPDATE ON quests
    FOR EACH ROW
    EXECUTE FUNCTION log_quest_status_change();

-- 12. 만료된 퀘스트 처리 함수
CREATE OR REPLACE FUNCTION handle_expired_quests()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
    quest_record RECORD;
BEGIN
    -- 만료된 퀘스트 찾기
    FOR quest_record IN 
        SELECT id, user_id, quest_type, auto_renew
        FROM quests 
        WHERE expires_at < CURRENT_TIMESTAMP 
        AND status NOT IN ('completed', 'expired', 'failed')
    LOOP
        -- 자동 갱신 퀘스트 처리
        IF quest_record.auto_renew AND quest_record.quest_type = 'daily' THEN
            -- 새로운 일일 퀘스트 생성 로직은 별도 함수에서 처리
            UPDATE quests 
            SET status = 'expired'
            WHERE id = quest_record.id;
        ELSE
            -- 일반 만료 처리
            UPDATE quests 
            SET 
                status = 'expired',
                failed_at = CURRENT_TIMESTAMP
            WHERE id = quest_record.id;
        END IF;
        
        expired_count := expired_count + 1;
    END LOOP;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- 13. 퀘스트 상태 전환 함수
CREATE OR REPLACE FUNCTION transition_quest_status(
    p_quest_id UUID,
    p_new_status quest_status_new,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_status quest_status_new;
    is_valid_transition BOOLEAN := false;
BEGIN
    -- 현재 상태 조회
    SELECT status INTO current_status 
    FROM quests 
    WHERE id = p_quest_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- 유효한 상태 전환인지 확인
    is_valid_transition := CASE
        WHEN current_status = 'pending' AND p_new_status IN ('active', 'locked') THEN true
        WHEN current_status = 'active' AND p_new_status IN ('paused', 'completed', 'failed') THEN true
        WHEN current_status = 'paused' AND p_new_status IN ('active', 'failed') THEN true
        WHEN current_status = 'completed' AND p_new_status = 'ready_to_claim' THEN true
        WHEN current_status = 'ready_to_claim' AND p_new_status = 'completed' THEN true
        WHEN current_status = 'failed' AND p_new_status = 'pending' THEN true
        WHEN current_status = 'expired' AND p_new_status = 'pending' THEN true
        ELSE false
    END;
    
    IF NOT is_valid_transition THEN
        RETURN false;
    END IF;
    
    -- 상태 업데이트
    UPDATE quests 
    SET 
        status = p_new_status,
        started_at = CASE WHEN p_new_status = 'active' THEN CURRENT_TIMESTAMP ELSE started_at END,
        paused_at = CASE WHEN p_new_status = 'paused' THEN CURRENT_TIMESTAMP ELSE paused_at END,
        failed_at = CASE WHEN p_new_status = 'failed' THEN CURRENT_TIMESTAMP ELSE failed_at END,
        claimed_at = CASE WHEN p_new_status = 'completed' AND current_status = 'ready_to_claim' THEN CURRENT_TIMESTAMP ELSE claimed_at END,
        completed_at = CASE WHEN p_new_status = 'completed' AND current_status != 'ready_to_claim' THEN CURRENT_TIMESTAMP ELSE completed_at END
    WHERE id = p_quest_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 14. 사용자별 퀘스트 통계 뷰 업데이트
CREATE OR REPLACE VIEW user_quest_stats AS
SELECT 
    u.id as user_id,
    u.name,
    COUNT(q.id) as total_quests,
    COUNT(CASE WHEN q.status = 'completed' THEN 1 END) as completed_quests,
    COUNT(CASE WHEN q.status = 'active' THEN 1 END) as active_quests,
    COUNT(CASE WHEN q.status = 'pending' THEN 1 END) as pending_quests,
    COUNT(CASE WHEN q.status = 'failed' THEN 1 END) as failed_quests,
    COUNT(CASE WHEN q.status = 'expired' THEN 1 END) as expired_quests,
    ROUND(AVG(CASE WHEN q.status = 'completed' THEN (q.progress::DECIMAL / q.target_value) * 100 END), 2) as avg_completion_rate,
    MAX(qm.streak_count) as max_streak
FROM users u
LEFT JOIN quests q ON u.id = q.user_id
LEFT JOIN quest_metadata qm ON q.id = qm.quest_id
GROUP BY u.id, u.name;

-- 15. 권한 설정 (RLS)
ALTER TABLE quest_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_status_history ENABLE ROW LEVEL SECURITY;

-- quest_metadata RLS 정책
CREATE POLICY "Users can view their own quest metadata" ON quest_metadata
    FOR SELECT USING (
        quest_id IN (SELECT id FROM quests WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their own quest metadata" ON quest_metadata
    FOR ALL USING (
        quest_id IN (SELECT id FROM quests WHERE user_id = auth.uid())
    );

-- quest_status_history RLS 정책
CREATE POLICY "Users can view their own quest history" ON quest_status_history
    FOR SELECT USING (
        quest_id IN (SELECT id FROM quests WHERE user_id = auth.uid())
    );

-- 16. 기본 퀘스트 메타데이터 생성
INSERT INTO quest_metadata (quest_id, renewal_pattern, expiry_notifications)
SELECT 
    id,
    jsonb_build_object(
        'interval', quest_type,
        'time', '00:00',
        'dayOfWeek', 1
    ),
    jsonb_build_object(
        '24h_before', true,
        '6h_before', true,
        '1h_before', true,
        '15m_before', true
    )
FROM quests 
WHERE id NOT IN (SELECT quest_id FROM quest_metadata WHERE quest_id IS NOT NULL);

-- 완료 메시지
SELECT 'Quest schema update completed successfully!' as message;