#!/bin/bash

# BookCraft 데이터베이스 유틸리티 스크립트
# 데이터베이스 관리를 위한 편의 기능들

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 데이터베이스 연결 정보
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="gowthai"
DB_USER="hyewon87"
DB_PASSWORD="lg20995192"
CONTAINER_NAME="postgres_local"

# 도움말 출력
show_help() {
    echo -e "${BLUE}BookCraft 데이터베이스 유틸리티${NC}"
    echo ""
    echo "사용법: $0 [명령어]"
    echo ""
    echo -e "${YELLOW}사용 가능한 명령어:${NC}"
    echo "  connect     - 데이터베이스에 접속"
    echo "  status      - 컨테이너 및 데이터베이스 상태 확인"
    echo "  tables      - 테이블 목록 조회"
    echo "  users       - 사용자 목록 조회"
    echo "  books       - 책 목록 조회"
    echo "  quests      - 퀘스트 목록 조회"
    echo "  backup      - 데이터베이스 백업"
    echo "  restore     - 데이터베이스 복원"
    echo "  reset       - 데이터베이스 초기화"
    echo "  logs        - 컨테이너 로그 확인"
    echo "  help        - 이 도움말 출력"
    echo ""
    echo -e "${YELLOW}예시:${NC}"
    echo "  $0 connect"
    echo "  $0 backup"
    echo "  $0 users"
}

# 컨테이너 상태 확인
check_container() {
    if ! docker ps | grep -q $CONTAINER_NAME; then
        echo -e "${RED}❌ PostgreSQL 컨테이너가 실행되지 않았습니다.${NC}"
        echo -e "${YELLOW}컨테이너를 시작하려면: ./start-postgres.sh${NC}"
        exit 1
    fi
}

# 데이터베이스 접속
connect_db() {
    echo -e "${BLUE}데이터베이스에 접속합니다...${NC}"
    check_container
    docker exec -it $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME
}

# 상태 확인
check_status() {
    echo -e "${BLUE}=== 시스템 상태 확인 ===${NC}"
    
    # Docker 컨테이너 상태
    echo -e "${YELLOW}1. Docker 컨테이너 상태:${NC}"
    if docker ps | grep -q $CONTAINER_NAME; then
        echo -e "${GREEN}✅ PostgreSQL 컨테이너 실행 중${NC}"
        CONTAINER_STATUS=$(docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep $CONTAINER_NAME)
        echo "   $CONTAINER_STATUS"
    else
        echo -e "${RED}❌ PostgreSQL 컨테이너가 실행되지 않음${NC}"
        return 1
    fi
    
    # 데이터베이스 연결 상태
    echo -e "${YELLOW}2. 데이터베이스 연결 상태:${NC}"
    if docker exec $CONTAINER_NAME pg_isready -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 데이터베이스 연결 정상${NC}"
    else
        echo -e "${RED}❌ 데이터베이스 연결 실패${NC}"
        return 1
    fi
    
    # 테이블 개수
    echo -e "${YELLOW}3. 데이터베이스 정보:${NC}"
    TABLE_COUNT=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
    USER_COUNT=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ' || echo "0")
    BOOK_COUNT=$(docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM books;" 2>/dev/null | tr -d ' ' || echo "0")
    
    echo "   테이블 수: $TABLE_COUNT"
    echo "   사용자 수: $USER_COUNT"
    echo "   책 수: $BOOK_COUNT"
}

# 테이블 목록
show_tables() {
    echo -e "${BLUE}=== 테이블 목록 ===${NC}"
    check_container
    docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "\\dt"
}

# 사용자 목록
show_users() {
    echo -e "${BLUE}=== 사용자 목록 ===${NC}"
    check_container
    docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 10;"
}

# 책 목록
show_books() {
    echo -e "${BLUE}=== 책 목록 ===${NC}"
    check_container
    docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "SELECT id, title, author, user_id, created_at FROM books ORDER BY created_at DESC LIMIT 10;"
}

# 퀘스트 목록
show_quests() {
    echo -e "${BLUE}=== 퀘스트 목록 ===${NC}"
    check_container
    docker exec $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME -c "SELECT id, title, type, status, user_id, created_at FROM quests ORDER BY created_at DESC LIMIT 10;"
}

# 백업
backup_db() {
    echo -e "${BLUE}=== 데이터베이스 백업 ===${NC}"
    check_container
    
    BACKUP_DIR="./backups"
    mkdir -p $BACKUP_DIR
    
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_FILE="$BACKUP_DIR/bookcraft_backup_$TIMESTAMP.sql"
    
    echo -e "${YELLOW}백업 중... ($BACKUP_FILE)${NC}"
    docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME > "$BACKUP_FILE"
    
    if [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}✅ 백업 완료: $BACKUP_FILE ($BACKUP_SIZE)${NC}"
    else
        echo -e "${RED}❌ 백업 실패${NC}"
        exit 1
    fi
}

# 복원
restore_db() {
    echo -e "${BLUE}=== 데이터베이스 복원 ===${NC}"
    check_container
    
    if [ -z "$2" ]; then
        echo -e "${RED}❌ 백업 파일을 지정해주세요.${NC}"
        echo "사용법: $0 restore <백업파일>"
        echo "예시: $0 restore ./backups/bookcraft_backup_20231201_120000.sql"
        exit 1
    fi
    
    BACKUP_FILE="$2"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ 백업 파일을 찾을 수 없습니다: $BACKUP_FILE${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⚠️  기존 데이터가 모두 삭제됩니다!${NC}"
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}복원 중... ($BACKUP_FILE)${NC}"
        docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME < "$BACKUP_FILE"
        echo -e "${GREEN}✅ 복원 완료${NC}"
    else
        echo -e "${YELLOW}복원을 취소했습니다.${NC}"
    fi
}

# 데이터베이스 초기화
reset_db() {
    echo -e "${BLUE}=== 데이터베이스 초기화 ===${NC}"
    check_container
    
    echo -e "${RED}⚠️  모든 데이터가 삭제됩니다!${NC}"
    read -p "정말로 초기화하시겠습니까? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}데이터베이스 초기화 중...${NC}"
        ./setup-database.sh
        echo -e "${GREEN}✅ 초기화 완료${NC}"
    else
        echo -e "${YELLOW}초기화를 취소했습니다.${NC}"
    fi
}

# 로그 확인
show_logs() {
    echo -e "${BLUE}=== 컨테이너 로그 ===${NC}"
    echo -e "${YELLOW}최근 로그 (Ctrl+C로 종료):${NC}"
    docker logs -f $CONTAINER_NAME
}

# 메인 로직
case "$1" in
    "connect")
        connect_db
        ;;
    "status")
        check_status
        ;;
    "tables")
        show_tables
        ;;
    "users")
        show_users
        ;;
    "books")
        show_books
        ;;
    "quests")
        show_quests
        ;;
    "backup")
        backup_db
        ;;
    "restore")
        restore_db "$@"
        ;;
    "reset")
        reset_db
        ;;
    "logs")
        show_logs
        ;;
    "help"|"")
        show_help
        ;;
    *)
        echo -e "${RED}❌ 알 수 없는 명령어: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac