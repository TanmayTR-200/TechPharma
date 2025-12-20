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

    // Call backend API to resend OTP
    const response = await fetch('http://localhost:5000/api/auth/resend-otp', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Please wait before requesting another code');
      }
      throw new Error(data.message || 'Failed to resend code');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('OTP resend error:', error);
    const status = error.message.includes('wait') ? 429 : 500;
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to resend code'
    }, { status });
  }
}