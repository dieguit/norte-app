CREATE TABLE "goal_investment_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"current_value" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'ARS' NOT NULL,
	"annual_return_rate" numeric(6, 3) DEFAULT '8.000' NOT NULL,
	"availability" varchar(16) DEFAULT 'available_now' NOT NULL,
	"available_from" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_investment_positions_current_value_check" CHECK ("goal_investment_positions"."current_value" >= 0),
	CONSTRAINT "goal_investment_positions_currency_check" CHECK ("goal_investment_positions"."currency" in ('ARS', 'USD')),
	CONSTRAINT "goal_investment_positions_availability_check" CHECK ("goal_investment_positions"."availability" in ('available_now', 'available_from', 'long_term')),
	CONSTRAINT "goal_investment_positions_available_from_check" CHECK (("goal_investment_positions"."availability" = 'available_from' and "goal_investment_positions"."available_from" is not null) or ("goal_investment_positions"."availability" != 'available_from' and "goal_investment_positions"."available_from" is null))
);
--> statement-breakpoint
CREATE TABLE "goal_savings_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'ARS' NOT NULL,
	"location" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_savings_positions_amount_check" CHECK ("goal_savings_positions"."amount" >= 0),
	CONSTRAINT "goal_savings_positions_currency_check" CHECK ("goal_savings_positions"."currency" in ('ARS', 'USD'))
);
--> statement-breakpoint
ALTER TABLE "channel_plan_snapshots" ALTER COLUMN "monthly_commitment_amount" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_plan_snapshots" ADD COLUMN "commitment_status" varchar(8) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD COLUMN "priority" varchar(8) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD COLUMN "status" varchar(12) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD COLUMN "desired_date" date;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "goal_investment_positions" ADD CONSTRAINT "goal_investment_positions_goal_id_financial_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."financial_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_savings_positions" ADD CONSTRAINT "goal_savings_positions_goal_id_financial_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."financial_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "goal_investment_positions_goal_id_uidx" ON "goal_investment_positions" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_savings_positions_goal_id_idx" ON "goal_savings_positions" USING btree ("goal_id");--> statement-breakpoint
ALTER TABLE "channel_plan_snapshots" ADD CONSTRAINT "channel_plan_snapshots_commitment_status_check" CHECK ("channel_plan_snapshots"."commitment_status" in ('active', 'paused'));--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_priority_check" CHECK ("financial_goals"."priority" in ('high', 'medium', 'low'));--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_status_check" CHECK ("financial_goals"."status" in ('active', 'paused', 'completed'));