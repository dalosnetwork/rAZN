ALTER TABLE "dashboard"."request_events" ADD CONSTRAINT "dashboard_request_events_exactly_one_request_ck" CHECK ((
        ("dashboard"."request_events"."mint_request_id" IS NOT NULL AND "dashboard"."request_events"."redeem_request_id" IS NULL)
        OR
        ("dashboard"."request_events"."mint_request_id" IS NULL AND "dashboard"."request_events"."redeem_request_id" IS NOT NULL)
      ));--> statement-breakpoint
ALTER TABLE "dashboard"."request_events" ADD CONSTRAINT "dashboard_request_events_type_matches_fk_ck" CHECK ((
        ("dashboard"."request_events"."request_type" = 'mint' AND "dashboard"."request_events"."mint_request_id" IS NOT NULL AND "dashboard"."request_events"."redeem_request_id" IS NULL)
        OR
        ("dashboard"."request_events"."request_type" = 'redeem' AND "dashboard"."request_events"."redeem_request_id" IS NOT NULL AND "dashboard"."request_events"."mint_request_id" IS NULL)
      ));--> statement-breakpoint
ALTER TABLE "dashboard"."request_operations" ADD CONSTRAINT "dashboard_request_operations_exactly_one_request_ck" CHECK ((
        ("dashboard"."request_operations"."mint_request_id" IS NOT NULL AND "dashboard"."request_operations"."redeem_request_id" IS NULL)
        OR
        ("dashboard"."request_operations"."mint_request_id" IS NULL AND "dashboard"."request_operations"."redeem_request_id" IS NOT NULL)
      ));--> statement-breakpoint
ALTER TABLE "dashboard"."request_operations" ADD CONSTRAINT "dashboard_request_operations_type_matches_fk_ck" CHECK ((
        ("dashboard"."request_operations"."request_type" = 'mint' AND "dashboard"."request_operations"."mint_request_id" IS NOT NULL AND "dashboard"."request_operations"."redeem_request_id" IS NULL)
        OR
        ("dashboard"."request_operations"."request_type" = 'redeem' AND "dashboard"."request_operations"."redeem_request_id" IS NOT NULL AND "dashboard"."request_operations"."mint_request_id" IS NULL)
      ));