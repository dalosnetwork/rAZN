ALTER TABLE "identity"."user"
ADD COLUMN IF NOT EXISTS "onboarded_at" timestamp with time zone;

WITH latest_kyb AS (
  SELECT DISTINCT ON ("user_id")
    "user_id",
    "status"
  FROM "dashboard"."kyb_cases"
  ORDER BY "user_id", "submitted_at" DESC NULLS LAST, "created_at" DESC
)
UPDATE "identity"."user" AS "u"
SET
  "onboarded_at" = NOW(),
  "updated_at" = NOW()
FROM latest_kyb AS "lk"
WHERE
  "u"."id" = "lk"."user_id"
  AND "lk"."status" = 'approved'
  AND "u"."onboarded_at" IS NULL;
