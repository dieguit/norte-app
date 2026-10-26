import { Injectable } from '@nestjs/common';
import {
  HomeRoadmapResponseSchema,
  type HomeRoadmapResponse,
} from '@repo/shared-types';
import { FinancesService } from '../finances/finances.service';
import { GoalsService } from '../goals/goals.service';
import { buildRoadmap } from './roadmap';

@Injectable()
export class HomeService {
  constructor(
    private readonly goalsService: GoalsService,
    private readonly financesService: FinancesService,
  ) {}

  async getHome(
    userId: string,
    currentMonth = new Date().toISOString().slice(0, 7),
  ): Promise<HomeRoadmapResponse> {
    const [goalsState, finances] = await Promise.all([
      this.goalsService.getWorkspace(userId, currentMonth),
      this.financesService.getWorkspace(userId, currentMonth),
    ]);

    if (goalsState.profile === 'missing' || !finances) {
      return HomeRoadmapResponseSchema.parse({ profile: 'missing' });
    }

    const roadmap = buildRoadmap({
      goals: goalsState.workspace,
      finances: {
        incomes: {
          incomes: finances.incomes.incomes.map(({ createdAt, ...income }) => {
            void createdAt;
            return income;
          }),
        },
        expenses: {
          expenses: finances.expenses.expenses.map(
            ({ createdAt, ...expense }) => {
              void createdAt;
              return expense;
            },
          ),
        },
      },
      currentMonth,
    });

    const completionGoals = goalsState.workspace.groups
      .flatMap((group) => group.goals)
      .filter((goal) => goal.completionEligible);

    return HomeRoadmapResponseSchema.parse({
      roadmap,
      completionGoals,
    });
  }
}
