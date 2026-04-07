CREATE SCHEMA IF NOT EXISTS "identity";
--> statement-breakpoint
DO $$
BEGIN
  IF to_regclass('public.permissions') IS NOT NULL AND to_regclass('identity.permissions') IS NULL THEN
    ALTER TABLE "public"."permissions" SET SCHEMA "identity";
  END IF;

  IF to_regclass('public.roles') IS NOT NULL AND to_regclass('identity.roles') IS NULL THEN
    ALTER TABLE "public"."roles" SET SCHEMA "identity";
  END IF;

  IF to_regclass('public.role_permissions') IS NOT NULL AND to_regclass('identity.role_permissions') IS NULL THEN
    ALTER TABLE "public"."role_permissions" SET SCHEMA "identity";
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL AND to_regclass('identity.user_roles') IS NULL THEN
    ALTER TABLE "public"."user_roles" SET SCHEMA "identity";
  END IF;
END
$$;
