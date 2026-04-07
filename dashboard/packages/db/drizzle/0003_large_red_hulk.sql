CREATE SCHEMA "dashboard";
--> statement-breakpoint
CREATE TYPE "dashboard"."alert_severity" AS ENUM('warning', 'stale', 'critical');--> statement-breakpoint
CREATE TYPE "dashboard"."alert_status" AS ENUM('pending', 'active', 'completed');--> statement-breakpoint
CREATE TYPE "dashboard"."document_delivery_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "dashboard"."kyb_case_status" AS ENUM('not_started', 'in_progress', 'under_review', 'needs_update', 'approved', 'rejected', 'blocked');--> statement-breakpoint
CREATE TYPE "dashboard"."kyb_document_category" AS ENUM('identity', 'address', 'source_of_funds', 'business');--> statement-breakpoint
CREATE TYPE "dashboard"."kyb_document_status" AS ENUM('not_started', 'in_progress', 'under_review', 'needs_update', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "dashboard"."mint_request_status" AS ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TYPE "dashboard"."notification_channel" AS ENUM('email', 'in_app', 'sms');--> statement-breakpoint
CREATE TYPE "dashboard"."payout_rail" AS ENUM('bank', 'swift', 'crypto');--> statement-breakpoint
CREATE TYPE "dashboard"."redeem_request_status" AS ENUM('draft', 'submitted', 'queued', 'processing', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TYPE "dashboard"."request_type" AS ENUM('mint', 'redeem');--> statement-breakpoint
CREATE TYPE "dashboard"."risk_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "dashboard"."snapshot_scope" AS ENUM('public', 'treasury');--> statement-breakpoint
CREATE TYPE "dashboard"."wallet_address_type" AS ENUM('primary', 'secondary', 'treasury', 'withdrawal');--> statement-breakpoint
CREATE TYPE "dashboard"."wallet_connection_status" AS ENUM('connected', 'pending', 'inactive', 'blocked');--> statement-breakpoint
CREATE TYPE "dashboard"."wallet_verification_status" AS ENUM('pending', 'under_review', 'verified', 'rejected', 'inactive');--> statement-breakpoint
CREATE TYPE "dashboard"."workflow_status" AS ENUM('active', 'connected', 'pending', 'under_review', 'approved', 'verified', 'rejected', 'completed', 'blocked', 'inactive', 'warning', 'stale', 'critical', 'draft', 'submitted', 'queued', 'processing', 'not_started', 'in_progress', 'needs_update');--> statement-breakpoint
CREATE TABLE "dashboard"."alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_ref" text,
	"domain" text NOT NULL,
	"type" text NOT NULL,
	"severity" "dashboard"."alert_severity" NOT NULL,
	"status" "dashboard"."alert_status" NOT NULL,
	"source" text NOT NULL,
	"owner_user_id" text,
	"owner_label" text,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dashboard"."bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_holder" text NOT NULL,
	"bank_name" text NOT NULL,
	"iban_masked" text NOT NULL,
	"swift_code" text,
	"country" text NOT NULL,
	"currency" text NOT NULL,
	"status" "dashboard"."workflow_status" DEFAULT 'pending' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."kyb_case_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kyb_case_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"category" "dashboard"."kyb_document_category" NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"status" "dashboard"."kyb_document_status" DEFAULT 'not_started' NOT NULL,
	"latest_uploaded_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."kyb_case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kyb_case_id" uuid NOT NULL,
	"label" text NOT NULL,
	"status" "dashboard"."workflow_status" NOT NULL,
	"actor_user_id" text,
	"actor_label" text,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."kyb_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_ref" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "dashboard"."kyb_case_status" DEFAULT 'not_started' NOT NULL,
	"risk_level" "dashboard"."risk_level" DEFAULT 'low' NOT NULL,
	"reviewer_user_id" text,
	"submitted_at" timestamp with time zone NOT NULL,
	"reviewed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."kyb_document_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kyb_case_document_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewer_user_id" text,
	"status" "dashboard"."kyb_document_status" NOT NULL,
	"reviewer_note" text,
	"storage_uri" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."managed_wallet_address_tags" (
	"wallet_address_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_managed_wallet_address_tags_pkey" PRIMARY KEY("wallet_address_id","tag")
);
--> statement-breakpoint
CREATE TABLE "dashboard"."managed_wallet_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"connection_id" uuid,
	"wallet_ref" text,
	"label" text NOT NULL,
	"address" text NOT NULL,
	"network" text NOT NULL,
	"type" "dashboard"."wallet_address_type" NOT NULL,
	"balance" numeric(20, 2) NOT NULL,
	"allocation_percent" numeric(5, 2),
	"verification_status" "dashboard"."wallet_verification_status" DEFAULT 'pending' NOT NULL,
	"connection_status" "dashboard"."wallet_connection_status" DEFAULT 'connected' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."mint_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_ref" text NOT NULL,
	"user_id" text NOT NULL,
	"submitted_by_user_id" text,
	"source_bank_account_id" uuid,
	"destination_wallet_address_id" uuid,
	"amount" numeric(20, 2) NOT NULL,
	"payment_reference" text NOT NULL,
	"destination_address_raw" text,
	"status" "dashboard"."mint_request_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"rejected_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."redeem_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_ref" text NOT NULL,
	"user_id" text NOT NULL,
	"submitted_by_user_id" text,
	"assignee_user_id" text,
	"destination_bank_account_id" uuid,
	"amount" numeric(20, 2) NOT NULL,
	"destination_account_masked" text NOT NULL,
	"payout_rail" "dashboard"."payout_rail" DEFAULT 'bank' NOT NULL,
	"queue_position" integer,
	"status" "dashboard"."redeem_request_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"rejected_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_type" "dashboard"."request_type" NOT NULL,
	"mint_request_id" uuid,
	"redeem_request_id" uuid,
	"label" text NOT NULL,
	"status" "dashboard"."workflow_status" NOT NULL,
	"actor_user_id" text,
	"actor_label" text,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."request_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_type" "dashboard"."request_type" NOT NULL,
	"mint_request_id" uuid,
	"redeem_request_id" uuid,
	"assignee_user_id" text,
	"sla_target_at" timestamp with time zone,
	"risk_level" "dashboard"."risk_level",
	"kyb_state" "dashboard"."workflow_status",
	"queue_position" integer,
	"operational_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."reserve_snapshot_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reserve_snapshot_id" uuid NOT NULL,
	"bucket" text NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"share_percent" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."reserve_snapshot_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reserve_snapshot_id" uuid NOT NULL,
	"label" text NOT NULL,
	"status" "dashboard"."workflow_status" NOT NULL,
	"actor_user_id" text,
	"actor_label" text,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."reserve_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_ref" text,
	"snapshot_scope" "dashboard"."snapshot_scope" NOT NULL,
	"snapshot_at" timestamp with time zone NOT NULL,
	"reserves_amount" numeric(20, 2) NOT NULL,
	"liabilities_amount" numeric(20, 2) NOT NULL,
	"coverage_ratio" numeric(7, 4) NOT NULL,
	"variance_amount" numeric(20, 2),
	"status" "dashboard"."workflow_status" DEFAULT 'active' NOT NULL,
	"feed_freshness" "dashboard"."workflow_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"published_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."session_metadata" (
	"session_id" text PRIMARY KEY NOT NULL,
	"device_label" text,
	"location_label" text,
	"risk_status" "dashboard"."workflow_status" DEFAULT 'active' NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."user_dashboard_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"default_landing_page" text DEFAULT '/dashboard/overview' NOT NULL,
	"compact_table_density" boolean DEFAULT false NOT NULL,
	"show_usd_in_millions" boolean DEFAULT true NOT NULL,
	"weekly_digest" boolean DEFAULT true NOT NULL,
	"document_delivery" "dashboard"."document_delivery_channel" DEFAULT 'email' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."user_notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"preference_key" text NOT NULL,
	"channel" "dashboard"."notification_channel" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"critical_only" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."user_profile_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"contact_phone" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"base_currency" text DEFAULT 'USD' NOT NULL,
	"reporting_contact_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."wallet_activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"connection_id" uuid,
	"wallet_address_id" uuid,
	"action" text NOT NULL,
	"actor_user_id" text,
	"actor_label" text,
	"target" text,
	"network" text,
	"status" "dashboard"."workflow_status" NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard"."wallet_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"primary_network" text NOT NULL,
	"status" "dashboard"."wallet_connection_status" DEFAULT 'connected' NOT NULL,
	"connected_since" timestamp with time zone,
	"daily_transfer_limit" numeric(20, 2),
	"used_today" numeric(20, 2),
	"policy_profile" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dashboard"."alerts" ADD CONSTRAINT "alerts_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."kyb_case_documents" ADD CONSTRAINT "kyb_case_documents_kyb_case_id_kyb_cases_id_fk" FOREIGN KEY ("kyb_case_id") REFERENCES "dashboard"."kyb_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."kyb_case_events" ADD CONSTRAINT "kyb_case_events_kyb_case_id_kyb_cases_id_fk" FOREIGN KEY ("kyb_case_id") REFERENCES "dashboard"."kyb_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."kyb_case_events" ADD CONSTRAINT "kyb_case_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."kyb_cases" ADD CONSTRAINT "kyb_cases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."kyb_cases" ADD CONSTRAINT "kyb_cases_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."kyb_document_submissions" ADD CONSTRAINT "kyb_document_submissions_kyb_case_document_id_kyb_case_documents_id_fk" FOREIGN KEY ("kyb_case_document_id") REFERENCES "dashboard"."kyb_case_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."kyb_document_submissions" ADD CONSTRAINT "kyb_document_submissions_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."managed_wallet_address_tags" ADD CONSTRAINT "managed_wallet_address_tags_wallet_address_id_managed_wallet_addresses_id_fk" FOREIGN KEY ("wallet_address_id") REFERENCES "dashboard"."managed_wallet_addresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."managed_wallet_addresses" ADD CONSTRAINT "managed_wallet_addresses_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."managed_wallet_addresses" ADD CONSTRAINT "managed_wallet_addresses_connection_id_wallet_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "dashboard"."wallet_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."mint_requests" ADD CONSTRAINT "mint_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."mint_requests" ADD CONSTRAINT "mint_requests_submitted_by_user_id_user_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."mint_requests" ADD CONSTRAINT "mint_requests_source_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("source_bank_account_id") REFERENCES "dashboard"."bank_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."mint_requests" ADD CONSTRAINT "mint_requests_destination_wallet_address_id_managed_wallet_addresses_id_fk" FOREIGN KEY ("destination_wallet_address_id") REFERENCES "dashboard"."managed_wallet_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."redeem_requests" ADD CONSTRAINT "redeem_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."redeem_requests" ADD CONSTRAINT "redeem_requests_submitted_by_user_id_user_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."redeem_requests" ADD CONSTRAINT "redeem_requests_assignee_user_id_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."redeem_requests" ADD CONSTRAINT "redeem_requests_destination_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("destination_bank_account_id") REFERENCES "dashboard"."bank_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."request_events" ADD CONSTRAINT "request_events_mint_request_id_mint_requests_id_fk" FOREIGN KEY ("mint_request_id") REFERENCES "dashboard"."mint_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."request_events" ADD CONSTRAINT "request_events_redeem_request_id_redeem_requests_id_fk" FOREIGN KEY ("redeem_request_id") REFERENCES "dashboard"."redeem_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."request_events" ADD CONSTRAINT "request_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."request_operations" ADD CONSTRAINT "request_operations_mint_request_id_mint_requests_id_fk" FOREIGN KEY ("mint_request_id") REFERENCES "dashboard"."mint_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."request_operations" ADD CONSTRAINT "request_operations_redeem_request_id_redeem_requests_id_fk" FOREIGN KEY ("redeem_request_id") REFERENCES "dashboard"."redeem_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."request_operations" ADD CONSTRAINT "request_operations_assignee_user_id_user_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."reserve_snapshot_allocations" ADD CONSTRAINT "reserve_snapshot_allocations_reserve_snapshot_id_reserve_snapshots_id_fk" FOREIGN KEY ("reserve_snapshot_id") REFERENCES "dashboard"."reserve_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."reserve_snapshot_events" ADD CONSTRAINT "reserve_snapshot_events_reserve_snapshot_id_reserve_snapshots_id_fk" FOREIGN KEY ("reserve_snapshot_id") REFERENCES "dashboard"."reserve_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."reserve_snapshot_events" ADD CONSTRAINT "reserve_snapshot_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."reserve_snapshots" ADD CONSTRAINT "reserve_snapshots_published_by_user_id_user_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."session_metadata" ADD CONSTRAINT "session_metadata_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "identity"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."user_dashboard_preferences" ADD CONSTRAINT "user_dashboard_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."user_profile_settings" ADD CONSTRAINT "user_profile_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."wallet_activity_events" ADD CONSTRAINT "wallet_activity_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."wallet_activity_events" ADD CONSTRAINT "wallet_activity_events_connection_id_wallet_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "dashboard"."wallet_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."wallet_activity_events" ADD CONSTRAINT "wallet_activity_events_wallet_address_id_managed_wallet_addresses_id_fk" FOREIGN KEY ("wallet_address_id") REFERENCES "dashboard"."managed_wallet_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."wallet_activity_events" ADD CONSTRAINT "wallet_activity_events_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard"."wallet_connections" ADD CONSTRAINT "wallet_connections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_alerts_alert_ref_unique" ON "dashboard"."alerts" USING btree ("alert_ref");--> statement-breakpoint
CREATE INDEX "dashboard_alerts_domain_status_severity_created_idx" ON "dashboard"."alerts" USING btree ("domain","status","severity","created_at");--> statement-breakpoint
CREATE INDEX "dashboard_alerts_owner_status_idx" ON "dashboard"."alerts" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX "dashboard_bank_accounts_user_id_idx" ON "dashboard"."bank_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashboard_bank_accounts_user_primary_idx" ON "dashboard"."bank_accounts" USING btree ("user_id","is_primary");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_bank_accounts_user_iban_unique" ON "dashboard"."bank_accounts" USING btree ("user_id","iban_masked");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_kyb_case_documents_case_document_unique" ON "dashboard"."kyb_case_documents" USING btree ("kyb_case_id","document_type");--> statement-breakpoint
CREATE INDEX "dashboard_kyb_case_documents_case_status_idx" ON "dashboard"."kyb_case_documents" USING btree ("kyb_case_id","status");--> statement-breakpoint
CREATE INDEX "dashboard_kyb_case_events_case_occurred_idx" ON "dashboard"."kyb_case_events" USING btree ("kyb_case_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_kyb_cases_case_ref_unique" ON "dashboard"."kyb_cases" USING btree ("case_ref");--> statement-breakpoint
CREATE INDEX "dashboard_kyb_cases_user_id_idx" ON "dashboard"."kyb_cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashboard_kyb_cases_status_submitted_idx" ON "dashboard"."kyb_cases" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "dashboard_kyb_cases_reviewer_status_idx" ON "dashboard"."kyb_cases" USING btree ("reviewer_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_kyb_document_submissions_document_version_unique" ON "dashboard"."kyb_document_submissions" USING btree ("kyb_case_document_id","version");--> statement-breakpoint
CREATE INDEX "dashboard_kyb_document_submissions_status_submitted_idx" ON "dashboard"."kyb_document_submissions" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "dashboard_managed_wallet_address_tags_tag_idx" ON "dashboard"."managed_wallet_address_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "dashboard_managed_wallet_addresses_user_id_idx" ON "dashboard"."managed_wallet_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashboard_managed_wallet_addresses_connection_id_idx" ON "dashboard"."managed_wallet_addresses" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "dashboard_managed_wallet_addresses_verification_status_idx" ON "dashboard"."managed_wallet_addresses" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "dashboard_managed_wallet_addresses_connection_status_idx" ON "dashboard"."managed_wallet_addresses" USING btree ("connection_status");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_managed_wallet_addresses_network_address_unique" ON "dashboard"."managed_wallet_addresses" USING btree ("network","address");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_managed_wallet_addresses_wallet_ref_unique" ON "dashboard"."managed_wallet_addresses" USING btree ("wallet_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_mint_requests_request_ref_unique" ON "dashboard"."mint_requests" USING btree ("request_ref");--> statement-breakpoint
CREATE INDEX "dashboard_mint_requests_user_submitted_idx" ON "dashboard"."mint_requests" USING btree ("user_id","submitted_at");--> statement-breakpoint
CREATE INDEX "dashboard_mint_requests_status_updated_idx" ON "dashboard"."mint_requests" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "dashboard_mint_requests_payment_reference_idx" ON "dashboard"."mint_requests" USING btree ("payment_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_redeem_requests_request_ref_unique" ON "dashboard"."redeem_requests" USING btree ("request_ref");--> statement-breakpoint
CREATE INDEX "dashboard_redeem_requests_user_submitted_idx" ON "dashboard"."redeem_requests" USING btree ("user_id","submitted_at");--> statement-breakpoint
CREATE INDEX "dashboard_redeem_requests_assignee_status_idx" ON "dashboard"."redeem_requests" USING btree ("assignee_user_id","status");--> statement-breakpoint
CREATE INDEX "dashboard_redeem_requests_status_queue_idx" ON "dashboard"."redeem_requests" USING btree ("status","queue_position");--> statement-breakpoint
CREATE INDEX "dashboard_request_events_mint_occurred_idx" ON "dashboard"."request_events" USING btree ("mint_request_id","occurred_at");--> statement-breakpoint
CREATE INDEX "dashboard_request_events_redeem_occurred_idx" ON "dashboard"."request_events" USING btree ("redeem_request_id","occurred_at");--> statement-breakpoint
CREATE INDEX "dashboard_request_events_status_occurred_idx" ON "dashboard"."request_events" USING btree ("status","occurred_at");--> statement-breakpoint
CREATE INDEX "dashboard_request_operations_assignee_idx" ON "dashboard"."request_operations" USING btree ("assignee_user_id");--> statement-breakpoint
CREATE INDEX "dashboard_request_operations_queue_position_idx" ON "dashboard"."request_operations" USING btree ("queue_position");--> statement-breakpoint
CREATE INDEX "dashboard_request_operations_risk_level_idx" ON "dashboard"."request_operations" USING btree ("risk_level");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_request_operations_mint_request_unique" ON "dashboard"."request_operations" USING btree ("mint_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_request_operations_redeem_request_unique" ON "dashboard"."request_operations" USING btree ("redeem_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_reserve_snapshot_allocations_snapshot_bucket_unique" ON "dashboard"."reserve_snapshot_allocations" USING btree ("reserve_snapshot_id","bucket");--> statement-breakpoint
CREATE INDEX "dashboard_reserve_snapshot_allocations_snapshot_idx" ON "dashboard"."reserve_snapshot_allocations" USING btree ("reserve_snapshot_id");--> statement-breakpoint
CREATE INDEX "dashboard_reserve_snapshot_events_snapshot_occurred_idx" ON "dashboard"."reserve_snapshot_events" USING btree ("reserve_snapshot_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_reserve_snapshots_snapshot_ref_unique" ON "dashboard"."reserve_snapshots" USING btree ("snapshot_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_reserve_snapshots_scope_snapshot_unique" ON "dashboard"."reserve_snapshots" USING btree ("snapshot_scope","snapshot_at");--> statement-breakpoint
CREATE INDEX "dashboard_reserve_snapshots_status_freshness_snapshot_idx" ON "dashboard"."reserve_snapshots" USING btree ("status","feed_freshness","snapshot_at");--> statement-breakpoint
CREATE INDEX "dashboard_session_metadata_risk_last_active_idx" ON "dashboard"."session_metadata" USING btree ("risk_status","last_active_at");--> statement-breakpoint
CREATE INDEX "dashboard_user_dashboard_preferences_default_landing_page_idx" ON "dashboard"."user_dashboard_preferences" USING btree ("default_landing_page");--> statement-breakpoint
CREATE INDEX "dashboard_user_notification_preferences_user_enabled_idx" ON "dashboard"."user_notification_preferences" USING btree ("user_id","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_user_notification_preferences_user_preference_channel_unique" ON "dashboard"."user_notification_preferences" USING btree ("user_id","preference_key","channel");--> statement-breakpoint
CREATE INDEX "dashboard_user_profile_settings_timezone_idx" ON "dashboard"."user_profile_settings" USING btree ("timezone");--> statement-breakpoint
CREATE INDEX "dashboard_wallet_activity_events_user_id_idx" ON "dashboard"."wallet_activity_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashboard_wallet_activity_events_occurred_at_idx" ON "dashboard"."wallet_activity_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "dashboard_wallet_activity_events_status_idx" ON "dashboard"."wallet_activity_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dashboard_wallet_connections_user_id_idx" ON "dashboard"."wallet_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dashboard_wallet_connections_user_status_idx" ON "dashboard"."wallet_connections" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_wallet_connections_provider_account_unique" ON "dashboard"."wallet_connections" USING btree ("provider","provider_account_id");