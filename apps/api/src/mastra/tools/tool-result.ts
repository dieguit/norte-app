import { Logger } from '@nestjs/common';

const logger = new Logger('NorteTools');
const GENERIC_ERROR = 'No pude hacerlo ahora, probá de nuevo en un rato.';

function clientErrorMessage(error: unknown): string | undefined {
  // Nest HttpExceptions (BadRequest/NotFound) carry user-facing Spanish messages from the services.
  const status = (error as { getStatus?: () => number }).getStatus?.();
  return status !== undefined && status < 500 && error instanceof Error
    ? error.message
    : undefined;
}

export async function toolResult<T>(
  fn: () => Promise<T>,
): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (error) {
    const message = clientErrorMessage(error);
    if (message) return { error: message };
    logger.error(error);
    return { error: GENERIC_ERROR };
  }
}
