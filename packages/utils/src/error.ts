export interface ErrorWithCode extends Error {
  code: string;
}

export function getErrorMessage(
  error: unknown,
  fallback = "Unknown error",
): string {
  if (error instanceof Error) {
    return error.message.trim() || error.name || fallback;
  }

  if (typeof error === "string") {
    return error.trim() || fallback;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message.trim() || fallback;
  }

  return fallback;
}

export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(getErrorMessage(error), { cause: error });
}

export function hasErrorCode(
  error: unknown,
  code?: string,
): error is ErrorWithCode {
  if (!(error instanceof Error) || !("code" in error)) {
    return false;
  }

  if (typeof error.code !== "string") {
    return false;
  }

  return code === undefined ? true : error.code === code;
}
