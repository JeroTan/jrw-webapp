DROP INDEX `admins_single_owner_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `admins_single_owner_idx` ON `admins` (1) WHERE "admins"."is_owner" <> 0;