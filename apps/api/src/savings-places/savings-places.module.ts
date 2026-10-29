import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SavingsPlacesController } from './savings-places.controller';
import { SavingsPlacesService } from './savings-places.service';
@Module({
  imports: [DatabaseModule],
  controllers: [SavingsPlacesController],
  providers: [SavingsPlacesService],
  exports: [SavingsPlacesService],
})
export class SavingsPlacesModule {}
