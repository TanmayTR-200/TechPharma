interface Company {
  name?: string;
  address?: string;
  gst?: string;
  phone?: string;
  website?: string;
  description?: string;
  logo?: string;
}

export interface User {
  _id: string;
  id?: string; // For backward compatibility
  name: string;
  email: string;
  phone?: string;
  role: 'buyer' | 'supplier' | 'admin';
  company?: Company;
  createdAt: string;
  updatedAt?: string;
}

// Helper function to format user name into first and last name
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.split(' ');
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || ''
  };
}
