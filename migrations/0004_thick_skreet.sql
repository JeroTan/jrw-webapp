CREATE TABLE `customer_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_providers_provider_user_id_unique` ON `customer_providers` (`provider_user_id`);--> statement-breakpoint
ALTER TABLE `customers` ADD `password_hash` text;--> statement-breakpoint
ALTER TABLE `customers` ADD `avatar_url` text;