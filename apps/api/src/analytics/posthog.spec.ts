import { createHash } from 'node:crypto';
import { PostHog } from 'posthog-node';
import { describe, expect, it } from 'vitest';
import { getPostHog, linkDistinctId, setPostHog } from './posthog';

describe('posthog analytics foundation', () => {
  it('linkDistinctId hashes a token with sha256 and prefixes link_', () => {
    const token = 'sample-token-123';
    const expectedHash = createHash('sha256').update(token).digest('hex');
    expect(linkDistinctId(token)).toBe(`link_${expectedHash}`);
  });

  it('setPostHog updates and returns the client instance', () => {
    const original = getPostHog();
    const fakeClient = new PostHog('fake-key', { disabled: true });
    try {
      const returned = setPostHog(fakeClient);
      expect(returned).toBe(fakeClient);
      expect(getPostHog()).toBe(fakeClient);
    } finally {
      setPostHog(original);
    }
  });
});
