# Vercel Blob Storage 연결 가이드

이미지 파일 업로드(5MB 이하)를 사용하려면 Vercel Blob Storage를 연결해주세요.

## 연결 방법

1. [Vercel 대시보드](https://vercel.com) 접속
2. **ab-test-platform** 프로젝트 선택
3. 상단 **Storage** 탭 클릭
4. **Create Database** → **Blob** 선택
5. 저장소 이름 입력 후 생성
6. 생성된 Blob을 프로젝트에 **Connect** (연결)
7. 환경 변수 `BLOB_READ_WRITE_TOKEN`이 자동으로 설정됨
8. **Redeploy** (재배포) 실행

## Blob 없이 사용하기

- **이미지 URL**: 외부 이미지 URL을 직접 입력하면 Blob 없이 사용 가능
- **소형 이미지 (50KB 이하)**: Blob 미설정 시 자동으로 base64로 저장 (제한적)

## 로컬 개발

로컬에서 파일 업로드를 테스트하려면 `.env.local`에 다음을 추가하세요:

```
BLOB_READ_WRITE_TOKEN=your_token_here
```

토큰은 Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에서 확인할 수 있습니다.
