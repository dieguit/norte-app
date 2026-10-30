import { comoFuncionaNorte } from './como-funciona-norte';
import { fondoDeEmergencia } from './fondo-de-emergencia';
import { queHaceNorte } from './que-hace-norte';
import type { Source } from './types';

export type { Source } from './types';

// shortcut: whole corpus inlined in the advice skill (~6 KB, saves a readSource step); move to a lookup tool or RAG past ~15 KB.
export const sources: Source[] = [
  queHaceNorte,
  comoFuncionaNorte,
  fondoDeEmergencia,
];

export function sourcesText(list: Source[] = sources): string {
  return list
    .map(
      (source) =>
        `<fuente titulo="${source.title}"${source.url ? ` url="${source.url}"` : ''}>\n${source.body.trim()}\n</fuente>`,
    )
    .join('\n\n');
}
