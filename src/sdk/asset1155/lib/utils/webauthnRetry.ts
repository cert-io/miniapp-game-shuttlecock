const INVALID_SIGNATURE_MARKER = "KeyManager__InvalidSignature()";

export const WEBAUTHN_RETRY_ERROR_MESSAGE =
  "일시적인 서명 오류가 발생하였습니다. 잠시 후 다시 시도해 주세요.";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
};

export const isInvalidSignatureError = (error: unknown) =>
  getErrorMessage(error).includes(INVALID_SIGNATURE_MARKER);

export async function retryOnInvalidSignature<T>(
  operation: () => Promise<T>,
  maxRetries = 3
) {
  let retries = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isInvalidSignatureError(error) || retries >= maxRetries) {
        throw error;
      }
      retries += 1;
    }
  }
}

