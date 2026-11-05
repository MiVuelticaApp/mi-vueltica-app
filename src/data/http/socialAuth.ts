import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { SignInCancelledError } from '../api';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from './config';

export interface AppleResult {
  identityToken: string;
  authorizationCode: string | null;
  firstName?: string;
  lastName?: string;
}

/** Native Sign in with Apple (iOS only). Name is only delivered the first time the user authorises the app. */
export async function appleSignIn(): Promise<AppleResult> {
  if (Platform.OS !== 'ios') throw new Error('apple-unavailable');
  try {
    const c = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!c.identityToken) throw new Error('apple-no-token');
    return {
      identityToken: c.identityToken,
      authorizationCode: c.authorizationCode,
      firstName: c.fullName?.givenName ?? undefined,
      lastName: c.fullName?.familyName ?? undefined,
    };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new SignInCancelledError();
    throw e;
  }
}

/** Fresh Apple authorization code, needed by `POST /me` to revoke the Apple token when the account is deleted. */
export async function appleAuthorizationCode(): Promise<string | undefined> {
  try {
    return (await appleSignIn()).authorizationCode ?? undefined;
  } catch (e) {
    if (e instanceof SignInCancelledError) throw e;
    return undefined;
  }
}

type GoogleModule = typeof import('@react-native-google-signin/google-signin');
let google: GoogleModule | null = null;

/** Loaded lazily: the module needs a development build (it does not exist in Expo Go or on web). */
function googleModule(): GoogleModule {
  if (Platform.OS === 'web') throw new Error('google-unavailable');
  if (!google) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    google = require('@react-native-google-signin/google-signin') as GoogleModule;
    google.GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
  }
  return google;
}

/** Google id token (what `POST /auth/google` verifies). */
export async function googleSignIn(): Promise<string> {
  const { GoogleSignin, isSuccessResponse } = googleModule();
  await GoogleSignin.hasPlayServices();
  const res = await GoogleSignin.signIn();
  if (!isSuccessResponse(res)) throw new SignInCancelledError();
  if (!res.data.idToken) throw new Error('google-no-token');
  return res.data.idToken;
}

export async function googleSignOut(): Promise<void> {
  try {
    await googleModule().GoogleSignin.signOut();
  } catch {
    /* not signed in with Google, or unavailable */
  }
}
