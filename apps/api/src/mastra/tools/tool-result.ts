import { HttpException, Logger } from '@nestjs/common';

const logger = new Logger('NorteTools');
const GENERIC_ERROR = 'No pude hacerlo ahora, probá de nuevo en un rato.';

function clientErrorMessage(error: unknown): string | undefined {
  // Nest HttpExceptions (BadRequest/NotFound) carry user-facing Spanish messages from the services.
  return error instanceof HttpException && error.getStatus() < 500
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
