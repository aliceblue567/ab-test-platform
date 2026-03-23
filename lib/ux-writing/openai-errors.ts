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

export function mapOpenAIError(err: unknown): UxWritingCheckFailed {
  if (err instanceof UxWritingCheckFailed) return err;

  const status = readStatus(err);
  const msg = readMessage(err);

  if (status === 429) {
    return new UxWritingCheckFailed(
      "OpenAI 호출 한도(분당·일일 등)에 걸렸습니다. 1~2분 뒤 다시 시도하거나, platform.openai.com 에서 사용량·요금제를 확인해 주세요.",
      "rate_limit",
      429
    );
  }
  if (status === 503 || status === 502) {
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
