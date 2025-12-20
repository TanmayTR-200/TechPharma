export interface User {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'buyer' | 'supplier';
  phone?: string;
  address?: string;
  company?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserLoginCredentials {
  email: string;
  password: string;
}

export interface UserRegistrationData extends UserLoginCredentials {
  name: string;
  phone?: string;
  address?: string;
  company?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}