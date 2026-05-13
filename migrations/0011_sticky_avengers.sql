CREATE TABLE `email_verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_request_id` text,
	`source_hash` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_verification_tokens_token_hash_idx` ON `email_verification_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `email_verification_tokens_customer_idx` ON `email_verification_tokens` (`customer_id`);--> statement-breakpoint
CREATE INDEX `email_verification_tokens_customer_active_idx` ON `email_verification_tokens` (`customer_id`,`expires_at`) WHERE "email_verification_tokens"."used_at" IS NULL;--> statement-breakpoint
CREATE INDEX `email_verification_tokens_expires_at_idx` ON `email_verification_tokens` (`expires_at`);--> statement-breakpoint
ALTER TABLE `customers` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `email_marketing_opt_in` integer DEFAULT false NOT NULL;