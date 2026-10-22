import { Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';
import type { Env } from '../config/env';
import { setPostHog } from './posthog';

@Module({
  providers: [
    {
      provide: PostHog,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const token = config.get('POSTHOG_TOKEN', { infer: true });
        return setPostHog(
          new PostHog(token ?? 'disabled', {
            host: config.get('POSTHOG_HOST', { infer: true }),
            disabled: !token,
          }),
        );
      },
    },
  ],
  exports: [PostHog],
})
export class AnalyticsModule implements OnApplicationShutdown {
  constructor(@Inject(PostHog) private readonly posthog: PostHog) {}

  onApplicationShutdown() {
    return this.posthog.shutdown();
  }
}
