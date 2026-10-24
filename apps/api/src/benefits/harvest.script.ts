import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from '../database/schema';
import {
  createBenefitsExtractorAgent,
  extractWith,
} from '../mastra/agents/benefits-extractor-agent';
import { CATALOG } from './catalog';
import { runHarvest } from './harvest';

const required = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
};

async function main() {
  const [slug, ...flags] = process.argv.slice(2);
  const providers = CATALOG.filter((p) => !slug || p.slug === slug);
  if (!providers.length)
    throw new Error(
      `Unknown provider ${slug}. Known: ${CATALOG.map((p) => p.slug).join(', ')}`,
    );
  const pool = new Pool({ connectionString: required('DATABASE_URL') });
  try {
    const agent = createBenefitsExtractorAgent({
      LLM_BASE_URL: required('LLM_BASE_URL'),
      LLM_API_KEY: required('LLM_API_KEY'),
      LLM_MODEL: required('LLM_MODEL'),
    });
    const results = await runHarvest(
      drizzle(pool, { schema }),
      extractWith(agent),
      providers,
      new Date(),
      { dryRun: flags.includes('--dry-run') },
    );
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
