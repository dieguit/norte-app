import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { ConfirmSavingContributionWire, SavingContributionDraftWire, UpdateSavingContributionWire } from '@repo/shared-types';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { savingsPlaces } from '../profile/profile.schema';
import {
  createSavingContributionInRepository,
  previewSavingContributionEdit,
  getSavingContributionState,
  previewSavingContribution,
  StaleSavingContributionPreviewError,
  updateSavingContributionInRepository,
  deleteSavingContributionInRepository,
} from './saving-contribution.repository';
import { getCatchUpCreatedAt } from './saving-contribution';

const DOMAIN_ERRORS = new Set([
  'Financial profile not found.',
  'Completá tu perfil financiero antes de registrar un ahorro.',
  'Elegí un lugar para tu ahorro.',
  'Lugar de ahorro no encontrado.',
  'No se pudo crear el lugar de ahorro.',
  'No se pueden modificar aportes de objetivos completados.',
  'Contribution not found or not owned by user.',
  'No allocations found for contribution.',
  'Cannot change contribution currency on update.',
  'Solo podés regularizar el mes anterior.',
  'Contribution amount must be positive',
  'USD purchase values must be positive',
  'USD purchase values are incoherent',
  'USD purchase derivation requires at least two positive values',
  'Invalid saving draft input',
  'No eligible goals',
]);
const DOMAIN_PREFIXES = ['Falta asociar una posición', 'Investment position', 'Invalid currency:', 'No hay objetivos activos para distribuir', 'Allocation percentages must sum to 100%'];

function toDomainError(error: unknown): unknown {
  if (error instanceof Error && (DOMAIN_ERRORS.has(error.message) || DOMAIN_PREFIXES.some((prefix) => error.message.startsWith(prefix)))) {
    return new BadRequestException(error.message);
  }
  return error;
}

function currentMonthOf(now: Date) {
  return now.toISOString().slice(0, 7);
}

@Injectable()
export class ContributionsService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: Database) {}

  async getContext(userId: string, now = new Date()) {
    const currentMonth = currentMonthOf(now);
    const [state, places] = await Promise.all([
      getSavingContributionState(this.db, userId, currentMonth),
      this.db.query.savingsPlaces.findMany({ where: eq(savingsPlaces.userId, userId) }),
    ]);
    if (!state) return { profile: 'missing' as const };
    return {
      profile: 'present' as const,
      context: {
        currentMonth,
        eligibleGoals: state.eligibleGoals,
        eligibleGoalsUsd: state.eligibleGoalsUsd,
        eligibleInvestmentGoals: state.eligibleInvestmentGoals,
        eligibleInvestmentGoalsUsd: state.eligibleInvestmentGoalsUsd,
        investmentState: state.investmentState,
        monthlyTargetArs: state.monthlyTargetArs ?? null,
        monthlyTargetUsd: state.monthlyTargetUsd ?? null,
        monthlyInvestmentTargetArs: state.monthlyInvestmentTargetArs ?? null,
        monthlyInvestmentTargetUsd: state.monthlyInvestmentTargetUsd ?? null,
        places: places
          .map((place) => ({ id: place.id, name: place.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'es-AR')),
      },
    };
  }

  async previewSaving(userId: string, draft: SavingContributionDraftWire, now = new Date()) {
    try {
      return await previewSavingContribution(this.db, userId, currentMonthOf(now), draft);
    } catch (error) {
      throw toDomainError(error);
    }
  }

  async previewSavingEdit(userId: string, contributionId: string, draft: SavingContributionDraftWire, now = new Date()) {
    try {
      return await previewSavingContributionEdit(this.db, { userId, currentMonth: currentMonthOf(now), contributionId, draft });
    } catch (error) {
      throw toDomainError(error);
    }
  }

  async confirmSaving(userId: string, body: ConfirmSavingContributionWire, now = new Date()) {
    try {
      const createdAt = getCatchUpCreatedAt(body.catchUpMonth, now);
      const result = await createSavingContributionInRepository(this.db, {
        userId,
        currentMonth: currentMonthOf(now),
        draft: body.draft,
        previewToken: body.previewToken,
        ...(createdAt ? { createdAt } : {}),
      });
      return { status: 'created' as const, contributionId: result.contributionId };
    } catch (error) {
      if (error instanceof StaleSavingContributionPreviewError) {
        return { status: 'stale' as const, preview: error.refreshedPreview };
      }
      throw toDomainError(error);
    }
  }

  async updateSaving(userId: string, contributionId: string, body: UpdateSavingContributionWire) {
    try {
      await updateSavingContributionInRepository(this.db, { userId, contributionId, draft: body.draft });
      return { status: 'updated' as const };
    } catch (error) {
      throw toDomainError(error);
    }
  }

  async deleteSaving(userId: string, contributionId: string) {
    try {
      await deleteSavingContributionInRepository(this.db, { userId, contributionId });
      return { status: 'deleted' as const };
    } catch (error) {
      throw toDomainError(error);
    }
  }
}
