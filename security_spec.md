# Security Specification - Universal Parts

## Data Invariants
1. A **Quote** must be associated with an existing **Client**.
2. An **Order** must be associated with an existing **Client** and (usually) a **Quote**.
3. **Shipping costs** and **ETA** are system-calculated or admin-managed, but users can update them if authorized (logistics staff).
4. **collectedAt** and **arrivedAt** are immutable once set or only modifiable by admins.
5. **Admin privileges** are strictly bound to `radoh410@gmail.com` with verified email.

## The Dirty Dozen Payloads (Target: Permission Denied)

1. **Identity Spoofing**: Attempt to create a client with a spoofed `ownerId` (if we had one) or someone else's name.
2. **Resource Poisoning**: Create a client with a 2MB name string.
3. **Price Manipulation**: Create a quote with negative profit or manipulated sale prices that bypass validation logic.
4. **State Jumping**: Update an order status directly from `PREPARATION` to `COLLECTED` bypassing warehouse logic.
5. **Unauthorized Settings Access**: A non-admin user trying to update `seaRate` or `airRate`.
6. **Orphaned Writes**: Create an order for a non-existent `clientId`.
7. **Junk ID Injection**: Create a document using an ID with malicious characters (e.g., `../bin/sh`).
8. **Shadow Field Injection**: Adding an `isAdmin: true` field to a user profile or document.
9. **Terminal Lock Breach**: Trying to update an order that has already been `COLLECTED`.
10. **PII Leakage**: Authenticated user trying to list or read another user's private data (if any).
11. **Query Scraping**: Attempting a list query without the corresponding `where` filter that matches the rule's data check.
12. **Timestamp Fraud**: Providing a client-side timestamp for `createdAt` instead of `request.time`.

## Test Runner (Logic Outline)
The rules will be verified against these payloads to ensure `PERMISSION_DENIED`.
