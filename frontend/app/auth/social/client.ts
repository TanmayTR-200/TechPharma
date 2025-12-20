import { auth } from '@/lib/firebase';
import type { AuthError, AuthProvider } from '@firebase/auth-types';
const {
  signInWithPopup: signInWithPopupFirebase,
  signInWithRedirect: signInWithRedirectFirebase,
  getRedirectResult: getRedirectResultFirebase,
  GoogleAuthProvider: GoogleAuthProviderFirebase,
  FacebookAuthProvider: FacebookAuthProviderFirebase,
} = require('firebase/auth');

export async function handleSocialAuth(provider: 'google' | 'facebook') {
  try {
    let authProvider;
    if (provider === 'google') {
      authProvider = new GoogleAuthProviderFirebase();
      authProvider.addScope('email');
      authProvider.addScope('profile');
    } else if (provider === 'facebook') {
      authProvider = new FacebookAuthProviderFirebase();
      authProvider.addScope('email');
      authProvider.addScope('public_profile');
    } else {
      throw new Error('Invalid provider');
    }

    // Try popup first
    try {
      const result = await signInWithPopupFirebase(auth, authProvider);
      return handleAuthResult(result);
    } catch (popupError) {
      console.log('Popup failed, trying redirect...', popupError);
      // If popup fails, try redirect
      await signInWithRedirectFirebase(auth, authProvider);
    }
  } catch (error: any) {
    console.error('Social auth error:', error);
    throw error;
  }
}

export async function handleRedirectResult() {
  try {
    const result = await getRedirectResultFirebase(auth);
    if (!result) {
      return null;
    }
    return handleAuthResult(result);
  } catch (error) {
    console.error('Redirect result error:', error);
    throw error;
  }
}

function handleAuthResult(result: any) {
  const user = result.user;
  return {
    success: true,
    user: {
      id: user.uid,
      email: user.email,
      firstName: user.displayName?.split(' ')[0] || '',
      lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
      phone: user.phoneNumber || '',
      role: 'user',
    }
  };
}