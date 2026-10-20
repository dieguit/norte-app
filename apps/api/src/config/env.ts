import { z } from 'zod';

const envSchema = z.object({
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
  WHATSAPP_ENABLED: z.preprocess((value) => value ?? 'true', z.stringbool()),
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
