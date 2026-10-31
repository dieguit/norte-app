ALTER TABLE "notification_settings" DROP CONSTRAINT "notification_settings_type_check";--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_type_check";--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_type_check" CHECK ("notification_settings"."type" in ('day_close_checkin', 'savings_digest'));--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type_check" CHECK ("notifications"."type" in ('day_close_checkin', 'savings_digest'));