PRAGMA foreign_keys=OFF;

CREATE TABLE `order_snapshots_new` (
  `id` text PRIMARY KEY NOT NULL,
  `order_id` text NOT NULL,
  `product_id` text,
  `product_slug` text,
  `variant_id` text,
  `product_name` text NOT NULL,
  `variant_name` text NOT NULL,
  `variant_options` text DEFAULT '[]' NOT NULL,
  `price_at_purchase` real NOT NULL,
  `price_centavos` integer DEFAULT 0 NOT NULL,
  `quantity` integer DEFAULT 1 NOT NULL,
  `image_r2_key` text,
  `snapshot_timestamp` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `snapshot_signature` text,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON UPDATE no action ON DELETE set null
);

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
  NULL,
  NULL,
  `product_name`,
  `variant_name`,
  '[]',
  `price_at_purchase`,
  CAST(ROUND(`price_at_purchase`) AS integer),
  `quantity`,
  NULL,
  CURRENT_TIMESTAMP,
  NULL
FROM `order_snapshots`;

DROP TABLE `order_snapshots`;
ALTER TABLE `order_snapshots_new` RENAME TO `order_snapshots`;

CREATE INDEX `idx_order_snapshots_order_id` ON `order_snapshots` (`order_id`);
CREATE INDEX `idx_order_snapshots_product_id` ON `order_snapshots` (`product_id`);
CREATE UNIQUE INDEX `order_snapshots_signature_unique`
  ON `order_snapshots` (`snapshot_signature`)
  WHERE `snapshot_signature` IS NOT NULL;

PRAGMA foreign_keys=ON;
