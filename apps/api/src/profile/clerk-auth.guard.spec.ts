import { verifyToken } from '@clerk/backend';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ClerkAuthGuard } from './clerk-auth.guard';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

const config = {
  getOrThrow: (key: string) =>
    ({
      CLERK_SECRET_KEY: 'placeholder',
      CLERK_ISSUER_URL: 'https://clerk.example.test',
      CLERK_AUTHORIZED_PARTIES: ['http://localhost:3100'],
    })[key],
};

function context(authorization?: string) {
  const request: {
    headers: { authorization?: string };
    user?: { id: string };
  } = {
    headers: { authorization },
  };
  return {
    request,
    executionContext: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as never,
  };
}

describe('ClerkAuthGuard', () => {
  it('rejects missing bearer tokens without invoking verification', async () => {
    const guard = new ClerkAuthGuard(config as never);
    const { executionContext } = context();
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('uses verified subject only after SDK signature and party verification and exact issuer check', async () => {
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'clerk-subject',
      iss: 'https://clerk.example.test',
      exp: 9999999999,
    } as never);
    const guard = new ClerkAuthGuard(config as never);
    const { executionContext, request } = context('Bearer signed-token');

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(verifyToken).toHaveBeenCalledWith('signed-token', {
      secretKey: 'placeholder',
      authorizedParties: ['http://localhost:3100'],
    });
    expect(request.user).toEqual({ id: 'clerk-subject' });
  });

  it.each([
    ['expired or invalid signature', new Error('invalid token')],
    ['wrong issuer', { sub: 'subject', iss: 'https://wrong.example.test' }],
    ['missing subject', { iss: 'https://clerk.example.test' }],
  ])('rejects %s', async (_label, result) => {
    vi.mocked(verifyToken).mockImplementationOnce(() => {
      if (result instanceof Error) return Promise.reject(result);
      return Promise.resolve(result as never);
    });
    const guard = new ClerkAuthGuard(config as never);
    const { executionContext } = context('Bearer token');
    await expect(guard.canActivate(executionContext)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
