import { describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { BenefitsAdminGuard } from './benefits-admin.guard';

describe('BenefitsAdminGuard', () => {
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: 'user_admin' } }),
    }),
  } as ExecutionContext;
  it.each([undefined, 'member'])('denies role %s', async (role) => {
    const guard = new BenefitsAdminGuard({
      users: {
        getUser: vi.fn().mockResolvedValue({ publicMetadata: { role } }),
      },
    } as never);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('checks fresh metadata on every request', async () => {
    const getUser = vi
      .fn()
      .mockResolvedValueOnce({ publicMetadata: { role: 'admin' } })
      .mockResolvedValueOnce({ publicMetadata: {} });
    const guard = new BenefitsAdminGuard({ users: { getUser } } as never);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(getUser).toHaveBeenCalledWith('user_admin');
  });
  it('fails closed on Clerk failure', async () => {
    const guard = new BenefitsAdminGuard({
      users: { getUser: vi.fn().mockRejectedValue(new Error('offline')) },
    } as never);
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
