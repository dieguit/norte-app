ALTER TABLE "benefit_banks" ADD COLUMN "own_catalog_scope" text;
--> statement-breakpoint
UPDATE "benefit_banks" SET "own_catalog_scope" = 'PlayDigital hub only; separate Selecta sections are not confirmed' WHERE "slug" = 'macro';
--> statement-breakpoint
UPDATE "benefit_banks" SET "own_catalog_scope" = 'Galicia own API catalog' WHERE "slug" = 'galicia';
