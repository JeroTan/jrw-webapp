-- Manual migration: brand_optional_image
-- Reason: Add optional R2-backed image metadata for brand catalog groups.
-- SQL review: Nullable columns preserve existing brand records.

ALTER TABLE `brands` ADD `image_id` text;
--> statement-breakpoint
ALTER TABLE `brands` ADD `image_r2_key` text;
--> statement-breakpoint
ALTER TABLE `brands` ADD `image_alt` text;
