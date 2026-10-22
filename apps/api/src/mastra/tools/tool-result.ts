import { HttpException, Logger } from '@nestjs/common';
import type { RequestContext } from '@mastra/core/request-context';
import { getPostHog } from '../../analytics/posthog';

const logger = new Logger('NorteTools');
const GENERIC_ERROR = 'No pude hacerlo ahora, probá de nuevo en un rato.';

function clientErrorMessage(error: unknown): string | undefined {
  // Nest HttpExceptions (BadRequest/NotFound) carry user-facing Spanish messages from the services.
  return error instanceof HttpException && error.getStatus() < 500
    ? error.message
    : undefined;
}

export async function toolResult<T>(
  id: string,
  requestContext: RequestContext | undefined,
  fn: () => T | Promise<T>,
): Promise<T | { error: string }> {
  const track = (outcome: 'ok' | 'client_error' | 'error') => {
    const userId: unknown = requestContext?.get('userId');
    if (typeof userId === 'string' && userId)
      getPostHog().capture({
        distinctId: userId,
        event: 'bot_tool_called',
        properties: { tool: id, outcome },
      });
  };
  try {
    const result = await fn();
    track(
      result && typeof result === 'object' && 'error' in result
        ? 'client_error'
        : 'ok',
    );
    return result;
  } catch (error) {
    const message = clientErrorMessage(error);
    track(message ? 'client_error' : 'error');
    if (message) return { error: message };
    logger.error(error);
    return { error: GENERIC_ERROR };
  }
}
