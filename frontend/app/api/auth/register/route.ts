import { NextResponse } from 'next/server';
import { api, authApi } from '@/lib/api';
import { User } from '@/types/user';

interface RegistrationResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export async function POST(request: Request) {
  try {
    const userData = await request.json();
    
    const formattedUserData = {
      ...userData,
      name: userData.name.trim(),
      company: userData.companyName ? {
        name: userData.companyName.trim()
      } : undefined
    };
    
    console.log('Attempting to register user:', formattedUserData);

    // Call backend API to register user using the typed authApi
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedUserData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Backend registration error:', responseData);
      
      if (response.status === 409 || responseData.message === 'User already exists') {
        return NextResponse.json({
          success: false,
          message: 'This email is already registered. Please login instead.',
          redirectTo: '/auth?mode=login&message=existing_user'
        } as RegistrationResponse);
      }
      
      throw new Error(responseData.message || 'Registration failed');
    }

    const { user, token } = responseData;

    // Set the token in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }

    return NextResponse.json({
      success: true,
      user,
      token
    } as RegistrationResponse);
  } catch (error: any) {
    console.error('Registration error:', error);
    // If user already exists, return 409 Conflict status
    if (error.message === 'User already exists') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'This email is already registered. Please login instead.',
          redirectTo: '/auth?mode=login&message=existing_user'
        } as RegistrationResponse,
        { status: 409 }
      );
    }
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || 'Registration failed' 
      } as RegistrationResponse,
      { status: 500 }
    );
  }
}
