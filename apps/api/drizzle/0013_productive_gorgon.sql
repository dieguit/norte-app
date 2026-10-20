CREATE TABLE "expense_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"normalized_name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"source_kind" varchar(24) NOT NULL,
	"source_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"recurring" boolean NOT NULL,
	"effective_month" date NOT NULL,
	"end_month" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_check" CHECK ("expenses"."amount" > 0),
	CONSTRAINT "expenses_currency_check" CHECK ("expenses"."currency" in ('ARS', 'USD')),
	CONSTRAINT "expenses_source_kind_check" CHECK ("expenses"."source_kind" in ('housing', 'school', 'health', 'loans', 'utilities', 'insurance', 'family_support', 'subscriptions', 'custom')),
	CONSTRAINT "expenses_source_check" CHECK (("expenses"."source_kind" = 'custom' and "expenses"."source_id" is not null) or ("expenses"."source_kind" != 'custom' and "expenses"."source_id" is null)),
	CONSTRAINT "expenses_end_month_check" CHECK (("expenses"."recurring" = false and "expenses"."end_month" is null) or ("expenses"."recurring" = true and ("expenses"."end_month" is null or "expenses"."end_month" > "expenses"."effective_month")))
);
--> statement-breakpoint
ALTER TABLE "expense_sources" ADD CONSTRAINT "expense_sources_user_id_financial_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."financial_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_financial_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."financial_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_source_id_expense_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."expense_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expense_sources_user_normalized_name_uidx" ON "expense_sources" USING btree ("user_id","normalized_name");--> statement-breakpoint
CREATE INDEX "expenses_user_id_idx" ON "expenses" USING btree ("user_id");