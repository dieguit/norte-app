import { describe, expect, it } from 'vitest';
import { validateEnv } from './env';

describe('validateEnv', () => {
  const validEnv = {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    NODE_ENV: 'development',
    PORT: '3000',
    CLERK_SECRET_KEY: 'placeholder',
    CLERK_ISSUER_URL: 'https://clerk.example.test',
    CLERK_AUTHORIZED_PARTIES: 'http://localhost:3100',
    LLM_BASE_URL: 'http://localhost:20128/v1',
    LLM_API_KEY: 'llm-key',
    LLM_MODEL: 'agy/gemini-3.8-flash-low',
    LLM_GUARD_MODEL: 'agy-flash-lite',
    MASTRA_API_KEY: 'mastra-key',
  };

  it('returns parsed env when all required vars are present', () => {
    const result = validateEnv(validEnv);
    expect(result.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
  });

  it('throws when DATABASE_URL is missing', () => {
    const rest = { NODE_ENV: validEnv.NODE_ENV, PORT: validEnv.PORT };
    expect(() => validateEnv(rest)).toThrow();
  });

  it('throws when DATABASE_URL is not a valid URL', () => {
    expect(() =>
      validateEnv({ ...validEnv, DATABASE_URL: 'not-a-url' }),
    ).toThrow();
  });

  it('throws when NODE_ENV is invalid', () => {
    expect(() => validateEnv({ ...validEnv, NODE_ENV: 'staging' })).toThrow();
  });

  it('defaults PORT to 3000 when missing', () => {
    const rest = { ...validEnv, PORT: undefined };
    const result = validateEnv(rest);
    expect(result.PORT).toBe(3000);
  });

  it('defaults NODE_ENV to development when missing', () => {
    const rest = { ...validEnv, NODE_ENV: undefined };
    const result = validateEnv(rest);
    expect(result.NODE_ENV).toBe('development');
  });

  it('throws when PORT is not a valid number', () => {
    expect(() => validateEnv({ ...validEnv, PORT: 'abc' })).toThrow();
  });

  it('throws when PORT is out of range', () => {
    expect(() => validateEnv({ ...validEnv, PORT: '99999' })).toThrow();
  });

  it.each(['MASTRA_API_KEY'])('throws when %s is missing', (key) => {
    expect(() => validateEnv({ ...validEnv, [key]: undefined })).toThrow(key);
  });

  it('accepts omitted model overrides and provider credentials', () => {
    const result = validateEnv({
      ...validEnv,
      LLM_MODEL: undefined,
      LLM_GUARD_MODEL: undefined,
      LLM_BASE_URL: undefined,
      LLM_API_KEY: undefined,
    });
    expect(result.LLM_MODEL).toBeUndefined();
    expect(result.LLM_GUARD_MODEL).toBeUndefined();
  });

  it('normalizes unique raw IDs and accepts direct OpenAI aliases', () => {
    expect(validateEnv(validEnv).LLM_MODEL).toBe('agy-flash-low');
    expect(
      validateEnv({
        ...validEnv,
        LLM_MODEL: 'openai-gpt-6-luna',
        OPENAI_API_KEY: 'key',
      }).OPENAI_API_KEY,
    ).toBe('key');
  });

  it('rejects unknown model overrides', () => {
    expect(() => validateEnv({ ...validEnv, LLM_MODEL: 'unknown' })).toThrow(
      'LLM_MODEL',
    );
  });

  it('throws when LLM_BASE_URL is not a valid URL', () => {
    expect(() =>
      validateEnv({ ...validEnv, LLM_BASE_URL: 'not-a-url' }),
    ).toThrow('LLM_BASE_URL');
  });

  it('leaves CHAT_CHANNEL unset by default and does not require WEB_APP_URL', () => {
    const result = validateEnv(validEnv);
    expect(result.CHAT_CHANNEL).toBeUndefined();
    expect(result.WEB_APP_URL).toBeUndefined();
  });

  it('requires WEB_APP_URL when CHAT_CHANNEL is set', () => {
    expect(() =>
      validateEnv({ ...validEnv, CHAT_CHANNEL: 'whatsapp' }),
    ).toThrow(/WEB_APP_URL/);
    expect(() =>
      validateEnv({
        ...validEnv,
        CHAT_CHANNEL: 'telegram',
        TELEGRAM_BOT_TOKEN: 'bot-token',
      }),
    ).toThrow(/WEB_APP_URL/);
  });

  it('parses WhatsApp settings when CHAT_CHANNEL is whatsapp', () => {
    const result = validateEnv({
      ...validEnv,
      CHAT_CHANNEL: 'whatsapp',
      WHATSAPP_PHONE_NUMBER: '5491112345678',
      WEB_APP_URL: 'https://app.norte.test',
    });
    expect(result.CHAT_CHANNEL).toBe('whatsapp');
    expect(result.WHATSAPP_PHONE_NUMBER).toBe('5491112345678');
    expect(result.WEB_APP_URL).toBe('https://app.norte.test');
  });

  it('requires a valid WHATSAPP_PHONE_NUMBER when CHAT_CHANNEL is whatsapp', () => {
    const env = {
      ...validEnv,
      CHAT_CHANNEL: 'whatsapp',
      WEB_APP_URL: 'https://app.norte.test',
    };
    expect(() => validateEnv(env)).toThrow(/WHATSAPP_PHONE_NUMBER/);
    expect(() =>
      validateEnv({ ...env, WHATSAPP_PHONE_NUMBER: '+5491112345678' }),
    ).toThrow(/WHATSAPP_PHONE_NUMBER/);
  });

  it('requires TELEGRAM_BOT_TOKEN when CHAT_CHANNEL is telegram', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        CHAT_CHANNEL: 'telegram',
        WEB_APP_URL: 'https://app.norte.test',
      }),
    ).toThrow(/TELEGRAM_BOT_TOKEN/);

    const result = validateEnv({
      ...validEnv,
      CHAT_CHANNEL: 'telegram',
      WEB_APP_URL: 'https://app.norte.test',
      TELEGRAM_BOT_TOKEN: '123456:ABC-DEF',
    });
    expect(result.CHAT_CHANNEL).toBe('telegram');
    expect(result.TELEGRAM_BOT_TOKEN).toBe('123456:ABC-DEF');
  });

  it('throws when CHAT_CHANNEL is invalid', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        CHAT_CHANNEL: 'discord',
        WEB_APP_URL: 'https://app.norte.test',
      }),
    ).toThrow(/CHAT_CHANNEL/);
  });

  it('defaults PostHog to disabled with the US host', () => {
    const result = validateEnv(validEnv);
    expect(result.POSTHOG_TOKEN).toBeUndefined();
    expect(result.POSTHOG_HOST).toBe('https://us.i.posthog.com');
  });

  it('accepts a PostHog token and host', () => {
    const result = validateEnv({
      ...validEnv,
      POSTHOG_TOKEN: 'phc_test',
      POSTHOG_HOST: 'https://eu.i.posthog.com',
    });
    expect(result.POSTHOG_TOKEN).toBe('phc_test');
    expect(result.POSTHOG_HOST).toBe('https://eu.i.posthog.com');
  });

  it('rejects an invalid PostHog host', () => {
    expect(() =>
      validateEnv({ ...validEnv, POSTHOG_HOST: 'not-a-url' }),
    ).toThrow();
  });
});
