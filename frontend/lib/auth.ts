import { jwtDecode, JwtPayload } from 'jwt-decode';

interface UserPayload extends JwtPayload {
  user: {
    id: string;
    name: string;
    email: string;
    company?: {
      name: string;
      description?: string;
      website?: string;
      address?: string;
      logo?: string;
    };
  };
}

interface Session {
  user: UserPayload['user'];
  token: string;
}

export async function getSession(): Promise<Session | null> {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return null;
  }

  try {
    const decoded = jwtDecode<UserPayload>(token);
    return {
      user: decoded.user,
      token
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}