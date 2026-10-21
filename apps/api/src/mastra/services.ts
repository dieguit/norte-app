import type { ContributionsService } from '../contributions/contributions.service';
import type { ExpensesService } from '../expenses/expenses.service';
import type { FinancesService } from '../finances/finances.service';
import type { GoalsService } from '../goals/goals.service';
import type { HomeService } from '../home/home.service';
import type { IncomesService } from '../incomes/incomes.service';
import type { NotificationsService } from '../notifications/notifications.service';

export type NorteServices = {
  expenses: ExpensesService;
  incomes: IncomesService;
  finances: FinancesService;
  home: HomeService;
  goals: GoalsService;
  contributions: ContributionsService;
  notifications: NotificationsService;
};
