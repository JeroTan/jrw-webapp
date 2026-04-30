# Identity Management Standards

## 1. Multi-Provider OAuth Pattern
We utilize a one-to-many relationship between `customers` and `customer_providers` to handle multiple authentication methods (Google, Facebook, etc.) for a single user entity.

## 2. Account Linking & Merging
- **Auto-Linking**: If a user registers via an OAuth provider (e.g., Google) and the email matches an existing record (e.g., from a Guest Checkout), the system MUST automatically link the provider to the existing `customer_id`.
- **Primary Guard**: A user MUST NOT be allowed to unlink their last remaining authentication method if no password is set for the account.

## 3. Data Precedence (Profile Sync)
- **Local Priority**: Internal profile data (names, avatars) in the `customers` table always takes precedence over provider metadata.
- **Empty Fill**: Provider metadata SHOULD only be used to populate fields in the `customers` table if those fields are currently empty (NULL). Existing data MUST NOT be overwritten by subsequent provider logins or linkings.

## 4. Schema Mapping
- `customers.password_hash`: Nullable. Only filled if the user explicitly sets a local password.
- `customer_providers.metadata`: JSON field to store the "Original" snapshot of the provider's data (e.g., initial Google name/avatar) for potential future reference.
