'use strict';

// The single rule for "what is this order item called?".
//
// `order_items.product_name` is a SNAPSHOT of the product name taken at
// checkout, so invoices and order history keep reading correctly after the
// product is renamed or deleted (`product_id` is nulled by ON DELETE SET NULL,
// the name stays). The snapshot is therefore the normal source of truth, but it
// can be missing on legacy rows - notably every row written by the MongoDB
// order migration, which never saw the nested `item.product` snapshot.
//
// Historically each writer/reader invented its own fallback for that case and
// most of them stored or served the literal word 'Product'. That is why a row
// with a missing snapshot surfaced in the UI as an order item literally named
// "Product": a made-up label that looks like real data. This module keeps the
// placeholder out of the system entirely - callers ask for a USABLE name and
// get either the real one or '' (and can then resolve it from `products`, or
// report the item as unavailable).

// Never treated as a product name (compared case-insensitively, trimmed).
const PLACEHOLDER_NAMES = new Set([
  'product',
  'unknown product',
  'unavailable item',
  'n/a',
  'null',
  'undefined',
  '-',
]);

/**
 * Is this a real product name?
 * @param {unknown} value
 * @returns {boolean} true when the value is non-empty text that is not a placeholder
 */
function isUsableName(value) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  if (text === '') return false;
  return !PLACEHOLDER_NAMES.has(text.toLowerCase());
}

/**
 * First usable name among the candidates, best source first
 * (snapshot -> live product name).
 * @param {...unknown} candidates
 * @returns {string} a real product name, or '' when none of the candidates is usable
 */
function pickItemName(...candidates) {
  for (const candidate of candidates) {
    if (isUsableName(candidate)) return String(candidate).trim();
  }
  return '';
}

module.exports = { PLACEHOLDER_NAMES, isUsableName, pickItemName };
