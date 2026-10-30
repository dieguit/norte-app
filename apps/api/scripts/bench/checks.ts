import assert from 'node:assert/strict';

export function noWriteLoops(
  turns: Array<{ tools: string[]; repeatedCalls?: number; error?: string }>,
) {
  return turns.every((t) => !t.error && !t.repeatedCalls);
}

assert(
  noWriteLoops([
    { tools: ['previewGoalCreation'] },
    { tools: ['confirmPendingAction'] },
  ]),
);
assert(noWriteLoops([{ tools: ['recordExpenses', 'recordExpenses'] }]));
assert(
  !noWriteLoops([
    { tools: ['recordExpenses', 'recordExpenses'], repeatedCalls: 1 },
  ]),
);
assert(!noWriteLoops([{ tools: ['listGoals'], repeatedCalls: 1 }]));
assert(!noWriteLoops([{ tools: [], error: 'failed' }]));
