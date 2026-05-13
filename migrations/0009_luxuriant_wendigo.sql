CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`actor_kind` text NOT NULL,
	`actor_id` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`last_used_at` text,
	`created_request_id` text,
	`created_ip_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_idx` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_actor_idx` ON `sessions` (`actor_kind`,`actor_id`);--> statement-breakpoint
CREATE INDEX `sessions_actor_active_idx` ON `sessions` (`actor_kind`,`actor_id`,`status`) WHERE "sessions"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX `sessions_active_expiry_idx` ON `sessions` (`expires_at`) WHERE "sessions"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX `sessions_revoked_at_idx` ON `sessions` (`revoked_at`) WHERE "sessions"."revoked_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE `admins` ADD `password_salt` text;--> statement-breakpoint
ALTER TABLE `admins` ADD `status` text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE `admins` ADD `email_verified_at` text;--> statement-breakpoint
ALTER TABLE `admins` ADD `approved_at` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `password_salt` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `status` text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `email_verified_at` text;