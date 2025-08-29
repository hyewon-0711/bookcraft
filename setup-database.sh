#!/bin/bash

# BookCraft PostgreSQL 데이터베이스 설정 스크립트
# Docker 컨테이너에 DDL 문 실행

set -e  # 오류 발생 시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 데이터베이스 연결 정보
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="gowthai"
DB_USER="hyewon87"
DB_PASSWORD="lg20995192"
CONTAINER_NAME="postgres_local"

echo -e "${BLUE}=== BookCraft 데이터베이스 설정 시작 ===${NC}"

# 1. Docker 컨테이너 상태 확인
echo -e "${YELLOW}1. Docker 컨테이너 상태 확인 중...${NC}"
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo -e "${RED}❌ PostgreSQL 컨테이너가 실행되지 않았습니다.${NC}"
    echo -e "${YELLOW}컨테이너를 시작하려면 다음 명령어를 실행하세요:${NC}"
    echo "./start-postgres.sh"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL 컨테이너가 실행 중입니다.${NC}"

# 2. 데이터베이스 연결 테스트
echo -e "${YELLOW}2. 데이터베이스 연결 테스트 중...${NC}"
if ! docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
    echo -e "${RED}❌ 데이터베이스 연결에 실패했습니다.${NC}"
    echo "컨테이너가 완전히 시작될 때까지 잠시 기다려주세요."
    exit 1
fi
echo -e "${GREEN}✅ 데이터베이스 연결 성공${NC}"

# 3. 기존 테이블 확인 및 백업
echo -e "${YELLOW}3. 기존 데이터 확인 중...${NC}"
TABLE_COUNT=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$TABLE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  기존 테이블이 $TABLE_COUNT 개 발견되었습니다.${NC}"
    read -p "기존 데이터를 삭제하고 새로 설치하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}기존 데이터를 백업 중...${NC}"
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > "$BACKUP_FILE"
        echo -e "${GREEN}✅ 백업 완료: $BACKUP_FILE${NC}"
        
        echo -e "${YELLOW}기존 스키마 삭제 중...${NC}"
        docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        echo -e "${GREEN}✅ 기존 스키마 삭제 완료${NC}"
    else
        echo -e "${YELLOW}설치를 취소합니다.${NC}"
        exit 0
    fi
fi

# 4. UUID 확장 설치
echo -e "${YELLOW}4. UUID 확장 설치 중...${NC}"
docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
echo -e "${GREEN}✅ UUID 확장 설치 완료${NC}"

# 5. 스키마 적용
echo -e "${YELLOW}5. 데이터베이스 스키마 적용 중...${NC}"
if [ -f "docker/postgres/init/01-schema.sql" ]; then
    docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < docker/postgres/init/01-schema.sql
    echo -e "${GREEN}✅ 스키마 적용 완료${NC}"
else
    echo -e "${RED}❌ 스키마 파일을 찾을 수 없습니다: docker/postgres/init/01-schema.sql${NC}"
    exit 1
fi

# 6. 함수 적용
echo -e "${YELLOW}6. 데이터베이스 함수 적용 중...${NC}"
if [ -f "docker/postgres/init/02-functions.sql" ]; then
    docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < docker/postgres/init/02-functions.sql
    echo -e "${GREEN}✅ 함수 적용 완료${NC}"
else
    echo -e "${YELLOW}⚠️  함수 파일을 찾을 수 없습니다: docker/postgres/init/02-functions.sql${NC}"
fi

# 7. 기본 데이터 삽입
echo -e "${YELLOW}7. 기본 데이터 삽입 중...${NC}"
cat << 'EOF' | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
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
EOF

echo -e "${GREEN}✅ 기본 데이터 삽입 완료${NC}"

# 8. 테이블 생성 확인
echo -e "${YELLOW}8. 테이블 생성 확인 중...${NC}"
TABLE_LIST=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")
TABLE_COUNT=$(echo "$TABLE_LIST" | wc -l | tr -d ' ')

echo -e "${GREEN}✅ 생성된 테이블 ($TABLE_COUNT 개):${NC}"
echo "$TABLE_LIST" | sed 's/^/ - /'

# 9. 함수 생성 확인
echo -e "${YELLOW}9. 함수 생성 확인 중...${NC}"
FUNCTION_LIST=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') ORDER BY proname;" 2>/dev/null || echo "")

if [ -n "$FUNCTION_LIST" ]; then
    FUNCTION_COUNT=$(echo "$FUNCTION_LIST" | wc -l | tr -d ' ')
    echo -e "${GREEN}✅ 생성된 함수 ($FUNCTION_COUNT 개):${NC}"
    echo "$FUNCTION_LIST" | sed 's/^/ - /'
else
    echo -e "${YELLOW}⚠️  생성된 함수가 없습니다.${NC}"
fi

# 10. 연결 정보 출력
echo -e "${BLUE}=== 데이터베이스 설정 완료 ===${NC}"
echo -e "${GREEN}✅ BookCraft 데이터베이스가 성공적으로 설정되었습니다!${NC}"
echo ""
echo -e "${BLUE}연결 정보:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""
echo -e "${BLUE}유용한 명령어:${NC}"
echo "  # 데이터베이스 접속"
echo "  docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME"
echo ""
echo "  # 테이블 목록 확인"
echo "  docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c '\\dt'"
echo ""
echo "  # 사용자 목록 확인"
echo "  docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c 'SELECT id, email, name, role FROM users;'"
echo ""
echo -e "${GREEN}이제 Next.js 개발 서버를 시작할 수 있습니다: npm run dev${NC}"