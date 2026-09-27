-- 003_constraints.sql
-- TechPharma - PostgreSQL relational constraints (Phase 3).
--
-- Rules followed:
--   * Constraints describe behaviour the application already relies on.
--   * Anything that could contradict data already in production is added with
--     `NOT VALID` so it is enforced for all NEW rows immediately, while existing
--     rows stay untouched until the import report shows zero violations. Then:
--       ALTER TABLE <t> VALIDATE CONSTRAINT <name>;
--     Data is never silently deleted or rewritten to satisfy a constraint.
--   * FKs live in 001 (they are part of the table definitions).

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

-- Login, register and forgot-password all compare emails case-insensitively
-- (`email.toLowerCase()`), so uniqueness must be case-insensitive to match.
-- Duplicate emails differing only by case would already be a login bug.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'admin')) NOT VALID;

ALTER TABLE users ADD CONSTRAINT users_failed_attempts_check
  CHECK (failed_attempts >= 0) NOT VALID;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

ALTER TABLE products ADD CONSTRAINT products_price_check
  CHECK (price >= 0) NOT VALID;

ALTER TABLE products ADD CONSTRAINT products_version_check
  CHECK (version >= 0) NOT VALID;

-- ---------------------------------------------------------------------------
-- inventory_stock - mirrors the SQLite CHECK constraints that prevent oversell
-- ---------------------------------------------------------------------------

ALTER TABLE inventory_stock ADD CONSTRAINT inventory_stock_total_check
  CHECK (total_stock >= 0) NOT VALID;
ALTER TABLE inventory_stock ADD CONSTRAINT inventory_stock_available_check
  CHECK (available_stock >= 0) NOT VALID;
ALTER TABLE inventory_stock ADD CONSTRAINT inventory_stock_reserved_check
  CHECK (reserved_stock >= 0) NOT VALID;
ALTER TABLE inventory_stock ADD CONSTRAINT inventory_stock_sold_check
  CHECK (sold >= 0) NOT VALID;
ALTER TABLE inventory_stock ADD CONSTRAINT inventory_stock_sales_count_check
  CHECK (sales_count >= 0) NOT VALID;

-- ---------------------------------------------------------------------------
-- reservations
-- ---------------------------------------------------------------------------

ALTER TABLE reservations ADD CONSTRAINT reservations_quantity_check
  CHECK (quantity > 0) NOT VALID;

ALTER TABLE reservations ADD CONSTRAINT reservations_status_check
  CHECK (status IN ('ACTIVE', 'CONFIRMED', 'CANCELLED', 'EXPIRED')) NOT VALID;

-- Only one live reservation per idempotency key. Expired/cancelled keys may be
-- reused for a fresh reservation - same rule as the SQLite partial unique index.
CREATE UNIQUE INDEX IF NOT EXISTS reservations_idem_active_key
  ON reservations (idempotency_key)
  WHERE status IN ('ACTIVE', 'CONFIRMED') AND idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

-- 'completed' is not in the PUT /api/orders/:id/status whitelist but IS counted
-- by GET /api/orders/stats and can exist on historical rows, so it is allowed.
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'completed'))
  NOT VALID;

ALTER TABLE orders ADD CONSTRAINT orders_total_amount_check
  CHECK (total_amount >= 0) NOT VALID;

-- Idempotent checkout: the same key must never create two orders.
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_key
  ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- order_items / cart_items
-- ---------------------------------------------------------------------------

ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_check
  CHECK (quantity > 0) NOT VALID;

ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_check
  CHECK (quantity > 0) NOT VALID;

-- ---------------------------------------------------------------------------
-- otps
-- ---------------------------------------------------------------------------

-- One live OTP per (email, purpose) - setOtpEntry replaces any previous entry.
CREATE UNIQUE INDEX IF NOT EXISTS otps_email_purpose_key ON otps (email, purpose);
