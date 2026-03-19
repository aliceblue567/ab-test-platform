# A/B 테스트 플랫폼 - 폴더 구조

```
cursor/
├── app/
│   ├── (admin)/              # 관리자 영역 (인증 필요)
│   │   ├── admin/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── experiments/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── reports/
│   │   │   └── audit/page.tsx
│   │   └── layout.tsx
│   ├── (public)/             # 테스트 영역 (public)
│   │   ├── test/
│   │   │   └── [experimentKey]/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── experiments/
│   │   ├── assign/
│   │   ├── events/
│   │   └── reports/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                   # shadcn/ui
│   ├── admin/
│   ├── test/                 # JSON payload 렌더러
│   └── reports/
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── assignment.ts
│   ├── stats.ts
│   └── utils.ts
├── prisma/
│   └── schema.prisma
└── types/
```
