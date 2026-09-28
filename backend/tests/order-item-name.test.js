/**
 * Order item name resolution - the rule behind "what is this order line
 * called?" (src/db/order-item-name.js).
 *
 * Regression guard: order_items.product_name is the product name snapshot taken
 * at checkout, but legacy writers stored nothing (MongoDB order migration) or
 * the literal word 'Product' (JSON import) when they could not find it, and the
 * API served that value straight to the orders page - which displayed an order
 * item literally named "Product" instead of the real product name. A placeholder
 * must never be stored, never be preferred over a real name, and never be
 * returned when the caller can still resolve the live product.
 */

const { isUsableName, pickItemName, PLACEHOLDER_NAMES } = require('../src/db/order-item-name');

describe('isUsableName', () => {
  test('accepts real product names', () => {
    expect(isUsableName('Hematology Analyzer')).toBe(true);
    expect(isUsableName('Voltage Relay')).toBe(true);
    expect(isUsableName('  Product XYZ  ')).toBe(true); // only an exact placeholder is rejected
  });

  test('rejects missing or blank values', () => {
    expect(isUsableName('')).toBe(false);
    expect(isUsableName('   ')).toBe(false);
    expect(isUsableName(null)).toBe(false);
    expect(isUsableName(undefined)).toBe(false);
  });

  test('rejects the placeholder spellings the legacy writers used', () => {
    expect(isUsableName('Product')).toBe(false);
    expect(isUsableName('product')).toBe(false);
    expect(isUsableName('  PRODUCT  ')).toBe(false);
    expect(isUsableName('Unknown Product')).toBe(false);
    expect(isUsableName('Unavailable item')).toBe(false);
    expect(isUsableName('n/a')).toBe(false);
    expect(isUsableName('undefined')).toBe(false);
    expect(isUsableName('-')).toBe(false);
  });

  test('the placeholder list itself can never contain a real product name', () => {
    for (const placeholder of PLACEHOLDER_NAMES) {
      expect(isUsableName(placeholder)).toBe(false);
      expect(isUsableName(placeholder.toUpperCase())).toBe(false);
    }
  });
});

describe('pickItemName', () => {
  test('prefers the stored snapshot over the live catalog name', () => {
    // A renamed product must keep reading as it was sold.
    expect(pickItemName('Old Analyzer Name', 'Brand New Analyzer')).toBe('Old Analyzer Name');
  });

  test('falls back to the live catalog name when the snapshot is empty', () => {
    expect(pickItemName('', 'Hematology Analyzer')).toBe('Hematology Analyzer');
    expect(pickItemName(null, 'Hematology Analyzer')).toBe('Hematology Analyzer');
    expect(pickItemName(undefined, 'Hematology Analyzer')).toBe('Hematology Analyzer');
  });

  test('skips a placeholder snapshot instead of showing it as the item name', () => {
    expect(pickItemName('Product', 'Voltage Relay')).toBe('Voltage Relay');
    expect(pickItemName('   ', null, 'Voltage Relay')).toBe('Voltage Relay');
  });

  test('returns an empty string (never a placeholder) when nothing is usable', () => {
    expect(pickItemName()).toBe('');
    expect(pickItemName(null, undefined, '')).toBe('');
    expect(pickItemName('Product', '')).toBe('');
  });

  test('trims the winning candidate', () => {
    expect(pickItemName('  Voltage Relay  ')).toBe('Voltage Relay');
    expect(pickItemName('Product', '  Voltage Relay ')).toBe('Voltage Relay');
  });
});
