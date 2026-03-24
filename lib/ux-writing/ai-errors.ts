export type UxWritingFailureKind =
  | "rate_limit"
  | "timeout"
  | "overloaded"
  | "validation"
  | "unknown";

export class UxWritingCheckFailed extends Error {
  readonly kind: UxWritingFailureKind;
  readonly statusCode: number;

  constructor(
    message: string,
    kind: UxWritingFailureKind,
    statusCode: number = 502
  ) {
    super(message);
    this.name = "UxWritingCheckFailed";
    this.kind = kind;
    this.statusCode = statusCode;
  }
}

function readStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const s = (err as { status?: unknown }).status;
  return typeof s === "number" ? s : undefined;
}

function readMessage(err: unknown): string {
  if (typeof err !== "object" || err === null) return "";
  const m = (err as { message?: unknown }).message;
  return typeof m === "string" ? m : "";
}

export function mapAiError(err: unknown): UxWritingCheckFailed {
  if (err instanceof UxWritingCheckFailed) return err;

  const status = readStatus(err);
  const msg = readMessage(err);

  if (status === 429) {
    return new UxWritingCheckFailed(
      "AI 서비스 호출 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.",
      "rate_limit",
      429
    );
  }
  if (status === 503 || status === 502 || status === 500) {
    return new UxWritingCheckFailed(
      "AI 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      "overloaded",
      503
    );
  }

  const cause =
    typeof err === "object" && err !== null && "cause" in err
      ? (err as { cause: unknown }).cause
      : undefined;
  const causeCode =
    typeof cause === "object" && cause !== null && "code" in cause
      ? String((cause as { code: unknown }).code)
      : "";

  if (
    /UX_WRITING_TIMEOUT/.test(msg) ||
    causeCode === "ETIMEDOUT" ||
    /timeout/i.test(msg) ||
    /timed out/i.test(msg)
  ) {
    return new UxWritingCheckFailed(
      "응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.",
      "timeout",
      504
    );
  }

  return new UxWritingCheckFailed(
    "검수 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    "unknown",
    502
  );
}
