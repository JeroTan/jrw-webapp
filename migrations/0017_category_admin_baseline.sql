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

WITH RECURSIVE
	`category_source`(`id`, `name`, `normalized_name`) AS (
		SELECT `id`, `name`, lower(trim(`name`))
		FROM `categories`
	),
	`category_slug_chars`(`id`, `name`, `position`, `slug`, `last_dash`) AS (
		SELECT `id`, `name`, 1, '', 1
		FROM `category_source`
		UNION ALL
		SELECT
			`category_slug_chars`.`id`,
			`category_slug_chars`.`name`,
			`position` + 1,
			CASE
				WHEN substr(`category_source`.`normalized_name`, `position`, 1) GLOB '[a-z0-9]' THEN
					`slug` || substr(`category_source`.`normalized_name`, `position`, 1)
				WHEN `last_dash` = 0 THEN
					`slug` || '-'
				ELSE
					`slug`
			END,
			CASE
				WHEN substr(`category_source`.`normalized_name`, `position`, 1) GLOB '[a-z0-9]' THEN 0
				ELSE 1
			END
		FROM `category_slug_chars`
		JOIN `category_source` ON `category_source`.`id` = `category_slug_chars`.`id`
		WHERE `position` <= length(`category_source`.`normalized_name`)
	),
	`category_slugs`(`id`, `slug`) AS (
		SELECT
			`id`,
			trim(`slug`, '-')
		FROM `category_slug_chars`
		JOIN `category_source` USING (`id`, `name`)
		WHERE `position` > length(`category_source`.`normalized_name`)
	)
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
	`categories`.`id`,
	`categories`.`name`,
	substr(
		CASE
			WHEN `category_slugs`.`slug` = '' THEN 'category'
			ELSE `category_slugs`.`slug`
		END,
		1,
		100
	) || '-' || printf('%06d', row_number() OVER (ORDER BY `categories`.`id`)),
	NULL,
	0,
	true,
	'ACTIVE',
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
FROM `categories`
JOIN `category_slugs` ON `category_slugs`.`id` = `categories`.`id`;

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
