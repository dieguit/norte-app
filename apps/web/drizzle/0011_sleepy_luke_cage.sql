CREATE TABLE "income_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"normalized_name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"source_kind" varchar(24) NOT NULL,
	"source_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"recurring" boolean NOT NULL,
	"effective_month" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "income_sources" ADD CONSTRAINT "income_sources_user_id_financial_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."financial_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_id_financial_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."financial_profiles"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_source_id_income_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."income_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "income_sources_user_normalized_name_uidx" ON "income_sources" USING btree ("user_id","normalized_name");
--&gt; statement-breakpoint
INSERT INTO "income_sources" ("user_id", "name", "normalized_name")
SELECT "user_id", 'Ingreso principal', 'ingreso principal'
FROM "financial_profiles"
ON CONFLICT ("user_id", "normalized_name") DO NOTHING;
--&gt; statement-breakpoint
INSERT INTO "incomes" ("user_id", "source_kind", "source_id", "amount", "currency", "recurring", "effective_month")
SELECT 
  fp."user_id", 
  'custom', 
  isrc."id", 
  fp."approximate_monthly_income", 
  fp."base_currency", 
  true, 
  date_trunc('month', now())::date
FROM "financial_profiles" fp
JOIN "income_sources" isrc ON fp."user_id" = isrc."user_id" AND isrc."normalized_name" = 'ingreso principal'
WHERE NOT EXISTS (SELECT 1 FROM "incomes" i WHERE i."user_id" = fp."user_id");
