DROP TABLE "benefits";
--> statement-breakpoint
CREATE TABLE "benefits" (
 "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
 "publisher_provider_slug" text NOT NULL,
 "identity_key" text NOT NULL,
 "origin" text NOT NULL,
 "lifecycle" text NOT NULL,
 "category" text NOT NULL,
 "snapshot" jsonb NOT NULL,
 "content_hash" text NOT NULL,
 "protected_fields" text[] DEFAULT '{}' NOT NULL,
 "version" integer DEFAULT 1 NOT NULL,
 "first_seen_at" timestamp with time zone NOT NULL,
 "last_seen_at" timestamp with time zone NOT NULL,
 "last_verified_at" timestamp with time zone,
 "created_at" timestamp with time zone DEFAULT now() NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "benefits_identity_unique" UNIQUE("publisher_provider_slug","identity_key"),
 CONSTRAINT "benefits_origin_check" CHECK ("origin" in ('harvest', 'manual')),
 CONSTRAINT "benefits_lifecycle_check" CHECK ("lifecycle" in ('draft', 'needs_review', 'published', 'expired', 'withdrawn')),
 CONSTRAINT "benefits_version_check" CHECK ("version" > 0)
);
--> statement-breakpoint
CREATE TABLE "benefit_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"benefit_id" uuid NOT NULL,
	"base_version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"category" text NOT NULL,
	"content_hash" text NOT NULL,
	"status" text NOT NULL,
	"actor" text NOT NULL,
	"reason" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "benefit_revisions_status_check" CHECK ("benefit_revisions"."status" in ('pending', 'approved', 'rejected', 'superseded'))
);
--> statement-breakpoint
CREATE TABLE "benefit_source_policies" (
	"source_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean,
	"auto_publish" boolean,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benefit_source_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"provenance" text NOT NULL,
	"llm" boolean NOT NULL,
	"outcome" text NOT NULL,
	"complete" boolean NOT NULL,
	"coverage" text NOT NULL,
	"http_status" integer,
	"mime" text,
	"bytes" integer,
	"counts" jsonb NOT NULL,
	"diagnostics" text[] DEFAULT '{}' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benefit_sources" (
	"benefit_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	"upstream_id" text,
	"last_seen_at" timestamp with time zone NOT NULL,
	"last_seen_run_id" uuid,
	"first_missing_run_id" uuid,
	CONSTRAINT "benefit_sources_benefit_id_source_id_pk" PRIMARY KEY("benefit_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "benefit_user_preferences" ADD COLUMN "instrument_facts" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "benefit_user_preferences" ADD COLUMN "provider_facts" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "benefit_user_preferences" ADD COLUMN "declared_at" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "benefit_revisions" ADD CONSTRAINT "benefit_revisions_benefit_id_benefits_id_fk" FOREIGN KEY ("benefit_id") REFERENCES "public"."benefits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_sources" ADD CONSTRAINT "benefit_sources_benefit_id_benefits_id_fk" FOREIGN KEY ("benefit_id") REFERENCES "public"."benefits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_sources" ADD CONSTRAINT "benefit_sources_first_missing_run_id_benefit_source_runs_id_fk" FOREIGN KEY ("first_missing_run_id") REFERENCES "public"."benefit_source_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "benefit_revisions_benefit_idx" ON "benefit_revisions" USING btree ("benefit_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_revisions_one_pending" ON "benefit_revisions" USING btree ("benefit_id") WHERE "benefit_revisions"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "benefit_source_runs_source_idx" ON "benefit_source_runs" USING btree ("source_id","started_at");--> statement-breakpoint
CREATE INDEX "benefits_lifecycle_category_idx" ON "benefits" USING btree ("lifecycle","category");--> statement-breakpoint
