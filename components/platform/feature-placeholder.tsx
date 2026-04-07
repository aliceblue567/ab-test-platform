import type { ReactNode } from "react";

/** 준비 중·안내용 단순 플레이스홀더 (신규 IA 2뎁스 메뉴용) */
export function FeaturePlaceholder({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground leading-relaxed">
        {children ??
          "이 메뉴는 곧 연결될 예정입니다. 우선 기존 실험·인사이트·설정 화면에서 동일 기능을 이용해 주세요."}
      </p>
    </div>
  );
}
