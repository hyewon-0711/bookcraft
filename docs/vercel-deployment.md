# BookCraft Vercel 배포 가이드

## 🚀 Vercel 배포 준비

### 1. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수들을 설정해야 합니다:

#### 필수 환경 변수
```bash
# 데이터베이스 (Vercel Postgres 또는 외부 DB)
DATABASE_URL=postgresql://username:password@host:port/database

# JWT 인증
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Firebase 인증
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (서버사이드)
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=your_service_account_email
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key

# Cron Job 보안
CRON_API_KEY=your_cron_security_key

# 앱 URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### 선택적 환경 변수
```bash
# AI 서비스
OPENAI_API_KEY=your_openai_api_key
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key

# 실시간 기능 (Pusher)
NEXT_PUBLIC_PUSHER_APP_ID=your_pusher_app_id
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_CLUSTER=your_pusher_cluster

# 결제 (Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# 외부 API
ALADIN_API_KEY=your_aladin_api_key
```

### 2. 데이터베이스 설정

#### 옵션 1: Vercel Postgres (권장)
1. Vercel 대시보드에서 Storage → Create Database → Postgres 선택
2. 데이터베이스 생성 후 연결 정보를 환경 변수에 추가
3. 스키마 파일 실행:
   ```sql
   -- supabase/schema.sql 내용을 Vercel Postgres에 실행
   ```

#### 옵션 2: 외부 데이터베이스
- Supabase, PlanetScale, Railway 등 사용 가능
- DATABASE_URL 환경 변수에 연결 문자열 설정

### 3. Firebase 설정

1. Firebase Console에서 프로젝트 생성
2. Authentication 활성화 (이메일/비밀번호, Google 등)
3. 웹 앱 등록 후 설정 정보 복사
4. 서비스 계정 키 생성 (Admin SDK용)

### 4. 배포 과정

#### GitHub 연동 배포 (권장)
1. GitHub에 코드 푸시
2. Vercel에서 GitHub 저장소 연결
3. 환경 변수 설정
4. 자동 배포 시작

#### CLI 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 5. 배포 후 확인사항

#### 필수 체크리스트
- [ ] 메인 페이지 로드 확인
- [ ] 회원가입/로그인 기능 테스트
- [ ] 데이터베이스 연결 확인
- [ ] API 엔드포인트 동작 확인
- [ ] Cron Job 설정 확인

#### 기능별 테스트
- [ ] 책 등록 및 관리
- [ ] 퀘스트 시스템
- [ ] 가족 초대 시스템
- [ ] 독서 세션 기록
- [ ] 프로필 관리

### 6. 문제 해결

#### 일반적인 오류

**빌드 오류**
```bash
# 로컬에서 빌드 테스트
npm run build

# 타입 오류 확인
npm run lint
```

**환경 변수 오류**
- Vercel 대시보드에서 환경 변수 재확인
- 변수명 오타 확인
- 따옴표 제거 확인

**데이터베이스 연결 오류**
- DATABASE_URL 형식 확인
- 데이터베이스 접근 권한 확인
- 스키마 생성 여부 확인

**Firebase 인증 오류**
- Firebase 프로젝트 설정 확인
- 도메인 허용 목록에 Vercel 도메인 추가
- 서비스 계정 키 형식 확인

### 7. 성능 최적화

#### 이미지 최적화
- Next.js Image 컴포넌트 사용
- WebP 형식 활용
- 적절한 크기 설정

#### 번들 크기 최적화
```bash
# 번들 분석
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

#### 캐싱 전략
- API 응답 캐싱
- 정적 자산 캐싱
- ISR (Incremental Static Regeneration) 활용

### 8. 모니터링

#### Vercel Analytics
- 페이지 성능 모니터링
- 사용자 행동 분석
- 오류 추적

#### 로그 확인
```bash
# Vercel 함수 로그 확인
vercel logs

# 실시간 로그
vercel logs --follow
```

### 9. 보안 설정

#### 환경 변수 보안
- 민감한 정보는 환경 변수로만 관리
- 클라이언트 사이드 변수는 NEXT_PUBLIC_ 접두사 사용
- 정기적인 키 로테이션

#### CORS 설정
- API 엔드포인트 CORS 헤더 설정
- 허용된 도메인만 접근 가능하도록 제한

### 10. 백업 및 복구

#### 데이터베이스 백업
- 정기적인 데이터베이스 백업
- 스키마 버전 관리
- 마이그레이션 스크립트 준비

#### 코드 백업
- Git 저장소 정기 백업
- 태그를 통한 버전 관리
- 롤백 계획 수립

## 🎉 배포 완료!

BookCraft가 성공적으로 Vercel에 배포되었습니다. 사용자들이 안정적으로 서비스를 이용할 수 있도록 지속적인 모니터링과 업데이트를 진행하세요.