export interface Category {
  name: string;       // internal name (e.g., "machinery")
  displayName: string; // display name (e.g., "Machinery")
  count: number;
}

export const PRODUCT_CATEGORIES: Category[] = [
  { name: "electronics", displayName: "Electronics", count: 0 },
  { name: "machinery", displayName: "Machinery", count: 0 },
  { name: "tools", displayName: "Tools", count: 0 },
  { name: "safety", displayName: "Safety Equipment", count: 0 },
  { name: "lighting", displayName: "Lighting", count: 0 }
];

export function getCategoryDisplayName(name: string): string {
  const category = PRODUCT_CATEGORIES.find(c => c.name === name.toLowerCase());
  return category ? category.displayName : name;
}
