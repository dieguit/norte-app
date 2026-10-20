CREATE TABLE "goal_completion_withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"place_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_completion_withdrawals_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "financial_goals"("id") ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "goal_completion_withdrawals_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "savings_places"("id") ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "goal_completion_withdrawals_amount_check" CHECK ("amount" > 0),
	CONSTRAINT "goal_completion_withdrawals_currency_check" CHECK ("currency" in ('ARS', 'USD'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "goal_completion_withdrawals_goal_place_uidx" ON "goal_completion_withdrawals" USING btree ("goal_id","place_id");--> statement-breakpoint
CREATE INDEX "goal_completion_withdrawals_goal_id_idx" ON "goal_completion_withdrawals" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_completion_withdrawals_place_id_idx" ON "goal_completion_withdrawals" USING btree ("place_id");
