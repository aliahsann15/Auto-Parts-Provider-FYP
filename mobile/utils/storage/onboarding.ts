import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const SELLER_ONBOARDING_KEY = 'hasSeenSellerOnboarding';

// Keep a copy of the seller onboarding flag in both AsyncStorage and SecureStore
// so it survives logout flows and any cache clearing that may wipe one store.
export async function markSellerOnboardingSeen() {
  await Promise.all([
    AsyncStorage.setItem(SELLER_ONBOARDING_KEY, 'true').catch(() => {}),
    SecureStore.setItemAsync(SELLER_ONBOARDING_KEY, 'true').catch(() => {}),
  ]);
}

export async function hasSeenSellerOnboarding(): Promise<boolean> {
  try {
    const [secure, storage] = await Promise.all([
      SecureStore.getItemAsync(SELLER_ONBOARDING_KEY),
      AsyncStorage.getItem(SELLER_ONBOARDING_KEY),
    ]);
    return !!(secure || storage);
  } catch {
    return false;
  }
}
