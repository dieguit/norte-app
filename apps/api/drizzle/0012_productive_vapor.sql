CREATE INDEX "incomes_user_id_idx" ON "incomes" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_amount_check" CHECK ("incomes"."amount" > 0);--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_currency_check" CHECK ("incomes"."currency" in ('ARS', 'USD'));--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_source_kind_check" CHECK ("incomes"."source_kind" in ('salary', 'independent', 'pension', 'rent', 'investments', 'family_support', 'custom'));--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_source_check" CHECK (("incomes"."source_kind" = 'custom' and "incomes"."source_id" is not null) or ("incomes"."source_kind" != 'custom' and "incomes"."source_id" is null));