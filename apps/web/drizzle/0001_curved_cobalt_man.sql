ALTER TABLE "onboarding_drafts" ADD COLUMN "report" jsonb;--> statement-breakpoint
ALTER TABLE "onboarding_drafts" ADD COLUMN "report_sent_on" timestamp with time zone;