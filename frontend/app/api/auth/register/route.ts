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
    
    // Validate required fields
    if (!userData.name || !userData.email || !userData.password) {
      return NextResponse.json({
        success: false,
        message: 'Name, email, and password are required'
      } as RegistrationResponse, { status: 400 });
    }

    const formattedUserData = {
      name: userData.name.trim(),
      email: userData.email.trim(),
      password: userData.password,
      company: {
        name: userData.companyName?.trim()
      }
    };
    
    console.log('Attempting to register user:', formattedUserData);

    // Call backend API to register user using the typed authApi
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedUserData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Backend registration error:', responseData);
      
      if (response.status === 400 && responseData.message === 'User already exists') {
        return NextResponse.json({
          success: false,
          message: 'This email is already registered. Please login instead.',
          redirectTo: '/auth?mode=login&message=existing_user'
        } as RegistrationResponse, { status: 400 });
      }
      
      throw new Error(responseData.message || 'Registration failed');
    }

    const { user, token } = responseData;

    // We'll let the client handle storing the token
    return NextResponse.json({
      success: true,
      user,
      token,
      message: 'Registration successful!'
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
        { status: 400 }
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
