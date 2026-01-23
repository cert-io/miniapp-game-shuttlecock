export type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId?: string;
};

export type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export class ApiResponseError extends Error {
  public readonly name = "ApiResponseError";
  public readonly apiCode?: string;
  public readonly requestId?: string;
  public readonly httpStatus?: number;
  public readonly details?: unknown;

  constructor(args: {
    message: string;
    apiCode?: string;
    requestId?: string;
    httpStatus?: number;
    details?: unknown;
  }) {
    super(args.message);
    this.apiCode = args.apiCode;
    this.requestId = args.requestId;
    this.httpStatus = args.httpStatus;
    this.details = args.details;
  }
}

export async function parseApiResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  let body: ApiResponse<T> | null = null;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    if (!response.ok) {
      throw new ApiResponseError({
        message: fallbackMessage,
        httpStatus: response.status,
      });
    }
    throw new ApiResponseError({
      message: "Invalid JSON response",
      httpStatus: response.status,
    });
  }

  if (!response.ok) {
    const message =
      body && "error" in body && body.error?.message
        ? body.error.message
        : fallbackMessage;
    throw new ApiResponseError({
      message,
      apiCode: body && "error" in body ? body.error?.code : undefined,
      requestId: (body as { requestId?: string } | null)?.requestId,
      httpStatus: response.status,
      details: body && "error" in body ? body.error?.details : undefined,
    });
  }

  if (!body || body.ok !== true) {
    const message =
      body && "error" in body && body.error?.message
        ? body.error.message
        : fallbackMessage;
    throw new ApiResponseError({
      message,
      apiCode: body && "error" in body ? body.error?.code : undefined,
      requestId: (body as { requestId?: string } | null)?.requestId,
      httpStatus: response.status,
      details: body && "error" in body ? body.error?.details : undefined,
    });
  }

  return body.data;
}

