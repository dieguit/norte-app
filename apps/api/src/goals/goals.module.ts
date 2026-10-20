import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ClerkAuthGuard } from '../profile/clerk-auth.guard';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

@Module({ imports: [DatabaseModule], controllers: [GoalsController], providers: [GoalsService, ClerkAuthGuard], exports: [GoalsService] })
export class GoalsModule {}
