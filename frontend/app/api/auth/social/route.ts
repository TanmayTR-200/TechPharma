import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';

export async function POST(request: Request) {
  try {
    const { provider } = await request.json();
    
    let authProvider;
    if (provider === 'google') {
      authProvider = new GoogleAuthProvider();
      // Add scopes for Google
      authProvider.addScope('email');
      authProvider.addScope('profile');
    } else if (provider === 'facebook') {
      authProvider = new FacebookAuthProvider();
      // Add scopes for Facebook
      authProvider.addScope('email');
      authProvider.addScope('public_profile');
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Start the redirect-based sign in
    await signInWithRedirect(auth, authProvider);
    
    // Get the result of the redirect
    const result = await getRedirectResult(auth);
    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Authentication failed - No result' },
        { status: 400 }
      );
    }
    
    const user = result.user;
    // Get the token
    const token = await user.getIdToken();
    
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.uid,
        email: user.email,
        firstName: user.displayName?.split(' ')[0] || '',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
        phone: user.phoneNumber || '',
        role: 'user',
      },
    });
  } catch (error: any) {
    console.error('Social auth error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}
