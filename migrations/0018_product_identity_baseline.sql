PRAGMA foreign_keys=OFF;

CREATE TABLE `products__new` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`brand` text,
	`brand_id` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`summary` text,
	`description` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE set null
);

WITH RECURSIVE
	`product_source`(
		`id`,
		`name`,
		`normalized_name`,
		`brand`,
		`brand_id`,
		`tags`,
		`description`,
		`created_at`,
		`updated_at`
	) AS (
		SELECT
			`id`,
			`name`,
			lower(trim(`name`)),
			`brand`,
			`brand_id`,
			`tags`,
			`description`,
			`created_at`,
			`updated_at`
		FROM `products`
	),
	`product_slug_chars`(`id`, `position`, `slug`, `last_dash`) AS (
		SELECT `id`, 1, '', 1
		FROM `product_source`
		UNION ALL
		SELECT
			`product_slug_chars`.`id`,
			`position` + 1,
			CASE
				WHEN substr(`product_source`.`normalized_name`, `position`, 1) GLOB '[a-z0-9]' THEN
					`slug` || substr(`product_source`.`normalized_name`, `position`, 1)
				WHEN `last_dash` = 0 THEN
					`slug` || '-'
				ELSE
					`slug`
			END,
			CASE
				WHEN substr(`product_source`.`normalized_name`, `position`, 1) GLOB '[a-z0-9]' THEN 0
				ELSE 1
			END
		FROM `product_slug_chars`
		JOIN `product_source` ON `product_source`.`id` = `product_slug_chars`.`id`
		WHERE `position` <= length(`product_source`.`normalized_name`)
	),
	`product_slug_base`(`id`, `slug_base`) AS (
		SELECT
			`product_slug_chars`.`id`,
			CASE
				WHEN trim(`product_slug_chars`.`slug`, '-') = '' THEN 'product'
				ELSE trim(`product_slug_chars`.`slug`, '-')
			END
		FROM `product_slug_chars`
		JOIN `product_source` ON `product_source`.`id` = `product_slug_chars`.`id`
		WHERE `position` > length(`product_source`.`normalized_name`)
	),
	`product_slug_ranked` AS (
		SELECT
			`product_source`.`id`,
			`product_source`.`name`,
			`product_source`.`brand`,
			`product_source`.`brand_id`,
			`product_source`.`tags`,
			`product_source`.`description`,
			`product_source`.`created_at`,
			`product_source`.`updated_at`,
			substr(`product_slug_base`.`slug_base`, 1, 120) AS `slug_base`,
			row_number() OVER (
				PARTITION BY `product_slug_base`.`slug_base`
				ORDER BY `product_source`.`id`
			) AS `slug_rank`
		FROM `product_source`
		JOIN `product_slug_base` ON `product_slug_base`.`id` = `product_source`.`id`
	)
INSERT INTO `products__new` (
	`id`,
	`name`,
	`slug`,
	`brand`,
	`brand_id`,
	`tags`,
	`summary`,
	`description`,
	`status`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`name`,
	CASE
		WHEN `slug_rank` = 1 THEN `slug_base`
		ELSE
			substr(
				`slug_base`,
				1,
				120 - length('-' || CAST(`slug_rank` - 1 AS text))
			) || '-' || CAST(`slug_rank` - 1 AS text)
	END,
	`brand`,
	`brand_id`,
	coalesce(`tags`, '[]'),
	NULL,
	`description`,
	'DRAFT',
	coalesce(`created_at`, CURRENT_TIMESTAMP),
	coalesce(`updated_at`, CURRENT_TIMESTAMP)
FROM `product_slug_ranked`;

DROP TABLE `products`;
ALTER TABLE `products__new` RENAME TO `products`;

CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);
CREATE INDEX `idx_products_brand_id` ON `products` (`brand_id`);
CREATE INDEX `idx_products_status` ON `products` (`status`);

PRAGMA foreign_keys=ON;
