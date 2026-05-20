PRAGMA foreign_keys=OFF;

CREATE TABLE `categories__new` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO `categories__new` (
	`id`,
	`name`,
	`slug`,
	`description`,
	`sort_order`,
	`is_visible`,
	`status`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`name`,
	substr(lower(replace(trim(`name`), ' ', '-')), 1, 113) || '-' || substr(`id`, 1, 6),
	NULL,
	0,
	true,
	'ACTIVE',
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
FROM `categories`;

CREATE TABLE `product_categories__new` (
	`product_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`product_id`, `category_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories__new`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `product_categories__new` (`product_id`, `category_id`)
SELECT `product_id`, `category_id`
FROM `product_categories`;

DROP TABLE `product_categories`;
DROP TABLE `categories`;

ALTER TABLE `categories__new` RENAME TO `categories`;
ALTER TABLE `product_categories__new` RENAME TO `product_categories`;

CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);
CREATE INDEX `idx_categories_status` ON `categories` (`status`);
CREATE INDEX `idx_categories_visible` ON `categories` (`is_visible`);
CREATE INDEX `idx_categories_sort_order` ON `categories` (`sort_order`);

PRAGMA foreign_keys=ON;

