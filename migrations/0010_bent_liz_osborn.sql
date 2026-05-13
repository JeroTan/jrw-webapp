CREATE TABLE `auth_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_hash` text NOT NULL,
	`window_start` text NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_rate_limits_scope_window_idx` ON `auth_rate_limits` (`scope_hash`,`window_start`);--> statement-breakpoint
CREATE INDEX `auth_rate_limits_expires_at_idx` ON `auth_rate_limits` (`expires_at`);