CREATE TABLE "channel_plan_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	CONSTRAINT "channel_plan_allocations_percentage_check" CHECK ("channel_plan_allocations"."percentage" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "channel_plan_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"monthly_commitment_amount" numeric(12, 2) NOT NULL,
	"base_currency" varchar(3) NOT NULL,
	"effective_month" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_plan_snapshots_commitment_check" CHECK ("channel_plan_snapshots"."monthly_commitment_amount" >= 0),
	CONSTRAINT "channel_plan_snapshots_currency_check" CHECK ("channel_plan_snapshots"."base_currency" in ('ARS', 'USD'))
);
--> statement-breakpoint
CREATE TABLE "contribution_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"funding_method" varchar(16) NOT NULL,
	"destination_currency" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contribution_channels_method_check" CHECK ("contribution_channels"."funding_method" in ('save', 'invest')),
	CONSTRAINT "contribution_channels_currency_check" CHECK ("contribution_channels"."destination_currency" in ('ARS', 'USD'))
);
--> statement-breakpoint
ALTER TABLE "financial_goals" ADD COLUMN "save_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_goals" ADD COLUMN "invest_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_plan_allocations" ADD CONSTRAINT "channel_plan_allocations_snapshot_id_channel_plan_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."channel_plan_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_plan_allocations" ADD CONSTRAINT "channel_plan_allocations_goal_id_financial_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."financial_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_plan_snapshots" ADD CONSTRAINT "channel_plan_snapshots_channel_id_contribution_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."contribution_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution_channels" ADD CONSTRAINT "contribution_channels_user_id_financial_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."financial_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "channel_plan_allocations_snapshot_goal_uidx" ON "channel_plan_allocations" USING btree ("snapshot_id","goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_plan_snapshots_channel_effective_uidx" ON "channel_plan_snapshots" USING btree ("channel_id","effective_month");--> statement-breakpoint
CREATE UNIQUE INDEX "contribution_channels_user_method_currency_uidx" ON "contribution_channels" USING btree ("user_id","funding_method","destination_currency");--> statement-breakpoint
ALTER TABLE "financial_profiles" DROP COLUMN "planned_monthly_contribution";