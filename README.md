# 🚌 커뮤니티 버스 예약 시스템 (Next.js + Supabase)

커뮤니티 내 통근 버스를 효율적으로 예약하고 관리할 수 있는 웹 애플리케이션입니다. 이 버전은 기존 FastAPI 백엔드를 Next.js API 라우트로 통합하고, 데이터베이스를 Supabase로 마이그레이션한 버전입니다.

## 🛠 기술 스택

- **Framework**: Next.js 14+ (App Router, API Routes)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with dark mode support
- **State Management**: React Context API (AuthProvider)
- **Package Manager**: npm

## ✨ 주요 기능

### 👤 일반 사용자
- 목적지별 버스 조회 및 검색
- 실시간 좌석 선택 및 예약
- 예약 내역 관리 및 취소

### ⚙️ 관리자 기능
- **대시보드**: 실시간 통계 및 탑승률 현황
- **버스 관리**: 버스 등록, 수정, 삭제 (28인승/45인승 지원)
- **노선 관리**: 노선 추가, 수정, 삭제 (출발지-도착지 관리)
- **예약 관리**: 전체 예약 조회, 직권 예약/취소
- **사용자 관리**: 전체 사용자 목록 및 권한 관리
- **실시간 좌석 배치도**: 버스별 좌석 현황 시각화

### 🚛 기사님 기능
- **대시보드**: 배정된 버스 운행 현황
- **탑승객 관리**: 당일 예약자 목록 및 승객 정보
- **좌석 배치도**: 28인승/45인승 좌석별 예약 현황
- **실시간 좌석 현황**: 예약/취소/빈자리 실시간 확인

### 🔐 보안 기능
- **Supabase Auth**: JWT 기반 인증 및 세션 관리
- **역할 기반 접근 제어**: `admin`, `driver`, `user` 역할에 따른 페이지 및 API 접근 제어
- **Next.js Middleware**: Supabase 세션을 이용한 라우트 보호
- **RLS (Row Level Security)**: Supabase 데이터베이스 레벨 보안 정책 적용

## 🚀 설치 및 실행

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd Gc-KIT-Bus
```

### 2. Supabase 프로젝트 설정
이 프로젝트는 Supabase를 데이터베이스 및 인증 백엔드로 사용합니다.

1.  **Supabase 프로젝트 생성**: [supabase.com](https://supabase.com)에서 새 프로젝트를 생성합니다.
2.  **데이터베이스 스키마 설정**:
    *   프로젝트 루트에 있는 `migration.sql` 파일의 내용을 복사합니다.
    *   Supabase 프로젝트의 **SQL Editor**로 이동하여 복사한 SQL을 붙여넣고 실행합니다.
    *   이 스크립트는 필요한 테이블, 역할(enum), 함수, RLS 정책을 모두 설정합니다.

### 3. 프론트엔드 환경 변수 설정

`frontend` 디렉토리 내에 두 개의 환경 변수 파일을 생성해야 합니다.

#### 3.1. `.env.local` 파일
이 파일은 브라우저에 노출되어도 안전한 공개 키를 저장합니다. `frontend` 폴더에 `.env.local` 파일을 생성하고 아래 내용을 추가하세요.
```bash
# Supabase 프로젝트의 API 설정 페이지에서 'Project URL'과 'anon' 'public' 키를 찾아 입력하세요.
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

#### 3.2. `.env` 파일
이 파일은 서버 측에서만 사용되는 비밀 키를 저장합니다. **이 파일은 절대로 버전 관리에 포함해서는 안 됩니다.**
`frontend` 폴더에 `.env` 파일을 생성하고 아래 내용을 추가하세요.
```bash
# Supabase 프로젝트의 API 설정 페이지에서 'service_role' 'secret' 키를 찾아 입력하세요.
SUPABASE_SERVICE_KEY=<your-service-role-key>
```

### 4. 의존성 설치 및 개발 서버 실행

```bash
cd frontend

# 의존성 설치
npm install
```

### 5. 데모 데이터 생성 (선택사항)
초기 테스트를 위한 데모 사용자와 데이터를 생성할 수 있습니다.
```bash
# 데모 데이터 시딩 스크립트 실행
npm run db:seed
```
이 스크립트는 `SUPABASE_SERVICE_KEY`를 사용하여 관리자 권한으로 사용자를 생성하므로, `.env` 파일이 올바르게 설정되어 있어야 합니다.

### 6. 개발 서버 실행
```bash
npm run dev
```
애플리케이션이 http://localhost:3000 에서 실행됩니다.

## 🔑 데모 계정

`db:seed` 스크립트를 실행하여 생성된 데모 계정 정보입니다.

- **관리자**: `admin@company.com` / `admin123`
- **기사님**: `driver1@company.com` / `driver123`
- **사용자**: `user1@company.com` / `user123`

## 📁 프로젝트 구조

```
Gc-KIT-Bus/
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── api/              # API 라우트 (백엔드 로직)
│   │   │   ├── admin/            # 관리자 페이지
│   │   │   ├── driver/           # 기사님 페이지
│   │   │   ├── user/             # 사용자 페이지
│   │   │   └── login/            # 로그인 페이지
│   │   ├── components/           # React 컴포넌트
│   │   ├── contexts/             # React Context (인증 등)
│   │   ├── lib/                  # API 클라이언트 래퍼
│   │   └── utils/                # 유틸리티 함수
│   ├── scripts/
│   │   └── seed.ts               # 데이터베이스 시딩 스크립트
│   ├── middleware.ts             # 인증 미들웨어
│   └── package.json
├── migration.sql                 # Supabase DB 스키마
└── README.md                     # 이 문서
```

## 🎯 주요 특징

### 🏗️ 아키텍처
- **Full-stack Next.js**: FastAPI 백엔드를 Next.js API 라우트로 통합하여 단일 프레임워크로 프론트엔드와 백엔드를 모두 처리합니다.
- **Serverless-first**: Vercel과 같은 플랫폼에 쉽게 배포할 수 있습니다.
- **Supabase 통합**: 데이터베이스, 인증, 스토리지 등 백엔드 인프라를 Supabase로 관리하여 개발 및 유지보수 효율성을 높입니다.

### 🔐 보안 & 인증
- **Supabase Auth**: 이메일/비밀번호 기반 인증 및 세션 관리를 Supabase가 처리합니다.
- **역할 기반 접근 제어 (RBAC)**: Next.js 미들웨어와 API 라우트에서 사용자의 역할을 확인하여 페이지와 API에 대한 접근을 제어합니다.
- **RLS (Row Level Security)**: 데이터베이스 단에서 데이터 접근 정책을 적용하여 보안을 강화합니다.

---
MIT License
