CREATE TABLE "saving_contribution_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contribution_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"saving_position_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saving_contribution_allocations_amount_check" CHECK ("saving_contribution_allocations"."amount" >= 0),
	CONSTRAINT "saving_contribution_allocations_percentage_check" CHECK ("saving_contribution_allocations"."percentage" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "saving_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"location" text,
	"ars_spent" numeric(12, 2),
	"effective_rate" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saving_contributions_amount_check" CHECK ("saving_contributions"."amount" > 0),
	CONSTRAINT "saving_contributions_currency_check" CHECK ("saving_contributions"."currency" in ('ARS', 'USD')),
	CONSTRAINT "saving_contributions_usd_fields_check" CHECK (("saving_contributions"."currency" = 'USD' and "saving_contributions"."ars_spent" is not null and "saving_contributions"."effective_rate" is not null) or ("saving_contributions"."currency" = 'ARS' and "saving_contributions"."ars_spent" is null and "saving_contributions"."effective_rate" is null))
);
--> statement-breakpoint
ALTER TABLE "saving_contribution_allocations" ADD CONSTRAINT "saving_contribution_allocations_contribution_id_saving_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."saving_contributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saving_contribution_allocations" ADD CONSTRAINT "saving_contribution_allocations_goal_id_financial_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."financial_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saving_contribution_allocations" ADD CONSTRAINT "saving_contribution_allocations_saving_position_id_goal_savings_positions_id_fk" FOREIGN KEY ("saving_position_id") REFERENCES "public"."goal_savings_positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saving_contributions" ADD CONSTRAINT "saving_contributions_user_id_financial_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."financial_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saving_contribution_allocations_contribution_id_idx" ON "saving_contribution_allocations" USING btree ("contribution_id");--> statement-breakpoint
CREATE INDEX "saving_contribution_allocations_goal_id_idx" ON "saving_contribution_allocations" USING btree ("goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saving_contribution_allocations_saving_position_id_uidx" ON "saving_contribution_allocations" USING btree ("saving_position_id");--> statement-breakpoint
CREATE INDEX "saving_contributions_user_id_idx" ON "saving_contributions" USING btree ("user_id");