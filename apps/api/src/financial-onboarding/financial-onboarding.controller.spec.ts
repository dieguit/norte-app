import { verifyToken } from '@clerk/backend';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATABASE_CONNECTION } from '../database/database.constants';
import { ExpensesService } from '../expenses/expenses.service';
import { IncomesService } from '../incomes/incomes.service';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import {
  expenses,
  financialGoals,
  financialProfiles,
  incomes,
} from '../profile/profile.schema';
import { FinancialOnboardingController } from './financial-onboarding.controller';
import { FinancialOnboardingService } from './financial-onboarding.service';

vi.mock('@clerk/backend', () => ({ verifyToken: vi.fn() }));

const body = {
  goal: {
    type: 'emergency_fund',
    name: 'Fondo de emergencia',
    targetAmount: '0',
    currency: 'USD',
    desiredMonth: '',
    priority: 'high',
    strategy: 'save',
    annualReturnRate: '0',
    availability: 'available_now',
    availableFromMonth: '',
    allocations: [],
  },
  incomes: [
    {
      source: { kind: 'salary' },
      concept: 'Sueldo principal',
      amount: '500000.00',
      currency: 'ARS',
      recurring: true,
      effectiveMonth: '2026-08',
    },
  ],
  expenses: [
    {
      source: { kind: 'housing' },
      concept: 'Alquiler',
      amount: '250000.00',
      currency: 'ARS',
      recurring: true,
    },
  ],
};

function fakeDatabase(
  options: { profileExists?: boolean; failIncomeInsert?: boolean } = {},
) {
  const inserts: Array<{ table: unknown; values: Record<string, unknown> }> =
    [];
  const tx = {
    query: {
      incomeSources: { findFirst: vi.fn() },
      expenseSources: { findFirst: vi.fn() },
    },
    insert: vi.fn((table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        inserts.push({ table, values });
        if (table === incomes && options.failIncomeInsert) {
          throw new Error('Database disk error');
        }
        const row = { id: `${inserts.length}-row`, ...values };
        return {
          onConflictDoNothing: () => ({
            returning: () =>
              Promise.resolve(
                options.profileExists ? [] : [{ userId: values.userId }],
              ),
          }),
          returning: () =>
            Promise.resolve(
              table === financialGoals ? [{ id: 'goal-1' }] : [row],
            ),
        };
      },
    })),
  };
  return {
    inserts,
    database: {
      transaction: <T>(callback: (executor: typeof tx) => Promise<T>) =>
        callback(tx),
    },
  };
}

describe('/me/financial-onboarding', () => {
  let app: INestApplication;
  let database: ReturnType<typeof fakeDatabase>;
  const authorize = () =>
    vi.mocked(verifyToken).mockResolvedValue({
      sub: 'verified-user',
      iss: 'https://clerk.example.test',
    } as never);

  async function createApp(options?: Parameters<typeof fakeDatabase>[0]) {
    database = fakeDatabase(options);
    const module = await Test.createTestingModule({
      controllers: [FinancialOnboardingController],
      providers: [
        ClerkAuthGuard,
        FinancialOnboardingService,
        IncomesService,
        ExpensesService,
        { provide: DATABASE_CONNECTION, useValue: database.database },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) =>
              ({
                CLERK_SECRET_KEY: 'placeholder',
                CLERK_ISSUER_URL: 'https://clerk.example.test',
                CLERK_AUTHORIZED_PARTIES: ['http://localhost:3100'],
              })[key],
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    authorize();
    await createApp();
  });

  afterAll(async () => app?.close());

  it('requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/me/financial-onboarding')
      .send(body)
      .expect(401);
    expect(database.inserts).toHaveLength(0);
  });

  it('persists under the verified Clerk subject and rejects client-supplied owner fields', async () => {
    await request(app.getHttpServer())
      .post('/me/financial-onboarding')
      .set('Authorization', 'Bearer valid')
      .send({ ...body, userId: 'attacker' })
      .expect(400);
    expect(database.inserts).toHaveLength(0);

    await request(app.getHttpServer())
      .post('/me/financial-onboarding')
      .set('Authorization', 'Bearer valid')
      .send(body)
      .expect(201, { created: true });

    const profile = database.inserts.find(
      ({ table }) => table === financialProfiles,
    );
    expect(profile?.values).toMatchObject({ userId: 'verified-user' });
    for (const { values } of database.inserts.filter(
      ({ table }) => table !== financialProfiles,
    )) {
      if ('userId' in values) expect(values.userId).toBe('verified-user');
    }
  });

  it('returns the first Spanish validation issue as a safe 400 before writing', async () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ ...body, incomes: [] }, 'Agregá al menos un ingreso recurrente.'],
      [{ ...body, expenses: [] }, 'Agregá al menos un gasto recurrente.'],
      [
        { ...body, incomes: [{ ...body.incomes[0], recurring: false }] },
        'Los ingresos deben ser recurrentes.',
      ],
      [
        { ...body, expenses: [{ ...body.expenses[0], recurring: false }] },
        'Los gastos deben ser recurrentes.',
      ],
      [{ ...body, goal: { ...body.goal, name: '' } }, 'Ingresá un nombre.'],
      [
        { ...body, goal: { ...body.goal, name: '' }, incomes: [] },
        'Ingresá un nombre.',
      ],
      [
        {
          ...body,
          goal: {
            ...body.goal,
            allocations: [{ goalId: 'goal-1', percentage: '100.001' }],
          },
          expenses: [],
        },
        'Ingresá un porcentaje entre 0% y 100%, con hasta dos decimales.',
      ],
    ];

    for (const [payload, message] of cases) {
      await request(app.getHttpServer())
        .post('/me/financial-onboarding')
        .set('Authorization', 'Bearer valid')
        .send(payload)
        .expect(400)
        .expect(({ body: response }: { body: { message?: string } }) =>
          expect(response.message).toBe(message),
        );
    }
    expect(database.inserts).toHaveLength(0);
  });

  it('returns created: false without writing child rows when a plan already exists', async () => {
    await createApp({ profileExists: true });

    await request(app.getHttpServer())
      .post('/me/financial-onboarding')
      .set('Authorization', 'Bearer valid')
      .send(body)
      .expect(201, { created: false });

    expect(database.inserts.map(({ table }) => table)).toEqual([
      financialProfiles,
    ]);
  });

  it('returns a generic 500 when a child insert fails inside the transaction', async () => {
    await createApp({ failIncomeInsert: true });

    await request(app.getHttpServer())
      .post('/me/financial-onboarding')
      .set('Authorization', 'Bearer valid')
      .send(body)
      .expect(500)
      .expect(({ text }) => expect(text).not.toContain('Database disk error'));
    expect(database.inserts.map(({ table }) => table)).toEqual([
      financialProfiles,
      incomes,
    ]);
    expect(database.inserts.some(({ table }) => table === expenses)).toBe(
      false,
    );
  });

  it('generates the Swagger document with the onboarding request and response DTOs', () => {
    expect(() =>
      SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle('test').build(),
      ),
    ).not.toThrow();
  });
});
