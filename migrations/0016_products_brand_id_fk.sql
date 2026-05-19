ALTER TABLE `products` ADD `brand_id` text REFERENCES `brands`(`id`) ON DELETE set null;--> statement-breakpoint
UPDATE `products`
SET `brand_id` = (
	SELECT `brands`.`id`
	FROM `brands`
	WHERE trim(coalesce(`products`.`brand`, '')) <> ''
		AND (
			`brands`.`id` = trim(`products`.`brand`)
			OR lower(`brands`.`name`) = lower(trim(`products`.`brand`))
			OR lower(`brands`.`slug`) = lower(trim(`products`.`brand`))
		)
	ORDER BY `brands`.`created_at` ASC, `brands`.`id` ASC
	LIMIT 1
)
WHERE trim(coalesce(`brand`, '')) <> ''
	AND `brand_id` IS NULL;--> statement-breakpoint
CREATE INDEX `idx_products_brand_id` ON `products` (`brand_id`);
