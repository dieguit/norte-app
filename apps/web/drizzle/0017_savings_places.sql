CREATE TABLE "savings_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"normalized_name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_places_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "financial_profiles"("user_id") ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "savings_places_user_normalized_name_uidx" ON "savings_places" USING btree ("user_id","normalized_name");--> statement-breakpoint
CREATE TABLE "savings_place_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"from_place_id" uuid NOT NULL,
	"to_place_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'ARS' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "savings_place_transfers_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "financial_profiles"("user_id") ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "savings_place_transfers_from_place_id_fk" FOREIGN KEY ("from_place_id") REFERENCES "savings_places"("id") ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "savings_place_transfers_to_place_id_fk" FOREIGN KEY ("to_place_id") REFERENCES "savings_places"("id") ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "savings_place_transfers_amount_check" CHECK ("amount" > 0),
	CONSTRAINT "savings_place_transfers_currency_check" CHECK ("currency" in ('ARS', 'USD')),
	CONSTRAINT "savings_place_transfers_places_check" CHECK ("from_place_id" <> "to_place_id")
);
--> statement-breakpoint
CREATE INDEX "savings_place_transfers_user_id_idx" ON "savings_place_transfers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "savings_place_transfers_from_place_id_idx" ON "savings_place_transfers" USING btree ("from_place_id");--> statement-breakpoint
CREATE INDEX "savings_place_transfers_to_place_id_idx" ON "savings_place_transfers" USING btree ("to_place_id");--> statement-breakpoint
INSERT INTO "savings_places" ("user_id", "name", "normalized_name")
SELECT DISTINCT "user_id", 'Sin asignar', 'sin asignar'
FROM "saving_contributions";--> statement-breakpoint
ALTER TABLE "saving_contributions" ADD COLUMN "place_id" uuid;--> statement-breakpoint
UPDATE "saving_contributions" AS contribution
SET "place_id" = place."id"
FROM "savings_places" AS place
WHERE place."user_id" = contribution."user_id"
  AND place."normalized_name" = 'sin asignar';--> statement-breakpoint
ALTER TABLE "saving_contributions" ALTER COLUMN "place_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "saving_contributions" ADD CONSTRAINT "saving_contributions_place_id_fk" FOREIGN KEY ("place_id") REFERENCES "savings_places"("id") ON UPDATE no action ON DELETE restrict;--> statement-breakpoint
CREATE INDEX "saving_contributions_place_id_idx" ON "saving_contributions" USING btree ("place_id");--> statement-breakpoint
ALTER TABLE "saving_contributions" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "goal_savings_positions" DROP COLUMN "location";
