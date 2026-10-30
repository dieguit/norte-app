CREATE TABLE "benefit_banks" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"playdigital_id" text,
	"own_catalog" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "benefit_banks_playdigital_id_unique" UNIQUE("playdigital_id")
);
--> statement-breakpoint
CREATE TABLE "benefit_brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized" text NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"source_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "benefit_brands_normalized_unique" UNIQUE("normalized")
);
--> statement-breakpoint
CREATE TABLE "benefit_campaign_banks" (
	"campaign_id" uuid NOT NULL,
	"bank_slug" text NOT NULL,
	"terms" jsonb,
	"tiers" jsonb,
	"snapshot" jsonb NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"last_seen_run_id" uuid NOT NULL,
	"missing_since_run_id" uuid,
	"withdrawn_at" timestamp with time zone,
	CONSTRAINT "benefit_campaign_banks_campaign_id_bank_slug_pk" PRIMARY KEY("campaign_id","bank_slug")
);
--> statement-breakpoint
CREATE TABLE "benefit_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"brand_id" uuid,
	"title" text NOT NULL,
	"categories" text[] NOT NULL,
	"terms" jsonb,
	"unpublishable_reason" text,
	"tiers" jsonb,
	"raw_tier_signal" text,
	"verify_url" text NOT NULL,
	"verify_hint" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"hidden_by" text,
	"raw" jsonb NOT NULL,
	"listing_hash" text NOT NULL,
	"detail_fetched_at" timestamp with time zone,
	"detail_stale" boolean DEFAULT false NOT NULL,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"withdrawn_at" timestamp with time zone,
	CONSTRAINT "benefit_campaigns_source_external_unique" UNIQUE("source","external_id"),
	CONSTRAINT "benefit_campaigns_source_check" CHECK ("benefit_campaigns"."source" in ('playdigital','galicia'))
);
--> statement-breakpoint
CREATE TABLE "benefit_category_mappings" (
	"source_key" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "benefit_category_mappings_category_check" CHECK ("benefit_category_mappings"."category" in ('supermercados','gastronomia','indumentaria','hogar','electronica','salud-belleza','viajes','transporte','combustible-autos','entretenimiento','ninos-libreria','mascotas-servicios','otros'))
);
--> statement-breakpoint
CREATE TABLE "benefit_detail_cache" (
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"listing_hash" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"detail" jsonb NOT NULL,
	CONSTRAINT "benefit_detail_cache_source_external_id_pk" PRIMARY KEY("source","external_id"),
	CONSTRAINT "benefit_detail_cache_source_check" CHECK ("benefit_detail_cache"."source" in ('playdigital','galicia'))
);
--> statement-breakpoint
CREATE TABLE "benefit_ingest_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"bank_slug" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL,
	"complete" boolean NOT NULL,
	"total_reported" integer,
	"raw_row_count" integer NOT NULL,
	"observed_count" integer NOT NULL,
	"upserted" integer DEFAULT 0 NOT NULL,
	"created" integer DEFAULT 0 NOT NULL,
	"unpublishable" integer DEFAULT 0 NOT NULL,
	"withdrawn_banks" integer DEFAULT 0 NOT NULL,
	"withdrawn_campaigns" integer DEFAULT 0 NOT NULL,
	"unmapped_categories" integer DEFAULT 0 NOT NULL,
	"anomalies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	CONSTRAINT "benefit_ingest_runs_outcome_check" CHECK ("benefit_ingest_runs"."outcome" in ('ok','partial','failed')),
	CONSTRAINT "benefit_ingest_runs_counts_check" CHECK ("benefit_ingest_runs"."raw_row_count" >= 0 and "benefit_ingest_runs"."observed_count" >= 0 and ("benefit_ingest_runs"."total_reported" is null or "benefit_ingest_runs"."total_reported" >= 0))
);
--> statement-breakpoint
ALTER TABLE "benefit_campaign_banks" ADD CONSTRAINT "benefit_campaign_banks_campaign_id_benefit_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."benefit_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_campaign_banks" ADD CONSTRAINT "benefit_campaign_banks_bank_slug_benefit_banks_slug_fk" FOREIGN KEY ("bank_slug") REFERENCES "public"."benefit_banks"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_campaign_banks" ADD CONSTRAINT "benefit_campaign_banks_last_seen_run_id_benefit_ingest_runs_id_fk" FOREIGN KEY ("last_seen_run_id") REFERENCES "public"."benefit_ingest_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_campaign_banks" ADD CONSTRAINT "benefit_campaign_banks_missing_since_run_id_benefit_ingest_runs_id_fk" FOREIGN KEY ("missing_since_run_id") REFERENCES "public"."benefit_ingest_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_campaigns" ADD CONSTRAINT "benefit_campaigns_brand_id_benefit_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."benefit_brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "benefit_campaign_banks_bank_idx" ON "benefit_campaign_banks" USING btree ("bank_slug");--> statement-breakpoint
CREATE INDEX "benefit_campaigns_brand_idx" ON "benefit_campaigns" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "benefit_campaigns_categories_idx" ON "benefit_campaigns" USING gin ("categories");--> statement-breakpoint
CREATE INDEX "benefit_ingest_runs_previous_idx" ON "benefit_ingest_runs" USING btree ("source","bank_slug","started_at");
--> statement-breakpoint
INSERT INTO "benefit_category_mappings" ("source_key", "category", "updated_by") VALUES
('pd:0','otros','seed'),('pd:1','supermercados','seed'),('pd:2','gastronomia','seed'),
('pd:3','indumentaria','seed'),('pd:4','salud-belleza','seed'),('pd:5','combustible-autos','seed'),
('pd:6','otros','seed'),('pd:7','hogar','seed'),('pd:8','combustible-autos','seed'),
('pd:10','electronica','seed'),('pd:11','hogar','seed'),('pd:12','mascotas-servicios','seed'),
('pd:13','ninos-libreria','seed'),('pd:14','otros','seed'),('pd:15','otros','seed'),
('pd:14/7','viajes','seed'),('pd:14/31','viajes','seed'),('pd:14/57','viajes','seed'),
('pd:14/9','entretenimiento','seed'),('pd:14/58','entretenimiento','seed'),('pd:15/11','transporte','seed'),
('galicia:Indumentaria','indumentaria','seed'),('galicia:Hogar','hogar','seed'),
('galicia:Electrónica','electronica','seed'),('galicia:Salud y Bienestar','salud-belleza','seed'),
('galicia:Gastronomía','gastronomia','seed'),('galicia:Entretenimiento','entretenimiento','seed'),
('galicia:Viajes','viajes','seed'),('galicia:Supermercados','supermercados','seed'),
('galicia:Vehículos','combustible-autos','seed'),('galicia:Juguetes','ninos-libreria','seed'),
('galicia:Librerías','ninos-libreria','seed'),('galicia:Transportes','transporte','seed'),
('galicia:Shopping','indumentaria','seed'),('galicia:Mascotas','mascotas-servicios','seed'),
('galicia:Combustible','combustible-autos','seed'),('galicia:Confitería','gastronomia','seed'),
('galicia:Bares','gastronomia','seed'),('galicia:Peluquerías','salud-belleza','seed'),
('galicia:Otros','otros','seed'),('galicia:Educación','otros','seed'),('galicia:Regalos','otros','seed');
