PRAGMA foreign_keys=OFF;

CREATE TABLE `product_photos__new` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text,
  `image_id` text NOT NULL,
  `r2_key` text NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `is_primary` integer DEFAULT false NOT NULL,
  `file_size` integer,
  `content_type` text,
  `width` integer,
  `height` integer,
  `product_id` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);

WITH ranked AS (
  SELECT
    `id`,
    `name`,
    `image_id`,
    `product_id`,
    row_number() OVER (
      PARTITION BY `product_id`
      ORDER BY `id`
    ) AS `photo_rank`
  FROM `product_photos`
)
INSERT INTO `product_photos__new` (
  `id`,
  `name`,
  `image_id`,
  `r2_key`,
  `sort_order`,
  `is_primary`,
  `file_size`,
  `content_type`,
  `width`,
  `height`,
  `product_id`,
  `created_at`,
  `updated_at`
)
SELECT
  `id`,
  `name`,
  `image_id`,
  `image_id`,
  `photo_rank` - 1,
  CASE
    WHEN `photo_rank` = 1 THEN 1
    ELSE 0
  END,
  NULL,
  NULL,
  NULL,
  NULL,
  `product_id`,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM ranked;

DROP TABLE `product_photos`;
ALTER TABLE `product_photos__new` RENAME TO `product_photos`;

CREATE INDEX `idx_product_photos_product_sort` ON `product_photos` (`product_id`,`sort_order`);
CREATE INDEX `idx_product_photos_product_primary` ON `product_photos` (`product_id`,`is_primary`);

PRAGMA foreign_keys=ON;