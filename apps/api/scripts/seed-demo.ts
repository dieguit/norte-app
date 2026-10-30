import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  allocationPlanEntries,
  allocationPlanSnapshots,
  expenseSources,
  expenses,
  financialGoals,
  financialProfiles,
  goalCompletionWithdrawals,
  goalInvestmentPositions,
  goalSavingsPositions,
  incomes,
  investmentContributionAllocations,
  investmentContributions,
  savingContributionAllocations,
  savingContributions,
  savingsPlaceTransfers,
  savingsPlaces,
  schema,
} from '../src/database/schema';

const userId = process.env.DEMO_USER_ID ?? 'user_3Hy7BPwRiZVJCzVVVRc5Er8Pqin';

// Months are relative to today: m(11) = eleven months ago, m(0) = current month.
const now = new Date();
const m = (offset: number) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1)).toISOString().slice(0, 10);
const at = (offset: number, day: number) =>
  new Date(`${m(offset).slice(0, 8)}${String(day).padStart(2, '0')}T12:00:00Z`);
const endOf = (offset: number) => {
  const d = new Date(m(offset));
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 18));
};
const HISTORY = 11;
const AGUINALDO = [10, 4];

type Kind = (typeof expenses.$inferInsert)['sourceKind'];
// Each month: one-time expenses = 342,000 + freelance, so the balance stays at 1,300,000.
const months: Record<number, { freelance?: [string, number]; items: Array<[Kind, string, number]> }> = {
  11: { items: [['clothing', 'Zapatillas', 182000], ['gift', 'Regalo de cumpleaños', 160000]] },
  10: { items: [['gift', 'Regalos de Navidad', 220000], ['travel_leisure', 'Cena de fin de año', 122000]] },
  9: {
    freelance: ['Diseño de logo', 300000],
    items: [['travel_leisure', 'Vacaciones en la costa', 520000], ['occasional_health', 'Farmacia', 122000]],
  },
  8: { items: [['maintenance', 'Arreglo de canilla', 142000], ['technology', 'Teclado y mouse', 200000]] },
  7: {
    freelance: ['Landing para cliente', 400000],
    items: [['technology', 'Auriculares', 180000], ['occasional_health', 'Dentista', 250000], ['clothing', 'Ropa de otoño', 312000]],
  },
  6: { items: [['insurance', 'Seguro de hogar anual', 200000], ['travel_leisure', 'Cine y salidas', 142000]] },
  5: { items: [['taxes_fees', 'Impuesto inmobiliario', 160000], ['gift', 'Regalo de casamiento', 182000]] },
  4: { items: [['clothing', 'Campera de invierno', 250000], ['occasional_health', 'Farmacia', 92000]] },
  3: {
    freelance: ['Mantenimiento web', 350000],
    items: [['travel_leisure', 'Escapada de vacaciones de invierno', 500000], ['uncategorized', 'Libros', 192000]],
  },
  2: { items: [['clothing', 'Zapatillas running', 182000], ['gift', 'Regalo de cumpleaños', 160000]] },
  1: {
    freelance: ['Landing para cliente', 400000],
    items: [['technology', 'Arreglo notebook', 420000], ['travel_leisure', 'Escapada de fin de semana', 322000]],
  },
  0: {
    freelance: ['Rediseño de tienda online', 250000],
    items: [['occasional_health', 'Farmacia', 92000], ['gift', 'Regalo día de la madre', 250000], ['travel_leisure', 'Recital', 250000]],
  },
};
const usdRates = [1450, 1465, 1480];

type Tx = Parameters<Parameters<ReturnType<typeof drizzle<typeof schema>>['transaction']>[0]>[0];

async function reset(tx: Tx) {
  const goalIds = (
    await tx.select({ id: financialGoals.id }).from(financialGoals).where(eq(financialGoals.userId, userId))
  ).map((g) => g.id);
  if (goalIds.length)
    await tx.delete(goalCompletionWithdrawals).where(inArray(goalCompletionWithdrawals.goalId, goalIds));
  await tx.delete(savingContributions).where(eq(savingContributions.userId, userId));
  await tx.delete(investmentContributions).where(eq(investmentContributions.userId, userId));
  await tx.delete(savingsPlaceTransfers).where(eq(savingsPlaceTransfers.userId, userId));
  await tx.delete(financialGoals).where(eq(financialGoals.userId, userId));
  await tx.delete(financialProfiles).where(eq(financialProfiles.userId, userId));
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query<{ db: string }>('select current_database() as db');
  if (rows[0]?.db !== 'norte') throw new Error(`Refusing to seed database "${rows[0]?.db}"`);
  const db = drizzle(pool, { schema });

  await db.transaction(async (tx) => {
    await reset(tx);

    await tx.insert(financialProfiles).values({
      userId,
      baseCurrency: 'ARS',
      expensesKnowledge: 'known',
      plannedMonthlyContribution: '1040000.00',
      goalDedicationPercentage: '80.00',
      onboardingCompleted: true,
      createdAt: at(HISTORY, 1),
    });

    await tx.insert(incomes).values([
      { userId, sourceKind: 'salary', concept: 'Sueldo', amount: '3470000.00', currency: 'ARS', recurring: true, effectiveMonth: m(HISTORY) },
      ...AGUINALDO.map((offset) => ({
        userId, sourceKind: 'bonus', concept: 'Aguinaldo', amount: '1735000.00', currency: 'ARS', recurring: false, effectiveMonth: m(offset),
      })),
      ...Object.entries(months).flatMap(([offset, { freelance }]) =>
        freelance
          ? [{
              userId, sourceKind: 'independent', concept: freelance[0], amount: `${freelance[1]}.00`,
              currency: 'ARS', recurring: false, effectiveMonth: m(Number(offset)),
            }]
          : [],
      ),
    ]);

    const [supermercado] = await tx
      .insert(expenseSources)
      .values({ userId, name: 'Supermercado', normalizedName: 'supermercado' })
      .returning({ id: expenseSources.id });
    const recurring = { userId, currency: 'ARS', recurring: true, effectiveMonth: m(HISTORY), endMonth: null };
    await tx.insert(expenses).values([
      { ...recurring, sourceKind: 'housing', concept: 'Alquiler departamento', amount: '950000.00' },
      { ...recurring, sourceKind: 'subscriptions', concept: 'Netflix', amount: '15000.00' },
      { ...recurring, sourceKind: 'subscriptions', concept: 'Disney+', amount: '13000.00' },
      { ...recurring, sourceKind: 'utilities', concept: 'Luz, gas e internet', amount: '120000.00' },
      { ...recurring, sourceKind: 'health', concept: 'Prepaga', amount: '280000.00' },
      { ...recurring, sourceKind: 'custom', sourceId: supermercado.id, concept: 'Supermercado', amount: '450000.00' },
      ...Object.entries(months).flatMap(([offset, { items }]) =>
        items.map(([sourceKind, concept, amount]) => ({
          userId, sourceKind, concept, amount: `${amount}.00`, currency: 'ARS',
          recurring: false, effectiveMonth: m(Number(offset)), endMonth: null,
        })),
      ),
    ]);

    const [colchon, depto, auto] = await tx
      .insert(financialGoals)
      .values([
        {
          userId, name: 'Colchón financiero', type: 'emergency_fund', targetAmount: '2080000.00', currency: 'ARS',
          priority: 'high', strategy: 'save', status: 'completed', completedAt: endOf(10), emergencyFundMonths: 1,
          createdAt: at(HISTORY, 1),
        },
        {
          userId, name: 'Comprar departamento', type: 'purchase', targetAmount: '20000.00', currency: 'USD',
          priority: 'high', strategy: 'invest', status: 'active', desiredDate: '2029-12-01', createdAt: at(10, 15),
        },
        {
          userId, name: 'Cambiar auto', type: 'purchase', targetAmount: '6000000.00', currency: 'ARS',
          priority: 'medium', strategy: 'save', status: 'active', desiredDate: '2027-06-01', createdAt: at(9, 1),
        },
      ])
      .returning({ id: financialGoals.id });

    // Contributions total USD 6,500; the extra 300 is accrued return (34% of 20,000).
    const [deptoPosition] = await tx
      .insert(goalInvestmentPositions)
      .values({
        goalId: depto.id, currentValue: '6800.00', currency: 'USD', annualReturnRate: '4.000',
        availability: 'available_now', createdAt: at(10, 15),
      })
      .returning({ id: goalInvestmentPositions.id });

    const [mp] = await tx
      .insert(savingsPlaces)
      .values({ userId, name: 'Mercado Pago', normalizedName: 'mercado pago', createdAt: at(HISTORY, 1) })
      .returning({ id: savingsPlaces.id });

    const plan = async (offset: number, entries: Array<[string, string]>) => {
      const [snapshot] = await tx
        .insert(allocationPlanSnapshots)
        .values({ userId, effectiveMonth: m(offset), plannedMonthlyContribution: '1040000.00' })
        .returning({ id: allocationPlanSnapshots.id });
      await tx.insert(allocationPlanEntries).values(
        entries.map(([goalId, percentage]) => ({ snapshotId: snapshot.id, goalId, percentage })),
      );
    };
    // From Jan: 60% depto = USD 416/month at planning rate, 40% auto = ARS 416,000/month.
    await plan(HISTORY, [[colchon.id, '100.00']]);
    await plan(9, [[depto.id, '60.00'], [auto.id, '40.00']]);

    // Mirrors persistSavingContribution: one position + allocation per goal.
    const save = async (goalId: string, amount: number, createdAt: Date) => {
      const value = `${amount}.00`;
      const [contribution] = await tx
        .insert(savingContributions)
        .values({ userId, amount: value, currency: 'ARS', placeId: mp.id, createdAt })
        .returning({ id: savingContributions.id });
      const [position] = await tx
        .insert(goalSavingsPositions)
        .values({ goalId, amount: value, currency: 'ARS', createdAt })
        .returning({ id: goalSavingsPositions.id });
      await tx.insert(savingContributionAllocations).values({
        contributionId: contribution.id, goalId, amount: value, percentage: '100.00',
        savingPositionId: position.id, createdAt,
      });
    };
    // Mirrors persistInvestmentContribution: USD bought with pesos, allocated to the goal's position.
    const invest = async (usd: number, rate: number, createdAt: Date) => {
      const [contribution] = await tx
        .insert(investmentContributions)
        .values({
          userId, amount: `${usd}.00`, currency: 'USD', arsSpent: `${usd * rate}.00`,
          effectiveRate: `${rate}.00`, createdAt,
        })
        .returning({ id: investmentContributions.id });
      await tx.insert(investmentContributionAllocations).values({
        contributionId: contribution.id, goalId: depto.id, amount: `${usd}.00`, percentage: '100.00',
        investmentPositionId: deptoPosition.id, createdAt,
      });
    };

    await save(colchon.id, 1040000, at(11, 5));
    await save(colchon.id, 1040000, at(10, 5));
    for (const offset of AGUINALDO) await invest(1150, 1480, at(offset, 20));
    for (let offset = 9; offset >= 0; offset--) {
      await invest(420, usdRates[offset % usdRates.length], at(offset, 5));
      if (offset > 0) await save(auto.id, 420000, at(offset, 5));
    }
    await save(auto.id, 240000, at(0, 10));
  });

  await pool.end();
  console.log(`Seeded demo data for ${userId} (${m(HISTORY)} → ${m(0)})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
