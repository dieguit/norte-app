import { createHash } from 'node:crypto';
import { PostHog } from 'posthog-node';

// ponytail: module-level client so tool factories without deps can capture; inject via factory deps if tools move into Nest providers.
let client = new PostHog('disabled', { disabled: true });

export const getPostHog = () => client;

export function setPostHog(next: PostHog): PostHog {
  client = next;
  return next;
}

// Link tokens are credentials and JIDs are phone numbers; a token hash identifies the pre-link person without exposing either.
export const linkDistinctId = (token: string) =>
  `link_${createHash('sha256').update(token).digest('hex')}`;
