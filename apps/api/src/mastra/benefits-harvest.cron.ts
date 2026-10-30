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
    const { results, summaries } = await this.benefits.harvestNightly(
      extractWith(this.mastra.getAgent('benefitsExtractor')),
      now,
    );
    for (const r of results) {
      const line = `${r.sourceId}: ${r.outcome}, valid ${r.candidates.length}, rejected ${r.rejected.length}, ${r.diagnostics.join('; ')}, commit ${JSON.stringify(summaries[r.sourceId] ?? null)}`;
      if (r.outcome === 'failed') this.logger.error(line);
      else if (
        r.outcome === 'blocked' ||
        r.outcome === 'partial' ||
        r.candidates.length === 0
      )
        this.logger.warn(`${line} (page may have changed)`);
      else this.logger.log(line);
    }
  }
}
