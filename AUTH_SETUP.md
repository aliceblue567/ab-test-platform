# 로그인 설정 가이드

실험 생성, 편집 등 관리자 기능을 사용하려면 로그인이 필요합니다.

## "Server error" / "인증 설정 오류" 발생 시

로그인 버튼을 눌렀을 때 **"There is a problem with the server configuration"** 또는 **"Server error"**가 나오면, **환경 변수가 설정되지 않은 것**입니다. 아래 변수들을 Vercel에 추가한 뒤 **Redeploy** 해주세요.

## "Unauthorized" / "로그인이 필요합니다" 오류

이 오류는 다음 경우에 발생합니다:

- **로그인하지 않은 상태**에서 실험 생성/편집 버튼을 눌렀을 때
- **로그인 세션이 만료**되었을 때
- **환경 변수가 설정되지 않았을 때**

## 해결 방법

### 1. Vercel 환경 변수 설정 (필수)

Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**에서 다음을 **반드시** 추가하세요:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `AUTH_SECRET` | (랜덤 문자열) | **필수** — `openssl rand -base64 32`로 생성 |
| `AUTH_TRUST_HOST` | true | **필수** — Vercel 배포용 |
| `AUTH_ADMIN_EMAIL` | admin@example.com | 로그인 이메일 |
| `AUTH_ADMIN_PASSWORD` | (비밀번호) | 로그인 비밀번호 |

**중요:** `AUTH_SECRET`이 없으면 "Server error"가 발생합니다. 터미널에서 `openssl rand -base64 32`를 실행해 생성한 값을 넣으세요.

### 2. 로컬 개발 (.env.local)

```env
AUTH_ADMIN_EMAIL=admin@example.com
AUTH_ADMIN_PASSWORD=your-password
AUTH_SECRET=your-secret
AUTH_TRUST_HOST=true
NEXTAUTH_URL=http://localhost:3000
```

### 3. 로그인

1. `/admin/login` 페이지로 이동
2. 설정한 이메일과 비밀번호 입력
3. 로그인 후 실험 생성 가능

## 보안 참고

- `AUTH_ADMIN_PASSWORD`는 충분히 강한 비밀번호를 사용하세요.
- 프로덕션에서는 환경 변수를 안전하게 관리하세요.
