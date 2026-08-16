CREATE TABLE "financial_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"target_amount" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'ARS' NOT NULL,
	"emergency_fund_months" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD COLUMN "base_currency" varchar(3) DEFAULT 'ARS' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD COLUMN "approximate_monthly_income" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD COLUMN "approximate_monthly_expenses" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD COLUMN "expenses_knowledge" varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD COLUMN "planned_monthly_contribution" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "financial_goals_user_id_idx" ON "financial_goals" USING btree ("user_id");