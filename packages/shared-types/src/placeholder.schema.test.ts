import { describe, expect, it } from 'vitest';
import {
  CreatePlaceholderItemSchema,
  PlaceholderItemSchema,
} from './placeholder.schema';

describe('placeholder schemas', () => {
  it('parses a valid placeholder item', () => {
    const item = PlaceholderItemSchema.parse({
      id: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      title: 'TODO: replace this placeholder',
      description: 'TODO: wire this to real app data later',
      status: 'todo',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });

    expect(item.title).toBe('TODO: replace this placeholder');
  });

  it('rejects create payloads without a title', () => {
    const result = CreatePlaceholderItemSchema.safeParse({
      description: 'TODO: missing title should fail',
    });

    expect(result.success).toBe(false);
  });
});
