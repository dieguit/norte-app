import { createClerkClient } from '@clerk/backend';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const BENEFITS_ADMIN_CLERK = Symbol('BENEFITS_ADMIN_CLERK');
export const benefitsAdminClerkProvider = {
  provide: BENEFITS_ADMIN_CLERK,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    createClerkClient({ secretKey: config.getOrThrow('CLERK_SECRET_KEY') }),
};

@Injectable()
export class BenefitsAdminGuard implements CanActivate {
  constructor(
    @Inject(BENEFITS_ADMIN_CLERK)
    private readonly clerk: Pick<ReturnType<typeof createClerkClient>, 'users'>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id: string } }>();
    try {
      if (request.user?.id) {
        const user = await this.clerk.users.getUser(request.user.id);
        if (user.publicMetadata.role === 'admin') return true;
      }
    } catch {
      throw new ForbiddenException();
    }
    throw new ForbiddenException();
  }
}
