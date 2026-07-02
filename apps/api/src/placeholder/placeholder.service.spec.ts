import { NotFoundException } from '@nestjs/common';
import { PlaceholderService } from './placeholder.service';

describe('PlaceholderService', () => {
  it('creates a placeholder item with TODO defaults', () => {
    const service = new PlaceholderService();

    const item = service.create({
      title: 'TODO: replace API placeholder',
      description: 'TODO: replace with real persistence later',
    });

    expect(item.title).toBe('TODO: replace API placeholder');
    expect(item.status).toBe('todo');
    expect(item.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('throws when updating a missing placeholder item', () => {
    const service = new PlaceholderService();

    expect(() => service.update('missing-id', { status: 'done' })).toThrow(
      NotFoundException,
    );
  });
});
