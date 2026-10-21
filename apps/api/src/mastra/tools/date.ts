import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayInArgentina(now = new Date()): {
  today: string;
  month: string;
} {
  const today = formatter.format(now);
  return { today, month: today.slice(0, 7) };
}

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
