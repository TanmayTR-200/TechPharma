import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authorization token is required' 
      }, { status: 401 });
    }

    const { otp } = await request.json();
    if (!otp) {
      return NextResponse.json({ 
        success: false, 
        message: 'OTP code is required'
      }, { status: 400 });
    }

    // Call backend API to verify OTP
    const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ otp })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Verification failed');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('OTP verification error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Verification failed' 
    }, { status: 400 });
  }
}