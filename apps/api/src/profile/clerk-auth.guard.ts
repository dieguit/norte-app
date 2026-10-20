import { verifyToken } from '@clerk/backend';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Env } from '../config/env';

type AuthenticatedRequest = Request & { user?: { id: string } };

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) throw new UnauthorizedException();

    try {
      const claims = await verifyToken(token, {
        secretKey: this.config.getOrThrow('CLERK_SECRET_KEY'),
        authorizedParties: this.config.getOrThrow('CLERK_AUTHORIZED_PARTIES'),
      });
      if (
        claims.iss !== this.config.getOrThrow('CLERK_ISSUER_URL') ||
        typeof claims.sub !== 'string' ||
        !claims.sub
      ) {
        throw new UnauthorizedException();
      }
      request.user = { id: claims.sub };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
