-- 001_initial_schema.sql
-- TechPharma - PostgreSQL initial schema (Phase 2).
--
-- Derived from backend/server.js (JSON collections) and backend/src/inventory/*.js
-- (SQLite inventory/orders). Column names are snake_case; the repository layer in
-- backend/src/db/ maps them back to the camelCase document shape the API returns,
-- so no API response changes are required.
--
-- Design rules applied here:
--   * Structured, queried/sorted/validated fields  -> real columns.
--   * Genuinely variable or rarely queried fields  -> JSONB (`metadata`, `company`,
--     `images`, `shipping_address`, cart item snapshot).
--   * JSONB is NOT used to recreate the old JSON-file shape.
--   * Entity ids stay TEXT and keep the original Mongo/JSON `_id` values.
--
-- Legacy collections intentionally NOT turned into tables:
--   * `conversations` - written by nothing but the removed seed endpoint; the chat
--     API derives conversations from `messages`. It is derived data.
--   * `carts.items[].product` - a snapshot of the product at add-time, kept as JSONB
--     (`cart_items.snapshot`) instead of being exploded into columns.

-- ===========================================================================
-- Users / auth
-- ===========================================================================

CREATE TABLE IF NOT EXISTS users (
  id                     TEXT PRIMARY KEY,
  email                  TEXT        NOT NULL,
  password               TEXT        NOT NULL,
  name                   TEXT        NOT NULL,
  role                   TEXT        NOT NULL DEFAULT 'user',
  phone                  TEXT        NOT NULL DEFAULT '',
  state                  TEXT        NOT NULL DEFAULT '',
  -- company: { name, description, website, address, logo } - free-form profile blob
  company                JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ,
  -- Session invalidation: tokens issued before this instant are rejected
  password_changed_at    TIMESTAMPTZ,
  -- Persistent login lockout (survives restarts/deploys)
  failed_attempts        INTEGER     NOT NULL DEFAULT 0,
  locked_until           TIMESTAMPTZ,
  last_failed_at         TIMESTAMPTZ,
  -- Password reset flow
  last_reset_email_at    TIMESTAMPTZ,
  reset_token            TEXT,
  reset_token_expires_at TIMESTAMPTZ
);

-- Password history - replaces user.passwordHistory[] (max 5, oldest pruned)
CREATE TABLE IF NOT EXISTS password_history (
  id            BIGSERIAL   PRIMARY KEY,
  user_id       TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Saved delivery addresses - replaces user.savedAddresses[]
CREATE TABLE IF NOT EXISTS saved_addresses (
  id         TEXT        PRIMARY KEY,
  user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position   BIGSERIAL   NOT NULL,           -- preserves insertion order
  label      TEXT        NOT NULL DEFAULT 'Home',
  name       TEXT        NOT NULL,
  phone      TEXT        NOT NULL DEFAULT '',
  line1      TEXT        NOT NULL,
  city       TEXT        NOT NULL,
  state      TEXT        NOT NULL DEFAULT '',
  pincode    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OTP codes (signup verification, account deletion).
-- Codes belong to emails that may not have a user row yet, hence no FK.
CREATE TABLE IF NOT EXISTS otps (
  id         TEXT        PRIMARY KEY,        -- "<email>__<purpose>" (matches the JSON _id)
  email      TEXT        NOT NULL,
  purpose    TEXT        NOT NULL,
  otp        TEXT        NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================================================
-- Products
-- ===========================================================================

CREATE TABLE IF NOT EXISTS products (
  id              TEXT          PRIMARY KEY,
  -- Seller deleted -> keep the listing, drop the owner link
  -- (the existing delete-account flow does not remove products)
  seller_id       TEXT          REFERENCES users(id) ON DELETE SET NULL,
  name            TEXT          NOT NULL,
  description     TEXT          NOT NULL DEFAULT '',
  price           NUMERIC(14,2) NOT NULL DEFAULT 0,
  category        TEXT          NOT NULL DEFAULT '',
  -- Warehouse / seller location, used by the product list filters
  state           TEXT          NOT NULL DEFAULT '',
  images          JSONB         NOT NULL DEFAULT '[]'::jsonb,
  status          TEXT          NOT NULL DEFAULT 'active',
  version         INTEGER       NOT NULL DEFAULT 0,  -- optimistic locking (PUT /api/products/:id)
  -- Denormalised stock mirror. inventory_stock is the authority for checkout;
  -- these columns keep the fast product-list read path working and are refreshed
  -- from inventory_stock after every stock mutation.
  stock           INTEGER,
  total_stock     INTEGER,
  available_stock INTEGER,
  reserved_stock  INTEGER,
  sold            INTEGER,
  sales_count     INTEGER,
  -- Everything else that varies per category / is rarely queried
  -- (brand, model, condition, specifications, hsn, gst, minOrderQuantity, ...)
  metadata        JSONB         NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ
);

-- ===========================================================================
-- Inventory (ported from backend/src/inventory/store.js)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS inventory_stock (
  product_id      TEXT        PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  total_stock     INTEGER     NOT NULL DEFAULT 0,
  available_stock INTEGER     NOT NULL DEFAULT 0,
  reserved_stock  INTEGER     NOT NULL DEFAULT 0,
  sold            INTEGER     NOT NULL DEFAULT 0,
  sales_count     INTEGER     NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reservations. NOTE: no FK on user_id on purpose - the SQLite implementation has
-- none either, reservations outlive deleted accounts, and the inventory tests use
-- synthetic user ids. product_id DOES get a FK (a reservation is meaningless
-- without its product).
CREATE TABLE IF NOT EXISTS reservations (
  reservation_id  TEXT        PRIMARY KEY,
  product_id      TEXT        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity        INTEGER     NOT NULL,
  user_id         TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'ACTIVE',
  created_at      TIMESTAMPTZ NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT
);

-- ===========================================================================
-- Orders
-- ===========================================================================

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT          PRIMARY KEY,
  -- Buyer deleted -> keep the order for accounting, drop the link
  user_id          TEXT          REFERENCES users(id) ON DELETE SET NULL,
  tracking_id      TEXT,
  order_number     TEXT,
  buyer_name       TEXT          NOT NULL DEFAULT '',
  buyer_email      TEXT          NOT NULL DEFAULT '',
  status           TEXT          NOT NULL DEFAULT 'pending',
  payment_method   TEXT          NOT NULL DEFAULT 'cod',
  total_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
  shipping_address JSONB         NOT NULL DEFAULT '{}'::jsonb,
  archived         BOOLEAN       NOT NULL DEFAULT false,
  shipped_at       TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  -- Idempotent checkout: a repeated key must not create a second order
  idempotency_key  TEXT,
  metadata         JSONB         NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS order_items (
  id           BIGSERIAL     PRIMARY KEY,
  order_id     TEXT          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- Product deleted -> order history keeps the captured name/price
  product_id   TEXT          REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT          NOT NULL DEFAULT '',
  quantity     INTEGER       NOT NULL,
  price        NUMERIC(14,2) NOT NULL DEFAULT 0,
  seller_id    TEXT          REFERENCES users(id) ON DELETE SET NULL
);

-- ===========================================================================
-- Cart
-- ===========================================================================

CREATE TABLE IF NOT EXISTS carts (
  user_id    TEXT          PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  version    INTEGER       NOT NULL DEFAULT 1,
  total      NUMERIC(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- product_id is deliberately not a FK: a cart may briefly reference a product that
-- was just deleted, and the existing API keeps the line until the user removes it.
CREATE TABLE IF NOT EXISTS cart_items (
  cart_user_id TEXT        NOT NULL REFERENCES carts(user_id) ON DELETE CASCADE,
  product_id   TEXT        NOT NULL,
  quantity     INTEGER     NOT NULL,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Product snapshot captured when the item was added (name/price/images/stock)
  snapshot     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (cart_user_id, product_id)
);

-- ===========================================================================
-- Messaging / notifications
-- ===========================================================================

-- No FK to users: conversations must survive account deletion, and existing
-- messages already reference accounts that no longer exist.
CREATE TABLE IF NOT EXISTS messages (
  id               TEXT        PRIMARY KEY,
  sender_id        TEXT        NOT NULL,
  receiver_id      TEXT        NOT NULL,
  content          TEXT        NOT NULL,
  read             BOOLEAN     NOT NULL DEFAULT false,
  server_timestamp BIGINT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT        PRIMARY KEY,
  user_id    TEXT,                            -- NULL = platform-wide notification
  title      TEXT        NOT NULL DEFAULT '',
  message    TEXT        NOT NULL DEFAULT '',
  type       TEXT        NOT NULL DEFAULT 'info',
  read       BOOLEAN     NOT NULL DEFAULT false,
  archived   BOOLEAN     NOT NULL DEFAULT false,
  -- e.g. { orderId, productId, buyerId, senderId, senderName }
  metadata   JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
