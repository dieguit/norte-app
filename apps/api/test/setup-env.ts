process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://norte:norte@localhost:5434/norte_test';
process.env.CLERK_SECRET_KEY = 'test-placeholder';
process.env.CLERK_ISSUER_URL = 'https://clerk.test.local';
process.env.CLERK_AUTHORIZED_PARTIES = 'http://localhost:3100';
process.env.LLM_BASE_URL = 'http://127.0.0.1:4999/v1';
process.env.LLM_API_KEY = 'test-llm-key';
process.env.LLM_MODEL = 'cx/gpt-5.5';
process.env.MASTRA_API_KEY = 'test-mastra-key';
