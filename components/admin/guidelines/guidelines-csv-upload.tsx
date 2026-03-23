"use client";

import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  normalizeImportRow,
  type GuidelineImportRow,
} from "@/lib/ux-writing/guideline-import";
import { cn } from "@/lib/utils";

const SAMPLE_FIELDS = [
  "category",
  "rule_name",
  "description",
  "example_bad",
  "example_good",
] as const;

const SAMPLE_ROW = [
  "일반",
  "해요체 사용",
  "모든 문장은 해요체로 끝냅니다.",
  "확인함",
  "확인해요",
];

function downloadSampleGuidelinesCsv() {
  const csv = Papa.unparse(
    {
      fields: [...SAMPLE_FIELDS],
      data: [SAMPLE_ROW],
    },
    { quotes: true }
  );
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "guidelines-sample.csv";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function pickField(
  raw: Record<string, unknown>,
  canonical: string
): unknown {
  for (const [k, v] of Object.entries(raw)) {
    const nk = k.replace(/^\uFEFF/, "").trim().toLowerCase();
    if (nk === canonical) return v;
  }
  return undefined;
}

const toolbarBtn =
  "h-9 min-h-9 gap-2 px-3 sm:px-4 text-sm font-medium";

type Props = {
  onImported: () => void;
  disabled?: boolean;
  className?: string;
};

export function GuidelinesCsvUpload({ onImported, disabled, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const runImport = useCallback(
    async (items: GuidelineImportRow[]) => {
      setUploading(true);
      try {
        const res = await fetch("/api/guidelines/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          toast.error("로그인이 필요합니다.");
          return;
        }
        if (!res.ok) {
          toast.error(
            typeof data.error === "string"
              ? data.error
              : "업로드에 실패했습니다."
          );
          return;
        }
        const n =
          typeof data.count === "number" ? data.count : items.length;
        toast.success(`${n}개의 가이드라인이 업데이트되었습니다`);
        onImported();
      } catch {
        toast.error("네트워크 오류가 발생했습니다.");
      } finally {
        setUploading(false);
      }
    },
    [onImported]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      setUploading(true);
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: "greedy",
        complete: (results) => {
          const data = results.data ?? [];
          const skipped: number[] = [];
          const rows: GuidelineImportRow[] = [];

          data.forEach((raw, index) => {
            const row = normalizeImportRow({
              category: pickField(raw, "category"),
              rule_name: pickField(raw, "rule_name"),
              description: pickField(raw, "description"),
              example_bad: pickField(raw, "example_bad"),
              example_good: pickField(raw, "example_good"),
            });
            if (row) rows.push(row);
            else skipped.push(index + 2);
          });

          if (rows.length === 0) {
            setUploading(false);
            toast.error(
              "유효한 행이 없습니다. 헤더(category, rule_name, description, example_bad, example_good)와 필수 값을 확인해 주세요."
            );
            return;
          }

          if (skipped.length > 0) {
            toast.warning(
              `${skipped.length}개 행을 건너뛰었습니다(필수 값 누락 등).`
            );
          }

          void runImport(rows);
        },
        error: (err) => {
          setUploading(false);
          toast.error(`CSV 파싱 오류: ${err.message}`);
        },
      });
    },
    [runImport]
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onFileChange}
      />
      <Button
        type="button"
        variant="outline"
        className={toolbarBtn}
        disabled={disabled || uploading}
        aria-label="CSV 파일 업로드"
        onClick={() => inputRef.current?.click()}
      >
        <Upload
          className={cn("h-4 w-4 shrink-0", uploading && "animate-pulse")}
        />
        {uploading ? "처리 중…" : "CSV 업로드"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={toolbarBtn}
        disabled={disabled || uploading}
        aria-label="샘플 CSV 양식 다운로드"
        onClick={() => downloadSampleGuidelinesCsv()}
      >
        <Download className="h-4 w-4 shrink-0" />
        샘플 양식 받기
      </Button>
    </div>
  );
}
