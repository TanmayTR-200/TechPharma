// Readable product URLs: /products/<name-slug>-<real-id>
// e.g. /products/hematology-analyzer-prod_m3x2k1
// Legacy plain-id URLs (/products/1, /products/prod_xxx) still resolve.

export function productSlug(name: string): string {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function productHref(product: { name?: string; _id?: string | number }): string {
  const id = String(product?._id ?? '')
  if (!id) return '/products'
  const slug = productSlug(product.name || '')
  return slug ? '/products/' + slug + '-' + id : '/products/' + id
}

// The id is the segment after the final dash (product ids never contain dashes)
export function productIdFromSlug(param: string): string {
  const raw = String(param || '')
  if (!raw.includes('-')) return raw
  return raw.slice(raw.lastIndexOf('-') + 1)
}
