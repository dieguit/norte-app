import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MASTRA } from '@mastra/nestjs';
import type { Mastra } from '@mastra/core/mastra';
import { BenefitsService } from '../benefits/benefits.service';
import { extractWith } from './agents/benefits-extractor-agent';

@Injectable()
export class BenefitsHarvestCron {
  private readonly logger = new Logger('BenefitsHarvestCron');

  constructor(
    @Inject(MASTRA) private readonly mastra: Mastra,
    private readonly benefits: BenefitsService,
  ) {}

  // 03:00 AR: off-peak for prod and for the crawled sites.
  @Cron('0 3 * * *', { timeZone: 'America/Argentina/Buenos_Aires' })
  async tick() {
    try {
      await this.run(new Date());
    } catch (error) {
      this.logger.error(`Benefits harvest failed: ${String(error)}`);
    }
  }

  async run(now: Date) {
    const results = await this.benefits.harvest(
      extractWith(this.mastra.getAgent('benefitsExtractor')),
      now,
    );
    for (const r of results) {
      const line = `${r.provider} ${r.url}: ${r.status}, extracted ${r.extracted}, new ${r.inserted}${r.error ? `, ${r.error}` : ''}`;
      if (r.status === 'failed') this.logger.error(line);
      else if (r.extracted === 0)
        this.logger.warn(`${line} (page may have changed)`);
      else this.logger.log(line);
    }
  }
}
