CREATE TABLE `checkout_attempts` (
  `id` text PRIMARY KEY NOT NULL,
  `customer_id` text,
  `checkout_email` text NOT NULL,
  `full_name` text NOT NULL,
  `first_name` text,
  `last_name` text,
  `phone` text NOT NULL,
  `street_address` text NOT NULL,
  `barangay` text NOT NULL,
  `city_province` text NOT NULL,
  `postal_code` text NOT NULL,
  `privacy_acknowledged_at` text NOT NULL,
  `status` text DEFAULT 'DETAILS_CAPTURED' NOT NULL,
  `created_request_id` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_checkout_attempts_customer_id` ON `checkout_attempts` (`customer_id`);
--> statement-breakpoint
CREATE INDEX `idx_checkout_attempts_checkout_email` ON `checkout_attempts` (`checkout_email`);
--> statement-breakpoint
CREATE INDEX `idx_checkout_attempts_created_at` ON `checkout_attempts` (`created_at`);
