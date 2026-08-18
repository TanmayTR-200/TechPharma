export interface Category {
  name: string;       // internal name (kebab-case)
  displayName: string; // display name
  count: number;
}

export const PRODUCT_CATEGORIES: Category[] = [
  { name: "tech-transfer", displayName: "Tech Transfer", count: 0 },
  { name: "technical-consultant", displayName: "Technical Consultant", count: 0 },
  { name: "job-workers", displayName: "Job Workers", count: 0 },
  { name: "equipment-fabrication", displayName: "Equipment Fabrication", count: 0 },
  { name: "ahu-hvac", displayName: "AHU/HVAC", count: 0 },
  { name: "clean-room-fabricator", displayName: "Clean Room Fabricator", count: 0 },
  { name: "purified-water-system", displayName: "Purified Water System", count: 0 },
  { name: "pest-control-industrial", displayName: "Pest Control (Industrial)", count: 0 },
  { name: "pipeline-fabrication", displayName: "Pipeline Fabrication", count: 0 },
  { name: "electrical", displayName: "Electrical", count: 0 },
  { name: "civil-work", displayName: "Civil Work", count: 0 },
  { name: "utility", displayName: "Utility", count: 0 },
  { name: "etp-equipment", displayName: "ETP Equipment", count: 0 },
  { name: "plant-instruments", displayName: "Plant Instruments", count: 0 },
  { name: "lab-instruments", displayName: "Lab Instruments", count: 0 },
  { name: "approvals-licences", displayName: "Approvals/Licences", count: 0 },
  { name: "qa-qc-ra-consultant", displayName: "QA/QC/RA Consultant", count: 0 },
  { name: "consent-environment-consultant", displayName: "Consent/Environment Consultant", count: 0 },
  { name: "safety-consultant", displayName: "Safety Consultant", count: 0 },
  { name: "manpower-consultant", displayName: "Manpower Consultant", count: 0 },
  { name: "labour-contractors", displayName: "Labour Contractors", count: 0 },
  { name: "it-support", displayName: "IT Support", count: 0 },
  { name: "external-laboratories", displayName: "External Laboratories for Analysis", count: 0 },
  { name: "trainings-external-faculties", displayName: "Trainings - External Faculties", count: 0 },
  { name: "industrial-land", displayName: "Industrial Land", count: 0 },
  { name: "defect-handling", displayName: "Defect Handling", count: 0 },
  { name: "documents-and-updates", displayName: "Documents and Updates", count: 0 },
];

export function getCategoryDisplayName(name: string): string {
  const category = PRODUCT_CATEGORIES.find(c => c.name === name.toLowerCase());
  return category ? category.displayName : name;
}
