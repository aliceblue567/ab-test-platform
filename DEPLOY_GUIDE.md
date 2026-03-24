# 배포 가이드 (Vercel)

팀원은 **Vercel 계정에 로그인할 필요 없이** 배포된 URL만으로 사이트를 사용합니다. 환경 변수는 **프로젝트 소유자(또는 팀 관리자)** 가 Vercel 대시보드에서 한 번 설정해 두면 됩니다.

## 1. Vercel에서 환경 변수 넣기

1. [Vercel Dashboard](https://vercel.com/dashboard) → 프로젝트 선택  
2. **Settings** → **Environment Variables**  
3. 아래 변수를 **Production**(필요 시 Preview/Development도)에 추가  
4. 저장 후 **Deployments**에서 최신 배포를 **Redeploy** 하거나, `main`에 푸시해 재배포

### 필수 (앱이 동작하려면)

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | Neon 등 PostgreSQL 연결 문자열 (Prisma·NextAuth) |
| `AUTH_SECRET` | 임의 긴 문자열. `openssl rand -base64 32` 로 생성 권장. **관리자 게이트 쿠키 서명에도 사용** |
| `NEXTAUTH_URL` | 프로덕션 URL, 예: `https://your-app.vercel.app` |
| `AUTH_TRUST_HOST` | `true` 권장 (Vercel) |
| `AUTH_ADMIN_EMAIL` | 관리자 로그인 이메일 |
| `AUTH_ADMIN_PASSWORD` | 관리자 로그인 비밀번호 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL (공개되어도 되는 값) |
| `SUPABASE_SERVICE_ROLE_KEY` | **서버 전용**. Supabase **service_role** 키 (절대 `NEXT_PUBLIC_` 붙이지 말 것) |
| `GEMINI_API_KEY` | Google AI Studio 등에서 발급 (UX 검수) |

### 관리자 1차 게이트 (팀 공유 테스트용)

| 변수 | 설명 |
|------|------|
| `ADMIN_PASSWORD` | `/admin` 진입 전에 묻는 **간단한 공용 비밀번호**. 설정 시 `AUTH_SECRET`도 **반드시** 필요 |
| `AUTH_SECRET` | 위와 동일 — 게이트 쿠키(`admin_gate`) 서명 |

`ADMIN_PASSWORD`를 비우면 기존처럼 **게이트 없이** 관리자 로그인만 사용할 수 있습니다.

### UX Writing API (피그마·외부 클라이언트)

| 변수 | 설명 |
|------|------|
| `UX_WRITING_CORS_ORIGINS` | 허용할 Origin을 **쉼표로 구분**. 예: `https://your-app.vercel.app,https://www.figma.com,https://figma.com,http://localhost:3000` |
| `UX_WRITING_ALLOW_NULL_ORIGIN` | `false`로 두면 `Origin: null` 요청 거부 (기본은 허용 — 일부 Figma·샌드박스) |
| `UX_WRITING_BLOCK_NO_ORIGIN` | `true`면 **Origin 헤더 없음**(curl 등) 요청도 CORS 단계에서 거부. 기본은 허용 |

프로덕션 도메인을 반드시 `UX_WRITING_CORS_ORIGINS`에 넣어 주세요.

### 선택

| 변수 | 설명 |
|------|------|
| `UX_WRITING_MAX_CHECKS_PER_MONTH` | 월간 검수 횟수 상한 (Supabase `ux_writing_usage` 테이블 필요) |
| `AUTH_DEBUG` | `true`일 때만 프로덕션에서 `/api/debug/*` 진단 API 허용. **평소에는 설정하지 않음** |

## 2. 민감 정보가 프론트에 나가지 않게

- **`NEXT_PUBLIC_` 접두사**가 붙은 변수만 브라우저에 노출됩니다.  
- **`GEMINI_API_KEY`**, **`SUPABASE_SERVICE_ROLE_KEY`**, **`OPENAI_API_KEY`** 등은 **`NEXT_PUBLIC_` 없이** 서버 환경 변수로만 설정합니다.  
- 코드베이스 기준으로 클라이언트 컴포넌트에는 `process.env` 비밀이 없도록 유지했습니다.

## 3. Supabase SQL (한도·가이드라인)

- 가이드라인·API 키·월간 검수 카운터 테이블은 저장소의 `supabase-setup.sql` 또는 `supabase-guidelines-only.sql`, `supabase-ux-writing-usage.sql` 등을 SQL Editor에서 실행하세요.

## 4. 팀원이 사이트만 쓰는 방법

1. 배포 URL(예: `https://xxx.vercel.app`)을 공유  
2. 관리자 영역: 공유한 **`ADMIN_PASSWORD`**(설정한 경우) → **`AUTH_ADMIN_*` 로그인**  
3. Vercel 초대나 로그인은 **필수 아님**

## 5. 문제 해결

- **게이트만 나오고 로그인으로 안 감**: `AUTH_SECRET` 누락 시 `/admin/gate?error=config` 안내 확인  
- **CORS 403**: `UX_WRITING_CORS_ORIGINS`에 브라우저가 보내는 Origin(프로덕션 URL 정확히) 추가  
- **디버그 API 404**: 프로덕션에서는 기본 비활성. 필요 시 `AUTH_DEBUG=true` (잠깐만 사용 권장)
