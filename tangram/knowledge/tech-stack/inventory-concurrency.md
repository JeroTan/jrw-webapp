# Inventory Safety: The "Safety Belt" Protocol

This document explains our dual-layer strategy for ensuring "Zero Overselling" and transactional integrity using **Cloudflare Durable Objects** and **Optimistic Concurrency Control (OCC)** via `stock_lock_version`.

## 1. The Core Strategy
We use a "Defense in Depth" approach to handle high-traffic inventory updates.

1.  **The Brakes (Durable Objects):** Act as a real-time mutex to prevent race conditions at the application level.
2.  **The Safety Belt (`stock_lock_version`):** Acts as a database-level guard to prevent stale data updates and ensure idempotency.

## 2. Why use `stock_lock_version`?

Even though Durable Objects (DO) are single-threaded and prevent simultaneous writes to the same SKU, the `stock_lock_version` (an incrementing integer) is required for three critical reasons:

### A. The "Gap of Uncertainty" (UX)
A user might look at a product page for 30 seconds before clicking "Buy." During that time, another user might have bought the last item. 
- Without the version: The system simply sees `stock: 0` and gives a generic error.
- With the version: The system detects the client sent `version: 10` but the DB is at `version: 11`. We can specifically tell the user: *"The item sold out while you were browsing."*

### B. Idempotency & "Double-Click" Protection
If a user accidentally clicks "Buy" twice or a network retry occurs:
1.  **Request 1**: Updates the stock and increments the version to `11`.
2.  **Request 2**: Still carries `version: 10`. The database query `WHERE version = 10` will find 0 rows because the version is now `11`. 
This prevents the user from being charged twice or deducting stock twice for the same intent.

### C. Data Integrity (Last Line of Defense)
If an admin update or a secondary service bypasses the Durable Object and writes directly to D1, the `stock_lock_version` ensures that no update can ever be based on "stale" information. It forces the "writer" to prove they have seen the most recent state of the record.

## 3. How it Works (The Round Trip)

1.  **Read**: Server sends `Stock: 5` and `Version: 10` to the client.
2.  **Hold**: Client browser holds `Version: 10` while the user decides.
3.  **Action**: Client sends the "Buy" request with `Version: 10` included.
4.  **Verify**: The SQL query uses a conditional update:
    ```sql
    UPDATE product_variants 
    SET stock = stock - 1, stock_lock_version = stock_lock_version + 1
    WHERE id = 'variant_id' AND stock_lock_version = 10;
    ```
5.  **Result**: If 0 rows are updated, the server knows the data was "stale" and aborts the transaction safely.

## 4. Key Takeaways
- **Stock** tracks *quantity* (goes down).
- **Version** tracks *revisions* (always goes up).
- One transaction = One version jump (regardless of how many items were bought).
