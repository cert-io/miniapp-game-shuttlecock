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

export async function parseApiResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  let body: ApiResponse<T> | null = null;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    if (!response.ok) {
      throw new Error(fallbackMessage);
    }
    throw new Error("Invalid JSON response");
  }

  if (!response.ok) {
    const message =
      body && "error" in body && body.error?.message
        ? body.error.message
        : fallbackMessage;
    throw new Error(message);
  }

  if (!body || body.ok !== true) {
    const message =
      body && "error" in body && body.error?.message
        ? body.error.message
        : fallbackMessage;
    throw new Error(message);
  }

  return body.data;
}

