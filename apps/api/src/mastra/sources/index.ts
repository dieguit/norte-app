import { comoFuncionaNorte } from './como-funciona-norte';
import { fondoDeEmergencia } from './fondo-de-emergencia';
import type { Source } from './types';

export type { Source } from './types';

// ponytail: index in prompt + readSource tool; switch to @mastra/rag + pgvector past ~100 docs or long PDFs.
export const sources: Source[] = [comoFuncionaNorte, fondoDeEmergencia];

export function sourcesIndex(list: Source[] = sources): string {
  return list
    .map((source) => `${source.slug}: ${source.title} — ${source.summary}`)
    .join('\n');
}
