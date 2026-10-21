import type { RequestContext } from '@mastra/core/request-context';

export class MissingUserError extends Error {}

// Only the channel handler sets userId (after the account-link check); Mastra HTTP routes never do, so tools refuse there.
export function requireUserId(requestContext?: RequestContext): string {
  const userId: unknown = requestContext?.get('userId');
  if (typeof userId !== 'string' || !userId)
    throw new MissingUserError('userId missing from request context');
  return userId;
}
