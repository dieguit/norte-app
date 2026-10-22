import { z } from 'zod';

const envSchema = z
  .object({
    DATABASE_URL: z.url({
      message: 'DATABASE_URL must be a valid connection string',
    }),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3001),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_ISSUER_URL: z.url(),
    CLERK_AUTHORIZED_PARTIES: z
      .string()
      .transform((value) =>
        value
          .split(',')
          .map((party) => party.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url()).min(1)),
    LLM_BASE_URL: z.url(),
    LLM_API_KEY: z.string().min(1),
    LLM_MODEL: z.string().min(1),
    LLM_GUARD_MODEL: z.string().min(1),
    MASTRA_API_KEY: z.string().min(1),
    CHAT_CHANNEL: z.enum(['whatsapp', 'telegram']).optional(),
    TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
    WEB_APP_URL: z.url().optional(),
    POSTHOG_TOKEN: z.string().min(1).optional(),
    POSTHOG_HOST: z.url().default('https://us.i.posthog.com'),
  })
  .superRefine((env, ctx) => {
    if (env.CHAT_CHANNEL && !env.WEB_APP_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['WEB_APP_URL'],
        message: 'WEB_APP_URL is required when CHAT_CHANNEL is set',
      });
    }
    if (env.CHAT_CHANNEL === 'telegram' && !env.TELEGRAM_BOT_TOKEN) {
      ctx.addIssue({
        code: 'custom',
        path: ['TELEGRAM_BOT_TOKEN'],
        message: 'TELEGRAM_BOT_TOKEN is required when CHAT_CHANNEL is telegram',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  return parsed.data;
}
