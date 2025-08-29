# 📚 BookCraft - 독서 게임화 플랫폼

> 독서를 게임처럼 재미있게! 가족과 함께하는 독서 여행

[![Next.js](https://img.shields.io/badge/Next.js-15.5.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-orange)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)](https://vercel.com/)

## 🎯 프로젝트 소개

BookCraft는 독서를 게임화하여 더욱 재미있고 지속적인 독서 습관을 만들어주는 플랫폼입니다. 가족 구성원들이 함께 독서 목표를 달성하고, 퀘스트를 완료하며, 성취를 공유할 수 있습니다.

### ✨ 주요 기능

- 📖 **스마트 책 관리**: 바코드 스캐너로 간편한 책 등록
- 🎯 **퀘스트 시스템**: 일일/주간 독서 퀘스트와 자동 생성
- 👨‍👩‍👧‍👦 **가족 시스템**: 초대, 순위, 협력 기능
- 🏆 **성취 및 보상**: XP, 코인, 배지 시스템
- ⏱️ **독서 세션**: 타이머, 집중도, 진행률 추적
- 📊 **통계 및 분석**: 개인/가족 독서 통계
- 🔔 **실시간 알림**: 퀘스트, 성취, 가족 활동 알림

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/your-username/bookcraft.git
cd bookcraft
```

### 2. 의존성 설치

```bash
npm install
# 또는
yarn install
```

### 3. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 필요한 환경 변수를 설정하세요:

```env
# 데이터베이스
DATABASE_URL=postgresql://username:password@localhost:5432/bookcraft

# JWT 인증
JWT_SECRET=your-super-secret-jwt-key

# Firebase 인증
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
# ... 기타 Firebase 설정
```

### 4. 데이터베이스 설정

#### Docker 사용 (권장)

```bash
# PostgreSQL 컨테이너 시작
docker-compose up -d

# 스키마 생성
./setup-database.sh
```

#### 로컬 PostgreSQL 사용

```bash
# 데이터베이스 생성
psql -U postgres -c "CREATE DATABASE bookcraft;"

# 스키마 적용
psql -U postgres -d bookcraft -f supabase/schema.sql
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 🛠️ 기술 스택

### Frontend
- **Next.js 15**: React 프레임워크
- **TypeScript**: 타입 안전성
- **TailwindCSS**: 유틸리티 CSS 프레임워크
- **shadcn/ui**: 재사용 가능한 UI 컴포넌트
- **Lucide React**: 아이콘 라이브러리

### Backend
- **Next.js API Routes**: 서버리스 API
- **PostgreSQL**: 관계형 데이터베이스
- **Firebase Auth**: 사용자 인증
- **JWT**: 토큰 기반 인증

### 배포 및 인프라
- **Vercel**: 프론트엔드 배포
- **Vercel Postgres**: 데이터베이스 호스팅
- **Vercel Cron**: 스케줄링

## 📁 프로젝트 구조

```
bookcraft/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API 엔드포인트
│   │   ├── auth/           # 인증 페이지
│   │   ├── dashboard/      # 대시보드
│   │   ├── books/          # 책 관리
│   │   ├── family/         # 가족 시스템
│   │   ├── quests/         # 퀘스트
│   │   └── profile/        # 프로필
│   ├── components/         # 재사용 컴포넌트
│   │   ├── ui/            # UI 컴포넌트
│   │   └── layout/        # 레이아웃 컴포넌트
│   ├── lib/               # 유틸리티 및 설정
│   └── types/             # TypeScript 타입 정의
├── docs/                  # 프로젝트 문서
├── supabase/             # 데이터베이스 스키마
└── docker/               # Docker 설정
```

## 🚀 Vercel 배포

### 1. Vercel 계정 연결

```bash
npm i -g vercel
vercel login
```

### 2. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정하세요:

- `DATABASE_URL`: PostgreSQL 연결 문자열
- `JWT_SECRET`: JWT 시크릿 키
- `NEXT_PUBLIC_FIREBASE_*`: Firebase 설정
- `FIREBASE_ADMIN_*`: Firebase Admin 설정
- `CRON_API_KEY`: Cron Job 보안 키

### 3. 배포

```bash
# 프리뷰 배포
vercel

# 프로덕션 배포
vercel --prod
```

자세한 배포 가이드는 [docs/vercel-deployment.md](docs/vercel-deployment.md)를 참조하세요.

## 📖 문서

- [사용자 매뉴얼](docs/USER_MANUAL.md)
- [제품 요구사항 문서](docs/prd.md)
- [기술 요구사항 문서](docs/trd.md)
- [Vercel 배포 가이드](docs/vercel-deployment.md)
- [보상 시스템](docs/reward-system.md)

## 🤝 기여하기

1. 저장소를 포크합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- [Next.js](https://nextjs.org/) - 강력한 React 프레임워크
- [Vercel](https://vercel.com/) - 최고의 배포 플랫폼
- [shadcn/ui](https://ui.shadcn.com/) - 아름다운 UI 컴포넌트
- [Firebase](https://firebase.google.com/) - 간편한 인증 서비스

---

**BookCraft와 함께 독서의 즐거움을 발견하세요!** 📚✨
