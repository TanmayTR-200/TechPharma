-- 002_indexes.sql
-- TechPharma - PostgreSQL indexes (Phase 4).
--
-- Every index here maps to a query the application actually runs (audited in
-- backend/server.js and backend/src/routes/*.js). No blanket per-column indexes.
-- These are what replace the old `readJsonFile(...).find(...)` / `.filter(...)`
-- patterns with real indexed lookups.

-- users ---------------------------------------------------------------------
-- Admin dashboard "recent users" sorts by createdAt DESC
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at DESC);
-- Login / forgot-password / registered-email checks
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
-- Lockout sweeps / admin views
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

-- password_history ----------------------------------------------------------
-- "last 5 hashes, newest first" lookup on every password change/reset
CREATE INDEX IF NOT EXISTS password_history_user_idx ON password_history (user_id, id DESC);

-- saved_addresses -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS saved_addresses_user_idx ON saved_addresses (user_id, position);

-- otps ----------------------------------------------------------------------
-- Cleanup of expired codes
CREATE INDEX IF NOT EXISTS otps_expires_idx ON otps (expires_at);

-- products ------------------------------------------------------------------
-- GET /api/products?sellerId=..., /api/sold-products/:sellerId, dashboard tiles
CREATE INDEX IF NOT EXISTS products_seller_idx ON products (seller_id);
-- Product list filters: category, state, status, newest first
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_state_idx ON products (state);
CREATE INDEX IF NOT EXISTS products_status_created_idx ON products (status, created_at DESC);
-- Full-text-ish search support (name ILIKE) - trigram would need an extension,
-- a plain index still serves prefix/equality and keeps the audit honest
CREATE INDEX IF NOT EXISTS products_name_idx ON products (name);

-- inventory_stock -----------------------------------------------------------
-- PK is product_id; nothing else is queried by the reservation/checkout path.

-- reservations --------------------------------------------------------------
CREATE INDEX IF NOT EXISTS reservations_product_idx ON reservations (product_id);
CREATE INDEX IF NOT EXISTS reservations_status_idx ON reservations (status);
CREATE INDEX IF NOT EXISTS reservations_user_idx ON reservations (user_id);
-- Expiration sweep: `WHERE status = 'ACTIVE' AND expires_at < now()`
CREATE INDEX IF NOT EXISTS reservations_active_expires_idx
  ON reservations (expires_at) WHERE status = 'ACTIVE';

-- orders --------------------------------------------------------------------
-- GET /api/orders (buyer's own orders, newest first), dashboard, invoices
CREATE INDEX IF NOT EXISTS orders_user_created_idx ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
-- GET /api/orders/track/:trackingId
CREATE INDEX IF NOT EXISTS orders_tracking_idx ON orders (tracking_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);

-- order_items ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items (product_id);
-- Seller order feeds: "orders where any item has sellerId = me"
CREATE INDEX IF NOT EXISTS order_items_seller_idx ON order_items (seller_id);

-- carts ---------------------------------------------------------------------
-- carts PK is user_id; cart_items PK is (cart_user_id, product_id) which already
-- covers lookups by cart_user_id - no extra index needed.

-- messages ------------------------------------------------------------------
-- Conversation thread: both directions of a pair, ordered by time
CREATE INDEX IF NOT EXISTS messages_pair_idx ON messages (sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON messages (receiver_id, created_at DESC);
-- Unread badge counts
CREATE INDEX IF NOT EXISTS messages_unread_idx
  ON messages (receiver_id) WHERE read = false;

-- notifications -------------------------------------------------------------
-- GET /api/notifications (newest first) and /api/notifications/archived
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);
-- Unread badges
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON notifications (user_id) WHERE read = false AND archived = false;
