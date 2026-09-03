export function goalErrorMessage(error: unknown, fallback: string) {
  return (error as { message?: string } | null)?.message ?? fallback
}

export function reportGoalError(
  error: unknown,
  fallback: string,
  setServerError: (message: string) => void,
  serverErrorRef: { current: HTMLElement | null },
) {
  reportGoalMessage(goalErrorMessage(error, fallback), setServerError, serverErrorRef)
}

export function reportGoalMessage(
  message: string,
  setServerError: (message: string) => void,
  serverErrorRef: { current: HTMLElement | null },
) {
  setServerError(message)
  setTimeout(() => serverErrorRef.current?.focus(), 0)
}

export function reportGoalPreviewError<T>(
  error: unknown,
  fallback: string,
  setPreview: (preview: T | null) => void,
  setServerError: (message: string) => void,
  serverErrorRef: { current: HTMLElement | null },
) {
  setPreview(null)
  reportGoalError(error, fallback, setServerError, serverErrorRef)
}
