# 하나투어 UX 라이팅 검수 Figma 플러그인

Figma에서 프레임/섹션을 선택하면 그 안의 텍스트 노드를 모두 모아 `/api/v1/ux-writing/check`로 보내고,
가이드라인 위반 여부와 제안 문구를 패널에서 확인 → 버튼으로 노드에 바로 적용할 수 있는 내부용 플러그인입니다.

## 빌드

```bash
cd figma-plugin
npm install
npm run build
```

`dist/code.js`, `dist/ui.html`이 생성됩니다. 이 저장소를 수정할 때마다 `npm run build`를 다시 실행하세요.

## Figma에 설치 (Figma Desktop 앱 필요)

1. Figma 데스크톱 앱 실행 → 아무 파일이나 열기
2. 메뉴 → **Plugins → Development → Import plugin from manifest...**
3. 이 폴더의 `figma-plugin/manifest.json` 선택
4. 좌측 메뉴 **Plugins → Development → 하나투어 UX 라이팅 검수** 로 실행

## 사용법

1. 플러그인 실행 후 **API 설정** 펼쳐서 API 키 입력 (관리자에게 발급받은 `uxw_...` 키)
2. 서버 URL은 기본값(`https://ab-test-platform.vercel.app`) 그대로 두면 됨 — 저장
3. Figma 캔버스에서 검수할 프레임/섹션(또는 텍스트 노드 여러 개) 선택
4. **선택 영역 검수하기** 클릭 → 노드별로 원문/제안/이유/위반 규칙이 순서대로 표시됨
5. 마음에 드는 제안은 **적용하기**를 눌러야 실제 노드 텍스트가 바뀝니다 (자동 적용 없음)

## 참고

- API 키는 `uxw_` 로 시작하는 값이며, `api_keys` 테이블에 해시로만 저장됩니다. 분실 시 관리자에게 새로 발급받아야 합니다.
- 텍스트 스타일이 구간별로 다른 노드(예: 한 문장에서 일부만 볼드)에 적용하면, 적용 시 폰트는 유지되지만 구간별 스타일 정보가 원문 문자 위치 기준으로 유지되지 않을 수 있습니다 — 적용 후 스타일을 눈으로 한 번 확인하세요.
- `manifest.json`의 `networkAccess.allowedDomains`에 서버 도메인이 등록돼 있어야 요청이 나갑니다. 배포 도메인이 바뀌면 여기도 같이 수정하세요.
