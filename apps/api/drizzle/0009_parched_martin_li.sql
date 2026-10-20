CREATE TABLE "investment_contribution_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contribution_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"investment_position_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investment_contribution_allocations_amount_check" CHECK ("investment_contribution_allocations"."amount" >= 0),
	CONSTRAINT "investment_contribution_allocations_percentage_check" CHECK ("investment_contribution_allocations"."percentage" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "investment_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"ars_spent" numeric(12, 2),
	"effective_rate" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investment_contributions_amount_check" CHECK ("investment_contributions"."amount" > 0),
	CONSTRAINT "investment_contributions_currency_check" CHECK ("investment_contributions"."currency" in ('ARS', 'USD')),
	CONSTRAINT "investment_contributions_usd_fields_check" CHECK (("investment_contributions"."currency" = 'USD' and "investment_contributions"."ars_spent" is not null and "investment_contributions"."effective_rate" is not null) or ("investment_contributions"."currency" = 'ARS' and "investment_contributions"."ars_spent" is null and "investment_contributions"."effective_rate" is null))
);
--> statement-breakpoint
ALTER TABLE "investment_contribution_allocations" ADD CONSTRAINT "investment_contribution_allocations_contribution_id_investment_contributions_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."investment_contributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_contribution_allocations" ADD CONSTRAINT "investment_contribution_allocations_goal_id_financial_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."financial_goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_contribution_allocations" ADD CONSTRAINT "investment_contribution_allocations_investment_position_id_goal_investment_positions_id_fk" FOREIGN KEY ("investment_position_id") REFERENCES "public"."goal_investment_positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_user_id_financial_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."financial_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investment_contribution_allocations_contribution_id_idx" ON "investment_contribution_allocations" USING btree ("contribution_id");--> statement-breakpoint
CREATE INDEX "investment_contribution_allocations_goal_id_idx" ON "investment_contribution_allocations" USING btree ("goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "investment_contribution_allocations_contribution_position_uidx" ON "investment_contribution_allocations" USING btree ("contribution_id","investment_position_id");--> statement-breakpoint
CREATE INDEX "investment_contributions_user_id_idx" ON "investment_contributions" USING btree ("user_id");