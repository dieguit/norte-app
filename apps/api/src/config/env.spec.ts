import { describe, expect, it } from 'vitest';
import { validateEnv } from './env';

describe('validateEnv', () => {
  const validEnv = {
    DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
    NODE_ENV: 'development',
    PORT: '3001',
    CLERK_SECRET_KEY: 'placeholder',
    CLERK_ISSUER_URL: 'https://clerk.example.test',
    CLERK_AUTHORIZED_PARTIES: 'http://localhost:3100',
  };

  it('returns parsed env when all required vars are present', () => {
    const result = validateEnv(validEnv);
    expect(result.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3001);
    expect(result.WHATSAPP_ENABLED).toBe(true);
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

  it('defaults PORT to 3001 when missing', () => {
    const rest = { ...validEnv, PORT: undefined };
    const result = validateEnv(rest);
    expect(result.PORT).toBe(3001);
  });

  it('defaults NODE_ENV to development when missing', () => {
    const rest = { ...validEnv, NODE_ENV: undefined };
    const result = validateEnv(rest);
    expect(result.NODE_ENV).toBe('development');
  });

  it('parses WHATSAPP_ENABLED=false', () => {
    expect(validateEnv({ ...validEnv, WHATSAPP_ENABLED: 'false' }).WHATSAPP_ENABLED).toBe(false);
  });

  it('throws when PORT is not a valid number', () => {
    expect(() => validateEnv({ ...validEnv, PORT: 'abc' })).toThrow();
  });

  it('throws when PORT is out of range', () => {
    expect(() => validateEnv({ ...validEnv, PORT: '99999' })).toThrow();
  });
});
