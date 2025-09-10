import { NextResponse } from 'next/server';
import { User } from '@/types/user';

interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    console.log('Attempting to login user:', { email });

    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend login error:', errorData);
      throw new Error(errorData.message || 'Login failed');
    }

    const { user, token } = await response.json();

    // Set the token in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }

    return NextResponse.json({
      success: true,
      user,
      token
    } as LoginResponse);
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Invalid credentials' 
      } as LoginResponse,
      { status: 401 }
    );
  }
}
