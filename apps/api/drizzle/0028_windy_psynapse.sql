-- v2 profiles are not in production; their taxonomy cannot be migrated to v3.
DELETE FROM "benefit_user_preferences";--> statement-breakpoint
ALTER TABLE "benefit_user_preferences" ADD COLUMN "banks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "benefit_user_preferences" ADD COLUMN "uses_modo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "benefit_user_preferences" DROP COLUMN "instrument_slugs";--> statement-breakpoint
ALTER TABLE "benefit_user_preferences" DROP COLUMN "instrument_facts";--> statement-breakpoint
ALTER TABLE "benefit_user_preferences" DROP COLUMN "provider_facts";--> statement-breakpoint
ALTER TABLE "benefit_user_preferences" DROP COLUMN "declared_at";
