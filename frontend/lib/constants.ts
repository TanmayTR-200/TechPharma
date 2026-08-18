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
  { name: "lighting", displayName: "Lighting", count: 0 },
  { name: "chemicals", displayName: "Chemicals", count: 0 },
  { name: "medical", displayName: "Medical Supplies", count: 0 },
  { name: "packaging", displayName: "Packaging", count: 0 },
  { name: "construction", displayName: "Construction", count: 0 },
  { name: "automotive", displayName: "Automotive", count: 0 },
  { name: "textiles", displayName: "Textiles", count: 0 },
  { name: "agriculture", displayName: "Agriculture", count: 0 },
  { name: "industrial-supplies", displayName: "Industrial Supplies", count: 0 },
  { name: "power-energy", displayName: "Power & Energy", count: 0 },
  { name: "lab-equipment", displayName: "Lab Equipment", count: 0 },
];

export function getCategoryDisplayName(name: string): string {
  const category = PRODUCT_CATEGORIES.find(c => c.name === name.toLowerCase());
  return category ? category.displayName : name;
}
