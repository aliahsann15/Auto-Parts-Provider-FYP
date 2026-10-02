import { GoogleSignin, statusCodes, User as GoogleUser } from '@react-native-google-signin/google-signin'
import Constants from 'expo-constants'
import appConfig from '../../app.json'

type GoogleIds = {
  webClientId?: string
  iosClientId?: string
  androidClientId?: string
}

let configured = false

const getClientIds = (): GoogleIds => {
  const extra = (Constants.expoConfig?.extra || {}) as any
  const appExtra = ((appConfig as any)?.expo?.extra || {}) as any
  const legacyExtra =
    (Constants as any)?.manifest?.extra ||
    (Constants as any)?.manifest2?.extra ||
    {}
  return {
    webClientId:
      "610728595563-o96shqongedshofnkifg3ns15d27fmv1.apps.googleusercontent.com",
    iosClientId:
     "610728595563-b71r4oiv5rm1v9arf9drau4tst58t0r6.apps.googleusercontent.com",
    androidClientId:
      "610728595563-fr7n7o0mn5aihlg9fogjdakosrk28pt2.apps.googleusercontent.com"
  }
}

const ensureConfigured = () => {
  if (configured) return
  const ids = getClientIds()
  if (!ids.webClientId) {
    console.warn('Google OAuth client ID not configured. Checked .env and app.json extras.')
    throw new Error('Google OAuth client ID not configured (webClientId missing). Check .env EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID or app.json extra.googleWebClientId.')
  }
  GoogleSignin.configure({
    webClientId: "610728595563-o96shqongedshofnkifg3ns15d27fmv1.apps.googleusercontent.com",
    iosClientId: "610728595563-b71r4oiv5rm1v9arf9drau4tst58t0r6.apps.googleusercontent.com",
    offlineAccess: false,
    forceCodeForRefreshToken: false,
    scopes: ['profile', 'email'],
  })
  configured = true
}

export async function signInWithGoogle(): Promise<{ idToken: string; user: GoogleUser }> {
  ensureConfigured()
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
  const result = await GoogleSignin.signIn()
  const authResult = result as any
  const tokens = await GoogleSignin.getTokens()
  const idToken = authResult?.idToken || tokens?.idToken
  if (!idToken) {
    throw new Error('No idToken returned from Google')
  }
  const user = (authResult?.user || authResult?.data?.user || authResult) as GoogleUser
  return { idToken, user }
}

export async function signOutGoogle() {
  try {
    await GoogleSignin.signOut()
  } catch {
    // ignore
  }
}

export function getGoogleClientIds() {
  return getClientIds()
}
