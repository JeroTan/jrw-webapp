CREATE TABLE `oauth_state_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`state_hash` text NOT NULL,
	`nonce_hash` text NOT NULL,
	`redirect_path` text DEFAULT '/' NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_request_id` text,
	`source_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_state_tokens_state_hash_idx` ON `oauth_state_tokens` (`state_hash`);--> statement-breakpoint
CREATE INDEX `oauth_state_tokens_provider_active_idx` ON `oauth_state_tokens` (`provider`,`state_hash`,`expires_at`) WHERE "oauth_state_tokens"."used_at" IS NULL;--> statement-breakpoint
CREATE INDEX `oauth_state_tokens_expires_at_idx` ON `oauth_state_tokens` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_providers_provider_user_idx` ON `customer_providers` (`provider`,`provider_user_id`);--> statement-breakpoint
CREATE INDEX `customer_providers_customer_idx` ON `customer_providers` (`customer_id`);