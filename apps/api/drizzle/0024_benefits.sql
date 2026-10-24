CREATE TABLE "benefit_user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"instrument_slugs" text[] NOT NULL,
	"categories" text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benefits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_slug" text NOT NULL,
	"source_url" text NOT NULL,
	"fingerprint" text NOT NULL,
	"title" text NOT NULL,
	"merchant" text,
	"category" text NOT NULL,
	"kind" text NOT NULL,
	"value" numeric(12, 2) NOT NULL,
	"max_amount" numeric(12, 2),
	"max_amount_period" text,
	"weekdays" integer[],
	"valid_from" date,
	"valid_to" date,
	"instrument_slugs" text[] NOT NULL,
	"conditions" text,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "benefits_fingerprint_unique" UNIQUE("fingerprint"),
	CONSTRAINT "benefits_kind_check" CHECK ("benefits"."kind" in ('discount', 'cashback', 'installments', 'nxm')),
	CONSTRAINT "benefits_max_amount_period_check" CHECK ("benefits"."max_amount_period" in ('transaction', 'day', 'week', 'month'))
);
