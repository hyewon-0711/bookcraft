# Supabase 프로젝트 설정 가이드

BookCraft 프로젝트에서 Supabase를 설정하는 방법을 단계별로 안내합니다.

## 1. Supabase 프로젝트 생성

### 1.1 Supabase 계정 생성
1. [Supabase 웹사이트](https://supabase.com)에 접속
2. "Start your project" 클릭
3. GitHub, Google, 또는 이메일로 계정 생성

### 1.2 새 프로젝트 생성
1. 대시보드에서 "New Project" 클릭
2. 프로젝트 정보 입력:
   - **Name**: `bookcraft` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 생성 (반드시 기록해두세요!)
   - **Region**: `Northeast Asia (Seoul)` 선택 (한국 사용자용)
   - **Pricing Plan**: `Free` 선택 (개발 단계)

3. "Create new project" 클릭
4. 프로젝트 생성 완료까지 2-3분 대기

## 2. 데이터베이스 스키마 설정

### 2.1 SQL Editor 접속
1. Supabase 대시보드에서 생성한 프로젝트 선택
2. 왼쪽 메뉴에서 "SQL Editor" 클릭

### 2.2 스키마 실행
1. "New query" 클릭
2. 프로젝트의 `supabase/schema.sql` 파일 내용을 복사하여 붙여넣기
3. "Run" 버튼 클릭하여 스키마 생성
4. 성공 메시지 확인

### 2.3 함수 실행
1. 새로운 쿼리 탭 생성
2. 프로젝트의 `supabase/functions.sql` 파일 내용을 복사하여 붙여넣기
3. "Run" 버튼 클릭하여 함수 생성
4. 성공 메시지 확인

## 3. 인증 설정

### 3.1 기본 인증 설정
1. 왼쪽 메뉴에서 "Authentication" > "Settings" 클릭
2. "Site URL" 설정:
   - 개발 환경: `http://localhost:3000`
   - 프로덕션 환경: 실제 도메인 입력
3. "Redirect URLs" 추가:
   - `http://localhost:3000/auth/callback`
   - 프로덕션 도메인의 콜백 URL

### 3.2 Google OAuth 설정 (선택사항)
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. "APIs & Services" > "Credentials" 이동
4. "Create Credentials" > "OAuth 2.0 Client IDs" 선택
5. 애플리케이션 유형: "Web application" 선택
6. 승인된 리디렉션 URI 추가:
   ```
   https://[YOUR_SUPABASE_PROJECT_ID].supabase.co/auth/v1/callback
   ```
7. 생성된 Client ID와 Client Secret을 Supabase에 설정:
   - Supabase > Authentication > Providers > Google
   - "Enable Google provider" 체크
   - Client ID와 Client Secret 입력
   - "Save" 클릭

## 4. 스토리지 버킷 생성

### 4.1 버킷 생성
1. 왼쪽 메뉴에서 "Storage" 클릭
2. 다음 버킷들을 생성:

#### book-covers (책 커버 이미지)
- "Create bucket" 클릭
- Bucket name: `book-covers`
- Public bucket: ✅ 체크
- "Save" 클릭

#### avatars (사용자 아바타)
- "Create bucket" 클릭
- Bucket name: `avatars`
- Public bucket: ✅ 체크
- "Save" 클릭

#### badges (배지 아이콘)
- "Create bucket" 클릭
- Bucket name: `badges`
- Public bucket: ✅ 체크
- "Save" 클릭

### 4.2 스토리지 정책 설정
각 버킷에 대해 다음 정책을 설정:

```sql
-- book-covers 버킷 정책
CREATE POLICY "Users can upload book covers" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view book covers" ON storage.objects
FOR SELECT USING (bucket_id = 'book-covers');

CREATE POLICY "Users can update own book covers" ON storage.objects
FOR UPDATE USING (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- avatars 버킷 정책
CREATE POLICY "Users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatars" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- badges 버킷 정책 (모든 사용자가 조회 가능)
CREATE POLICY "Anyone can view badges" ON storage.objects
FOR SELECT USING (bucket_id = 'badges');
```

## 5. 환경 변수 설정

### 5.1 Supabase 프로젝트 정보 확인
1. Supabase 대시보드에서 "Settings" > "API" 클릭
2. 다음 정보를 확인하고 복사:
   - **Project URL**: `https://[PROJECT_ID].supabase.co`
   - **anon public key**: `eyJ...` (긴 JWT 토큰)
   - **service_role key**: `eyJ...` (긴 JWT 토큰, 주의: 비밀 유지!)

### 5.2 .env.local 파일 설정
프로젝트 루트의 `.env.local` 파일을 다음과 같이 수정:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=eyJ...[YOUR_SERVICE_ROLE_KEY]

# AI 서비스 API 키 (나중에 설정)
OPENAI_API_KEY=your_openai_api_key
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key

# Pusher 설정 (실시간 기능용, 나중에 설정)
NEXT_PUBLIC_PUSHER_APP_ID=your_pusher_app_id
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_pusher_secret
NEXT_PUBLIC_PUSHER_CLUSTER=your_pusher_cluster

# Stripe 설정 (향후 결제 기능용)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# 외부 API 설정
ALADIN_API_KEY=your_aladin_api_key

# 개발 환경 설정
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5.3 환경 변수 보안
⚠️ **중요**: 
- `.env.local` 파일은 절대 Git에 커밋하지 마세요
- `service_role` 키는 서버 사이드에서만 사용하세요
- 프로덕션 환경에서는 환경 변수를 안전하게 관리하세요

## 6. 연결 테스트

### 6.1 개발 서버 실행
```bash
npm run dev
```

### 6.2 기능 테스트
1. `http://localhost:3000` 접속
2. 회원가입 페이지에서 새 계정 생성
3. 이메일 인증 (개발 환경에서는 Supabase 대시보드의 Authentication > Users에서 확인 가능)
4. 로그인 테스트
5. 대시보드 접속 확인

### 6.3 데이터베이스 확인
1. Supabase 대시보드 > "Table Editor" 클릭
2. `users` 테이블에서 생성된 사용자 데이터 확인
3. 다른 테이블들이 정상적으로 생성되었는지 확인

## 7. 문제 해결

### 7.1 일반적인 오류

**연결 오류**
- 환경 변수가 올바르게 설정되었는지 확인
- 프로젝트 URL과 API 키가 정확한지 확인
- `.env.local` 파일이 프로젝트 루트에 있는지 확인

**인증 오류**
- Site URL과 Redirect URL이 올바르게 설정되었는지 확인
- Google OAuth 설정이 정확한지 확인

**데이터베이스 오류**
- 스키마가 올바르게 실행되었는지 확인
- RLS 정책이 활성화되었는지 확인
- 테이블 권한 설정 확인

### 7.2 로그 확인
- 브라우저 개발자 도구의 Console 탭 확인
- Supabase 대시보드의 "Logs" 섹션 확인
- Next.js 개발 서버의 터미널 로그 확인

## 8. 다음 단계

Supabase 설정이 완료되면:
1. 책 등록 기능 구현
2. 퀘스트 시스템 개발
3. 실시간 기능 추가
4. AI 기능 통합

---

## 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js와 Supabase 통합 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth 가이드](https://supabase.com/docs/guides/auth)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)