import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { todayInArgentina } from '../../argentina-time';

export { todayInArgentina };

export function createDateTools() {
  return {
    getCurrentDate: createTool({
      id: 'get-current-date',
      description:
        "Returns today's date (YYYY-MM-DD) and current month (YYYY-MM) in Argentina time zone. Use to resolve relative dates like 'today', 'last month', etc.",
      inputSchema: z.object({}),
      execute: () => Promise.resolve(todayInArgentina()),
    }),
  };
}
