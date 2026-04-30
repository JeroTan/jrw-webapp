# Agenda: Customer Identity Refactor (Feature 00004)

## Completeness
- [ ] Does the `customers` table include a nullable `password_hash` to support optional local login?
- [ ] Does the `customers` table include an `avatar_url` field for primary profile picture storage?
- [ ] Is the `customer_providers` table defined with a many-to-one relationship to `customers`?
- [ ] Does `customer_providers` include a `provider` enum/text (e.g., 'GOOGLE', 'FACEBOOK') and a unique `provider_user_id`?

## Clarity
- [ ] Are the foreign key constraints on `customer_providers.customer_id` explicitly set to `onDelete: "cascade"`?
- [ ] Is the `customer_providers.metadata` field defined to handle JSON-serialized snapshots from OAuth providers?

## Edge Cases
- [ ] Is the schema design compatible with the "Auto-Linking" requirement for matching emails?
- [ ] Does the schema allow for a user to have zero providers (Email/Password only) or multiple providers?

## Non-Functional
- [ ] Do all new table and column names follow the `snake_case` naming convention?
- [ ] Are all identifiers (`id`) using the `cuid2` generator as per project standards?
