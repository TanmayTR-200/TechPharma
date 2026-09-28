-- Repair order item snapshots that are missing a product name.
--
-- order_items.product_name is the snapshot of the product name taken at
-- checkout, so order history and invoices keep reading correctly after the
-- product is renamed or deleted (product_id is nulled by ON DELETE SET NULL).
--
-- Two writers used to store a missing value instead of the real one: the
-- MongoDB order migration read the flat `item.productId`/`item.name` spellings
-- that no write path produces, and the legacy JSON import used the literal word
-- 'Product' as its default. Those rows turned into order items displayed as
-- literally "Product" in the UI.
--
-- The writers are fixed; this repairs the rows they already wrote, but only
-- where the live catalog still knows the name - a snapshot for a deleted
-- product is the only surviving record of that name and must not be touched.
-- Idempotent: it matches nothing once there is nothing left to repair.

UPDATE order_items AS oi
   SET product_name = p.name
  FROM products AS p
 WHERE p.id = oi.product_id
   AND (
     oi.product_name IS NULL
     OR btrim(oi.product_name) = ''
     OR lower(btrim(oi.product_name)) IN (
       'product', 'unknown product', 'unavailable item', 'n/a', 'null', 'undefined', '-'
     )
   );
