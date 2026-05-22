-- Manual migration: price_centavos_integer
-- Reason: Epic 3 retro critical path. Money values are stored as integer centavos.
-- SQL review: Rebuilds money-bearing tables only. Existing values are rounded because
-- Story 3.4 and 3.8 already write centavos into these legacy real columns.

PRAGMA foreign_keys=OFF;

CREATE TABLE `product_variants_new` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `stock` integer DEFAULT 0 NOT NULL,
  `inventory_state` text DEFAULT 'OUT_OF_STOCK' NOT NULL,
  `price` integer NOT NULL,
  `sku` text NOT NULL,
  `is_preorder` integer DEFAULT false NOT NULL,
  `expected_release` text,
  `stock_version` integer DEFAULT 0 NOT NULL,
  `stock_lock_version` integer DEFAULT 0 NOT NULL,
  `variation_chain` text DEFAULT '[]' NOT NULL,
  `image_reference_id` text REFERENCES `product_photos`(`id`) ON UPDATE no action ON DELETE set null,
  `product_id` text NOT NULL REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `product_variants_new` (
  `id`,
  `name`,
  `stock`,
  `inventory_state`,
  `price`,
  `sku`,
  `is_preorder`,
  `expected_release`,
  `stock_version`,
  `stock_lock_version`,
  `variation_chain`,
  `image_reference_id`,
  `product_id`
)
SELECT
  `id`,
  `name`,
  `stock`,
  `inventory_state`,
  CAST(ROUND(`price`) AS integer),
  `sku`,
  `is_preorder`,
  `expected_release`,
  `stock_version`,
  `stock_lock_version`,
  `variation_chain`,
  `image_reference_id`,
  `product_id`
FROM `product_variants`;
--> statement-breakpoint
DROP TABLE `product_variants`;
--> statement-breakpoint
ALTER TABLE `product_variants_new` RENAME TO `product_variants`;
--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_sku_unique` ON `product_variants` (`sku`);
--> statement-breakpoint

CREATE TABLE `order_snapshots_new` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `product_id` text,
  `product_slug` text,
  `variant_id` text,
  `product_name` text NOT NULL,
  `variant_name` text NOT NULL,
  `variant_options` text DEFAULT '[]' NOT NULL,
  `price_at_purchase` integer NOT NULL,
  `price_centavos` integer DEFAULT 0 NOT NULL,
  `quantity` integer DEFAULT 1 NOT NULL,
  `image_r2_key` text,
  `snapshot_timestamp` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `snapshot_signature` text,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `order_snapshots_new` (
  `id`,
  `order_id`,
  `product_id`,
  `product_slug`,
  `variant_id`,
  `product_name`,
  `variant_name`,
  `variant_options`,
  `price_at_purchase`,
  `price_centavos`,
  `quantity`,
  `image_r2_key`,
  `snapshot_timestamp`,
  `snapshot_signature`
)
SELECT
  `id`,
  `order_id`,
  `product_id`,
  `product_slug`,
  `variant_id`,
  `product_name`,
  `variant_name`,
  `variant_options`,
  CAST(ROUND(CASE WHEN `price_centavos` > 0 THEN `price_centavos` ELSE `price_at_purchase` END) AS integer),
  CAST(ROUND(CASE WHEN `price_centavos` > 0 THEN `price_centavos` ELSE `price_at_purchase` END) AS integer),
  `quantity`,
  `image_r2_key`,
  `snapshot_timestamp`,
  `snapshot_signature`
FROM `order_snapshots`;
--> statement-breakpoint
DROP TABLE `order_snapshots`;
--> statement-breakpoint
ALTER TABLE `order_snapshots_new` RENAME TO `order_snapshots`;
--> statement-breakpoint
CREATE INDEX `idx_order_snapshots_order_id` ON `order_snapshots` (`order_id`);
--> statement-breakpoint
CREATE INDEX `idx_order_snapshots_product_id` ON `order_snapshots` (`product_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_snapshots_signature_unique`
  ON `order_snapshots` (`snapshot_signature`)
  WHERE `snapshot_signature` IS NOT NULL;
--> statement-breakpoint

PRAGMA foreign_keys=ON;
