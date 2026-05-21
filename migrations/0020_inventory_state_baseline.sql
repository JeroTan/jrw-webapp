ALTER TABLE `product_variants` ADD `inventory_state` text DEFAULT 'OUT_OF_STOCK' NOT NULL;
ALTER TABLE `product_variants` ADD `stock_version` integer DEFAULT 0 NOT NULL;

UPDATE `product_variants`
SET
  `inventory_state` = CASE
    WHEN `is_preorder` = 1 THEN 'PREORDER'
    WHEN `stock` <= 0 THEN 'OUT_OF_STOCK'
    WHEN `stock` <= 10 THEN 'LOW_STOCK'
    ELSE 'IN_STOCK'
  END,
  `stock_version` = CASE
    WHEN `stock_lock_version` > 0 THEN `stock_lock_version`
    ELSE 0
  END;
