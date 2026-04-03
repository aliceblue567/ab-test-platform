export default function InsightScreensPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold">화면 분석</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        여기에 업로드·URL 캡처 UI와 분석 엔진 연동을 붙입니다. API는{" "}
        <code className="rounded bg-muted px-1">/api/ux-insight/...</code> 만 사용하고,{" "}
        <code className="rounded bg-muted px-1">experiments</code>·
        <code className="rounded bg-muted px-1">guidelines</code> 테이블과 조인하지 않습니다.
      </p>
    </div>
  );
}
