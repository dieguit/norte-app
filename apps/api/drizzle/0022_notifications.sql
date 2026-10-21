CREATE TABLE "notification_settings" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean NOT NULL,
	"frequency" text DEFAULT 'daily' NOT NULL,
	"time" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_settings_user_id_type_pk" PRIMARY KEY("user_id","type"),
	CONSTRAINT "notification_settings_type_check" CHECK ("notification_settings"."type" in ('day_close_checkin')),
	CONSTRAINT "notification_settings_frequency_check" CHECK ("notification_settings"."frequency" in ('daily')),
	CONSTRAINT "notification_settings_time_check" CHECK ("notification_settings"."time" ~ '^([01][0-9]|2[0-3]):(00|30)$')
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"period" date NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_user_type_period_unique" UNIQUE("user_id","type","period"),
	CONSTRAINT "notifications_type_check" CHECK ("notifications"."type" in ('day_close_checkin')),
	CONSTRAINT "notifications_status_check" CHECK ("notifications"."status" in ('open', 'answered', 'closed'))
);
--> statement-breakpoint
CREATE INDEX "notifications_status_scheduled_at_idx" ON "notifications" USING btree ("status","scheduled_at");