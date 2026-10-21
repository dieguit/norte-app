import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { type Source, sources } from '../sources';

export function createSourceTools(list: Source[] = sources) {
  return {
    readSource: createTool({
      id: 'read-source',
      description:
        "Reads one of Norte's curated sources by slug (see 'Fuentes disponibles'). Use before answering tips, education or how-it-works questions.",
      inputSchema: z.object({ slug: z.string() }),
      execute: async ({ slug }) => {
        const source = list.find((candidate) => candidate.slug === slug);
        if (!source)
          return {
            error: 'Fuente inexistente.',
            validSlugs: list.map((candidate) => candidate.slug),
          };
        return { title: source.title, url: source.url, body: source.body };
      },
    }),
  };
}
