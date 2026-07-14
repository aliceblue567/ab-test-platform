# 하나투어 UX 라이팅 검수 Figma 플러그인

Figma에서 프레임/섹션을 선택하면 그 안의 텍스트 노드를 모두 모아 `/api/v1/ux-writing/check`로 보내고,
가이드라인 위반 여부와 제안 문구를 패널에서 확인 → 버튼으로 노드에 바로 적용할 수 있는 내부용 플러그인입니다.

## 빌드

### 관리자용 빌드 — 팀 배포 (API 키를 미리 심어서, 팀원은 키 입력 없이 바로 사용)

```bash
cd figma-plugin
npm install
UXW_DEFAULT_API_KEY="uxw_..." npm run build
```

`UXW_DEFAULT_API_KEY`는 `build.js`가 esbuild `define`으로 `dist/code.js`에 문자열 상수로 박아 넣습니다.
**소스 코드(`src/`)나 git 커밋에는 절대 실제 키가 들어가지 않고**, 빌드 결과물인 `dist/`는 `.gitignore`에 있어 저장소(public repo)에 올라가지 않습니다.
이렇게 빌드한 `dist/` + `manifest.json`을 사내 채널(예: 사내 드라이브, Slack DM)로만 팀원에게 전달하세요 — 공개 채널에 올리면 그 안의 키가 그대로 노출됩니다.

### 개인 빌드 — 각자 키를 직접 입력하고 싶을 때

```bash
cd figma-plugin
npm install
npm run build
```

`UXW_DEFAULT_API_KEY`를 넣지 않으면 키가 비어있는 채로 빌드되고, 각 사용자가 플러그인 UI에서 직접 API 키를 입력·저장해야 합니다 (최초 1회, `clientStorage`에 로컬 저장됨).

## Figma에 설치 (Figma Desktop 앱 필요)

1. Figma 데스크톱 앱 실행 → 아무 파일이나 열기
2. 메뉴 → **Plugins → Development → Import plugin from manifest...**
3. 이 폴더의 `figma-plugin/manifest.json` 선택
4. 좌측 메뉴 **Plugins → Development → 하나투어 UX 라이팅 검수** 로 실행

## 사용법

1. (관리자 빌드로 설치했다면 API 키가 이미 채워져 있어 이 단계는 건너뛰어도 됨) **API 설정** 펼쳐서 API 키 입력 후 저장 (관리자에게 발급받은 `uxw_...` 키)
2. 서버 URL은 기본값(`https://ab-test-platform.vercel.app`) 그대로 두면 됨
3. Figma 캔버스에서 검수할 프레임/섹션(또는 텍스트 노드 여러 개) 선택
4. **선택 영역 검수하기** 클릭 → 노드별로 원문/제안/이유/위반 규칙이 순서대로 표시됨
5. 마음에 드는 제안은 **적용하기**를 눌러야 실제 노드 텍스트가 바뀝니다 (자동 적용 없음)

## 참고

- API 키는 `uxw_` 로 시작하는 값이며, `api_keys` 테이블에 해시로만 저장됩니다. 분실 시 관리자에게 새로 발급받아야 합니다.
- 텍스트 스타일이 구간별로 다른 노드(예: 한 문장에서 일부만 볼드)에 적용하면, 적용 시 폰트는 유지되지만 구간별 스타일 정보가 원문 문자 위치 기준으로 유지되지 않을 수 있습니다 — 적용 후 스타일을 눈으로 한 번 확인하세요.
- `manifest.json`의 `networkAccess.allowedDomains`에 서버 도메인이 등록돼 있어야 요청이 나갑니다. 배포 도메인이 바뀌면 여기도 같이 수정하세요.
