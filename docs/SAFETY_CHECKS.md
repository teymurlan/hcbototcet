# STAFF safety checks

- Active photo reports are isolated by employee and order.
- Before/after drafts are isolated by employee, order and stage.
- Only the manager-selected lead cleaner can own the report for a multi-person team.
- Repeated file uploads carry an idempotency client id.
- Multipart uploads do not override the browser-generated boundary.
- Accepted reports are reflected in manager review counters.
- Legacy single active reports are migrated into the scoped storage on first access.
