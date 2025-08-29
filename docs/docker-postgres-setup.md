# Docker PostgreSQL 설정 가이드

BookCraft 프로젝트에서 Docker를 사용하여 PostgreSQL 데이터베이스를 설정하는 방법을 안내합니다.

## 장점

✅ **로컬 개발 환경 일관성**: 모든 개발자가 동일한 데이터베이스 환경 사용  
✅ **빠른 설정**: 복잡한 PostgreSQL 설치 과정 없이 바로 시작  
✅ **격리된 환경**: 시스템에 영향을 주지 않는 독립적인 데이터베이스  
✅ **쉬운 초기화**: 언제든지 깨끗한 상태로 재시작 가능  
✅ **팀 협업**: 동일한 설정을 팀원들과 공유  

## 1. Docker 설정 파일 생성

### 1.1 docker-compose.yml 생성

프로젝트 루트에 `docker-compose.yml` 파일을 생성:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: bookcraft-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: bookcraft
      POSTGRES_USER: bookcraft_user
      POSTGRES_PASSWORD: bookcraft_password
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init:/docker-entrypoint-initdb.d
    networks:
      - bookcraft-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bookcraft_user -d bookcraft"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 선택사항: pgAdmin (데이터베이스 관리 도구)
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: bookcraft-pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@bookcraft.com
      PGADMIN_DEFAULT_PASSWORD: admin123
      PGADMIN_CONFIG_SERVER_MODE: 'False'
    ports:
      - "8080:80"
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    networks:
      - bookcraft-network
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
    driver: local
  pgadmin_data:
    driver: local

networks:
  bookcraft-network:
    driver: bridge
```

### 1.2 초기화 스크립트 디렉토리 생성

```bash
mkdir -p docker/postgres/init
```

### 1.3 스키마 초기화 스크립트 생성

`docker/postgres/init/01-schema.sql` 파일 생성:

```sql
-- BookCraft 데이터베이스 초기화 스크립트
-- 이 파일은 컨테이너 시작 시 자동으로 실행됩니다

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 여기에 supabase/schema.sql 내용을 복사하여 붙여넣기
-- (기존 스키마 파일 내용 그대로 사용)
```

### 1.4 함수 초기화 스크립트 생성

`docker/postgres/init/02-functions.sql` 파일 생성:

```sql
-- BookCraft 데이터베이스 함수들
-- 이 파일은 스키마 생성 후 실행됩니다

-- 여기에 supabase/functions.sql 내용을 복사하여 붙여넣기
-- (기존 함수 파일 내용 그대로 사용)
```

### 1.5 기본 데이터 삽입 스크립트 생성

`docker/postgres/init/03-seed-data.sql` 파일 생성:

```sql
-- 기본 데이터 삽입
-- 개발 환경에서 사용할 테스트 데이터

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

-- 개발용 테스트 사용자 (선택사항)
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
-- VALUES (
--   uuid_generate_v4(),
--   'test@bookcraft.com',
--   crypt('password123', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW()
-- );
```

## 2. 환경 변수 설정

### 2.1 .env.local 파일 수정

```env
# PostgreSQL 데이터베이스 설정 (Docker)
DATABASE_URL=postgresql://bookcraft_user:bookcraft_password@localhost:5432/bookcraft
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bookcraft
POSTGRES_USER=bookcraft_user
POSTGRES_PASSWORD=bookcraft_password

# 기존 Supabase 설정은 주석 처리
# NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...[YOUR_ANON_KEY]
# SUPABASE_SERVICE_ROLE_KEY=eyJ...[YOUR_SERVICE_ROLE_KEY]

# AI 서비스 API 키
OPENAI_API_KEY=your_openai_api_key
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key

# 개발 환경 설정
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2.2 .env.example 파일 생성

팀원들을 위한 환경 변수 템플릿:

```env
# PostgreSQL 데이터베이스 설정
DATABASE_URL=postgresql://bookcraft_user:bookcraft_password@localhost:5432/bookcraft
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bookcraft
POSTGRES_USER=bookcraft_user
POSTGRES_PASSWORD=bookcraft_password

# AI 서비스 API 키 (선택사항)
OPENAI_API_KEY=your_openai_api_key
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key

# 개발 환경 설정
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. 데이터베이스 클라이언트 설정

### 3.1 PostgreSQL 클라이언트 라이브러리 설치

```bash
npm install pg @types/pg
```

### 3.2 데이터베이스 연결 설정

`src/lib/database.ts` 파일 생성:

```typescript
import { Pool } from 'pg'

// PostgreSQL 연결 풀 생성
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'bookcraft',
  user: process.env.POSTGRES_USER || 'bookcraft_user',
  password: process.env.POSTGRES_PASSWORD || 'bookcraft_password',
  max: 20, // 최대 연결 수
  idleTimeoutMillis: 30000, // 유휴 연결 타임아웃
  connectionTimeoutMillis: 2000, // 연결 타임아웃
})

// 데이터베이스 연결 테스트
export async function testConnection() {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    console.log('✅ 데이터베이스 연결 성공:', result.rows[0].now)
    return true
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error)
    return false
  }
}

// 쿼리 실행 헬퍼 함수
export async function query(text: string, params?: any[]) {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

// 트랜잭션 헬퍼 함수
export async function transaction(callback: (client: any) => Promise<any>) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export default pool
```

## 4. Docker 컨테이너 실행

### 4.1 컨테이너 시작

```bash
# 백그라운드에서 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f postgres
```

### 4.2 데이터베이스 상태 확인

```bash
# 컨테이너 상태 확인
docker-compose ps

# PostgreSQL 연결 테스트
docker-compose exec postgres psql -U bookcraft_user -d bookcraft -c "SELECT version();"
```

### 4.3 pgAdmin 접속 (선택사항)

1. 브라우저에서 `http://localhost:8080` 접속
2. 로그인 정보:
   - Email: `admin@bookcraft.com`
   - Password: `admin123`
3. 서버 추가:
   - Host: `postgres`
   - Port: `5432`
   - Database: `bookcraft`
   - Username: `bookcraft_user`
   - Password: `bookcraft_password`

## 5. 개발 워크플로우

### 5.1 일일 개발 시작

```bash
# 1. Docker 컨테이너 시작
docker-compose up -d

# 2. 개발 서버 시작
npm run dev
```

### 5.2 데이터베이스 초기화

```bash
# 데이터베이스 완전 초기화
docker-compose down -v
docker-compose up -d
```

### 5.3 스키마 업데이트

```bash
# 1. 컨테이너 중지
docker-compose down

# 2. 초기화 스크립트 수정
# docker/postgres/init/ 폴더의 SQL 파일들 수정

# 3. 볼륨 삭제 후 재시작
docker-compose down -v
docker-compose up -d
```

## 6. 유용한 Docker 명령어

### 6.1 컨테이너 관리

```bash
# 컨테이너 시작
docker-compose up -d

# 컨테이너 중지
docker-compose down

# 볼륨까지 삭제
docker-compose down -v

# 로그 확인
docker-compose logs postgres
docker-compose logs pgadmin

# 실시간 로그 확인
docker-compose logs -f postgres
```

### 6.2 데이터베이스 접속

```bash
# PostgreSQL 쉘 접속
docker-compose exec postgres psql -U bookcraft_user -d bookcraft

# SQL 파일 실행
docker-compose exec -T postgres psql -U bookcraft_user -d bookcraft < schema.sql

# 데이터베이스 덤프
docker-compose exec postgres pg_dump -U bookcraft_user bookcraft > backup.sql

# 데이터베이스 복원
docker-compose exec -T postgres psql -U bookcraft_user -d bookcraft < backup.sql
```

## 7. 문제 해결

### 7.1 일반적인 오류

**포트 충돌**
```bash
# 5432 포트를 사용하는 프로세스 확인
lsof -i :5432

# 기존 PostgreSQL 서비스 중지 (macOS)
brew services stop postgresql
```

**권한 오류**
```bash
# Docker 볼륨 권한 확인
docker-compose exec postgres ls -la /var/lib/postgresql/data

# 볼륨 재생성
docker-compose down -v
docker volume prune
docker-compose up -d
```

**연결 오류**
```bash
# 네트워크 확인
docker network ls
docker network inspect bookcraft_bookcraft-network

# 컨테이너 상태 확인
docker-compose ps
docker-compose logs postgres
```

### 7.2 성능 최적화

`docker-compose.yml`에 PostgreSQL 설정 추가:

```yaml
services:
  postgres:
    # ... 기존 설정
    command: >
      postgres
      -c shared_preload_libraries=pg_stat_statements
      -c pg_stat_statements.track=all
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
```

## 8. 프로덕션 고려사항

### 8.1 보안 설정

- 강력한 비밀번호 사용
- 환경 변수로 민감한 정보 관리
- 네트워크 접근 제한
- SSL/TLS 연결 활성화

### 8.2 백업 전략

```bash
# 자동 백업 스크립트 예시
#!/bin/bash
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")

mkdir -p $BACKUP_DIR
docker-compose exec -T postgres pg_dump -U bookcraft_user bookcraft > "$BACKUP_DIR/bookcraft_$DATE.sql"

# 7일 이상 된 백업 파일 삭제
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

### 8.3 모니터링

- 컨테이너 헬스체크 설정
- 로그 로테이션 구성
- 성능 메트릭 수집
- 알림 시스템 구축

---

## 참고 자료

- [Docker Compose 공식 문서](https://docs.docker.com/compose/)
- [PostgreSQL Docker 이미지](https://hub.docker.com/_/postgres)
- [pgAdmin Docker 이미지](https://hub.docker.com/r/dpage/pgadmin4/)
- [Node.js PostgreSQL 가이드](https://node-postgres.com/)