ALTER TABLE `product_photos` ADD `image_id` text NOT NULL;--> statement-breakpoint
ALTER TABLE `product_photos` DROP COLUMN `image_link`;