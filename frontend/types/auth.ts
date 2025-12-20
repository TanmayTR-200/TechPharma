export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    isVerified: boolean;
  };
  requiresVerification?: boolean;
  redirectTo?: string;
}

export interface OtpResponse {
  success: boolean;
  message: string;
  isVerified?: boolean;
}