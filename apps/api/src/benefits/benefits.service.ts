import { Inject, Injectable } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../database/database.constants';
import type { Database } from '../database/database.types';
import { NotificationsService } from '../notifications/notifications.service';
import { runHarvest, type Extract, type SourceResult } from './harvest';

@Injectable()
export class BenefitsService {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  harvest(extract: Extract, now = new Date()): Promise<SourceResult[]> {
    return runHarvest(this.db, extract, undefined, now);
  }
}
