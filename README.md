# A/B 테스트 플랫폼

행동 기반 노코드 A/B 테스트 플랫폼

## 설정

```bash
npm install
cp .env.example .env
# .env에 DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL 설정
npx prisma generate
npx prisma db push  # 또는 migrate dev
npm run dev
```

## 폴더 구조

`STRUCTURE.md` 참고

## API

- `POST /api/assign` - variant 할당 (experimentKey, userId)
- `POST /api/events` - 이벤트 로깅
- `GET/POST /api/experiments` - 실험 목록/생성
- `GET/PATCH /api/experiments/[id]` - 실험 상세/수정
- `GET /api/reports/[id]` - 리포트 (관리자)
