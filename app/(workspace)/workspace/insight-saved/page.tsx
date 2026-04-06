"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = {
  id: string;
  kind: string;
  title: string;
  updatedAt: string;
  createdAt: string;
};

export default function InsightSavedPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ux-insight/artifacts");
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } else setItems([]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("이 저장 항목을 삭제할까요?")) return;
    await fetch(`/api/ux-insight/artifacts/${id}`, { method: "DELETE" });
    load();
  }

  const kindLabel = (k: string) =>
    k === "benchmark" ? "벤치마크" : k === "flow" ? "유저 플로우" : k === "screen" ? "화면 분석" : k;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">인사이트 저장함</h1>
          <p className="text-sm text-muted-foreground mt-1">
            벤치마크·플로우·화면 분석 결과를 API로 저장한 항목이 여기에 쌓입니다.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/insight/benchmark">인사이트 Lab 열기</Link>
        </Button>
      </div>

      {loading && <p className="text-muted-foreground">불러오는 중…</p>}

      {!loading && items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            아직 저장된 항목이 없습니다. Lab에서 분석 후 앱에 연동된 &quot;저장&quot; 기능을 사용하세요.
          </CardContent>
        </Card>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{row.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kindLabel(row.kind)} ·{" "}
                    {new Date(row.updatedAt).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/api/ux-insight/artifacts/${row.id}`} target="_blank">
                      JSON
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => remove(row.id)}
                  >
                    삭제
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
