CREATE TABLE "allocation_plan_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	CONSTRAINT "allocation_plan_entries_percentage_check" CHECK ("allocation_plan_entries"."percentage" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "allocation_plan_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"effective_month" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel_plan_allocations" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "channel_plan_snapshots" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contribution_channels" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "channel_plan_allocations" CASCADE;--> statement-breakpoint
DROP TABLE "channel_plan_snapshots" CASCADE;--> statement-breakpoint
DROP TABLE "contribution_channels" CASCADE;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD COLUMN "strategy" varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_profiles" ADD COLUMN "planned_monthly_contribution" numeric(12, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "allocation_plan_entries" ADD CONSTRAINT "allocation_plan_entries_snapshot_id_allocation_plan_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."allocation_plan_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_plan_entries" ADD CONSTRAINT "allocation_plan_entries_goal_id_financial_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."financial_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "allocation_plan_snapshots" ADD CONSTRAINT "allocation_plan_snapshots_user_id_financial_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."financial_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "allocation_plan_entries_snapshot_goal_uidx" ON "allocation_plan_entries" USING btree ("snapshot_id","goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "allocation_plan_snapshots_user_effective_uidx" ON "allocation_plan_snapshots" USING btree ("user_id","effective_month");--> statement-breakpoint
ALTER TABLE "financial_goals" DROP COLUMN "save_enabled";--> statement-breakpoint
ALTER TABLE "financial_goals" DROP COLUMN "invest_enabled";--> statement-breakpoint
ALTER TABLE "financial_goals" ADD CONSTRAINT "financial_goals_strategy_check" CHECK ("financial_goals"."strategy" in ('save', 'invest'));