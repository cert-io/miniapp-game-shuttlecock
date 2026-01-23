export enum SdkErrorCode {
  PASSKEY_CANCELLED = "PASSKEY_CANCELLED",
  NO_CREDENTIALS = "NO_CREDENTIALS",
  INVALID_ACCOUNT = "INVALID_ACCOUNT",
  PENDING_PASSKEY_REGISTRATION = "PENDING_PASSKEY_REGISTRATION",
  RELAYER_ERROR = "RELAYER_ERROR",
  NO_TICKET = "NO_TICKET",
  UNKNOWN = "UNKNOWN",
}

export class SdkError extends Error {
  public readonly code: SdkErrorCode;
  public readonly details?: unknown;
  public readonly cause?: unknown;
  public readonly relayerCode?: string;
  public readonly requestId?: string;
  public readonly httpStatus?: number;

  constructor(args: {
    code: SdkErrorCode;
    message: string;
    details?: unknown;
    cause?: unknown;
    relayerCode?: string;
    requestId?: string;
    httpStatus?: number;
  }) {
    super(args.message);
    this.name = "SdkError";
    this.code = args.code;
    this.details = args.details;
    this.cause = args.cause;
    this.relayerCode = args.relayerCode;
    this.requestId = args.requestId;
    this.httpStatus = args.httpStatus;
  }
}

export const isSdkError = (e: unknown): e is SdkError => {
  return typeof e === "object" && e !== null && (e as { name?: unknown }).name === "SdkError";
};

export const isPasskeyUserCancelled = (e: unknown): boolean => {
  // WebAuthn cancel: typically DOMException NotAllowedError/AbortError
  if (typeof e === "object" && e !== null) {
    const anyErr = e as { name?: unknown; message?: unknown };
    const name = typeof anyErr.name === "string" ? anyErr.name : "";
    const message = typeof anyErr.message === "string" ? anyErr.message : "";
    if (name === "NotAllowedError" || name === "AbortError") return true;
    const combined = `${name} ${message}`;
    return (
      combined.includes("NotAllowedError") ||
      combined.includes("AbortError") ||
      combined.includes("The operation either timed out or was not allowed") ||
      combined.includes("The request is not allowed") ||
      combined.toLowerCase().includes("cancelled")
    );
  }
  return false;
};

const getErrorMessage = (e: unknown): string => {
  return e instanceof Error ? e.message : String(e);
};

/**
 * SDK/Relayer/WebAuthn에서 올라오는 다양한 예외를 "표준 코드"로 정규화합니다.
 * UI는 이 함수의 결과(code/message)만 보고 안정적으로 처리하면 됩니다.
 */
export const normalizeSdkError = (
  e: unknown,
  ctx?: { stage?: "check" | "use" }
): SdkError => {
  if (isSdkError(e)) return e;

  // Passkey cancel
  if (isPasskeyUserCancelled(e)) {
    return new SdkError({
      code: SdkErrorCode.PASSKEY_CANCELLED,
      message: "Authentication cancelled",
      cause: e,
    });
  }

  const msg = getErrorMessage(e);

  // Missing credentials
  if (msg.includes("No passkey registered")) {
    return new SdkError({
      code: SdkErrorCode.NO_CREDENTIALS,
      message: msg,
      cause: e,
    });
  }

  // Pending registration (message from contracts.ts)
  if (msg.includes("패스키 등록 절차가 진행 중") || msg.toLowerCase().includes("pending registration")) {
    return new SdkError({
      code: SdkErrorCode.PENDING_PASSKEY_REGISTRATION,
      message: msg,
      cause: e,
    });
  }

  // Relayer/API error (thrown from parseApiResponse)
  if (typeof e === "object" && e !== null && (e as { name?: unknown }).name === "ApiResponseError") {
    const apiErr = e as {
      message?: string;
      apiCode?: string;
      requestId?: string;
      httpStatus?: number;
      details?: unknown;
    };

    const apiCode = typeof apiErr.apiCode === "string" ? apiErr.apiCode : undefined;
    const details = apiErr.details;

    // Try to map to NO_TICKET if backend provides explicit code.
    if (
      apiCode &&
      ["NO_TICKET", "INSUFFICIENT_BALANCE", "NOT_ENOUGH_BALANCE", "NO_ASSET", "NOT_OWNED"].includes(apiCode)
    ) {
      return new SdkError({
        code: SdkErrorCode.NO_TICKET,
        message: apiErr.message || msg,
        cause: e,
        relayerCode: apiCode,
        requestId: apiErr.requestId,
        httpStatus: apiErr.httpStatus,
        details,
      });
    }

    return new SdkError({
      code: SdkErrorCode.RELAYER_ERROR,
      message: apiErr.message || msg,
      cause: e,
      relayerCode: apiCode,
      requestId: apiErr.requestId,
      httpStatus: apiErr.httpStatus,
      details,
    });
  }

  // Heuristic: "insufficient" on check stage often means no ticket
  if (ctx?.stage === "check") {
    const lower = msg.toLowerCase();
    if (lower.includes("insufficient") || lower.includes("not enough") || lower.includes("no ticket")) {
      return new SdkError({
        code: SdkErrorCode.NO_TICKET,
        message: msg,
        cause: e,
      });
    }
  }

  return new SdkError({
    code: SdkErrorCode.UNKNOWN,
    message: msg,
    cause: e,
  });
};

