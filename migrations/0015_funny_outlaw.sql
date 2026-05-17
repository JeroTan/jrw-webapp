CREATE TABLE `brands` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by_admin_id` text NOT NULL,
	`archived_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`created_by_admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_name_unique` ON `brands` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `brands_slug_unique` ON `brands` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_brands_slug` ON `brands` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_brands_status` ON `brands` (`status`);--> statement-breakpoint
CREATE TABLE `brand_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`brand_id` text NOT NULL,
	`admin_id` text NOT NULL,
	`role` text DEFAULT 'MEMBER' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`invited_by_admin_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_brand_memberships_brand_admin` ON `brand_memberships` (`brand_id`,`admin_id`);--> statement-breakpoint
CREATE INDEX `idx_brand_memberships_admin` ON `brand_memberships` (`admin_id`);--> statement-breakpoint
CREATE INDEX `idx_brand_memberships_brand` ON `brand_memberships` (`brand_id`);
