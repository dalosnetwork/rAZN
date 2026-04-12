CREATE TABLE IF NOT EXISTS "dashboard"."user_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"channel" "dashboard"."notification_channel" DEFAULT 'in_app' NOT NULL,
	"event_status" "dashboard"."workflow_status" DEFAULT 'active' NOT NULL,
	"entity_type" text,
	"entity_ref" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF to_regclass('identity.users') IS NOT NULL THEN
    ALTER TABLE "dashboard"."user_notifications"
      ADD CONSTRAINT "dashboard_user_notifications_user_id_identity_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id")
      ON DELETE cascade ON UPDATE no action;
  ELSIF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE "dashboard"."user_notifications"
      ADD CONSTRAINT "dashboard_user_notifications_user_id_public_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS "dashboard_user_notifications_user_created_idx" ON "dashboard"."user_notifications" USING btree ("user_id","created_at");
CREATE INDEX IF NOT EXISTS "dashboard_user_notifications_user_read_created_idx" ON "dashboard"."user_notifications" USING btree ("user_id","is_read","created_at");
CREATE INDEX IF NOT EXISTS "dashboard_user_notifications_user_entity_idx" ON "dashboard"."user_notifications" USING btree ("user_id","entity_type","entity_ref");
