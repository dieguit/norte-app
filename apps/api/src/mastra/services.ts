import type { BenefitsService } from '../benefits/benefits.service';
import type { ContributionsService } from '../contributions/contributions.service';
import type { ExpensesService } from '../expenses/expenses.service';
import type { FinancesService } from '../finances/finances.service';
import type { GoalsService } from '../goals/goals.service';
import type { HomeService } from '../home/home.service';
import type { IncomesService } from '../incomes/incomes.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { ProfileService } from '../profile/profile.service';
import type { SavingsPlacesService } from '../savings-places/savings-places.service';

export type NorteServices = {
  profile: ProfileService;
  expenses: ExpensesService;
  incomes: IncomesService;
  finances: FinancesService;
  savingsPlaces: SavingsPlacesService;
  home: HomeService;
  goals: GoalsService;
  contributions: ContributionsService;
  notifications: NotificationsService;
  benefits: BenefitsService;
};
