import '@/polyfills/useLatestCallback';
import '@/polyfills/uuidv4';
import useLatestCallbackShim from '@/polyfills/useLatestCallbackShim';

// Force patch any loaded copy of use-latest-callback to our shim (defensive)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('use-latest-callback');
  if (mod) {
    (mod as any).default = useLatestCallbackShim;
    // @ts-ignore ensure CJS consumers get the shim
    mod.exports = useLatestCallbackShim;
  }
} catch {
  // ignore
}
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { FONTS } from '@/constants/fonts';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LogBox } from 'react-native';
import AuthProvider from '@/app/context/AuthContext'; 
import * as ExpoModulesCore from 'expo-modules-core';
import Constants from 'expo-constants';
import { StripeProvider } from '@stripe/stripe-react-native';
import PushNotificationInitializer from '@/components/PushNotificationInitializer';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

//Ignore all log notifications
LogBox.ignoreAllLogs();

export default function RootLayout() {
  const [loaded] = useFonts(FONTS);
  const publishableKey =
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    (Constants.expoConfig?.extra as any)?.stripePublishableKey ||
    '';

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // shim uuidv4 for web builds if missing in expo-modules-core
  if (!(ExpoModulesCore as any).uuidv4 && typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
    (ExpoModulesCore as any).uuidv4 = () => (crypto as any).randomUUID();
  }

  return (
    <StripeProvider publishableKey={publishableKey}>
      <AuthProvider>
        <ThemeProvider>
          <PushNotificationInitializer />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="addnewaddress" />
            <Stack.Screen name="addnewcard" />
            <Stack.Screen name="addpromo" />
            <Stack.Screen name="address" />
            <Stack.Screen name="call" />
            <Stack.Screen name="cancelorder" />
            <Stack.Screen name="cancelorderpaymentmethods" />
            <Stack.Screen name="categories" />
            <Stack.Screen name="categorybmw" />
            <Stack.Screen name="categorybugatti" />
            <Stack.Screen name="categoryhonda" />
            <Stack.Screen name="categorymercedes" />
            <Stack.Screen name="categorytesla" />
            <Stack.Screen name="categorytoyota" />
            <Stack.Screen name="categoryvolvo" />
            <Stack.Screen name="changeemail" />
            <Stack.Screen name="changepassword" />
            <Stack.Screen name="changepin" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="checkout" />
            <Stack.Screen name="checkoutsuccessful" />
            <Stack.Screen name="refundpolicy" />
            <Stack.Screen name="chooseshippingmethods" />
            <Stack.Screen name="createnewpin" />
            <Stack.Screen name="createnewpassword" />
            <Stack.Screen name="customerservice" />
            <Stack.Screen name="editprofile" />
            <Stack.Screen name="enteryourpin" />
            <Stack.Screen name="ereceipt" />
            <Stack.Screen name="fillyourprofile" />
            <Stack.Screen name="fingerprint" />
            <Stack.Screen name="forgotpasswordemail" />
            <Stack.Screen name="forgotpasswordmethods" />
            <Stack.Screen name="forgotpasswordphonenumber" />
            <Stack.Screen name="login" />
            <Stack.Screen name="mostpopularproducts" />
            <Stack.Screen name="topcategories" />
            <Stack.Screen name="topdeals" />
            <Stack.Screen name="mywishlist" />
            <Stack.Screen name="onboarding2" />
            <Stack.Screen name="onboarding3" />
            <Stack.Screen name="onboarding4" />
            <Stack.Screen name="otpverification" />
            <Stack.Screen name="paymentmethods" />
            <Stack.Screen name="productereceipt" />
            <Stack.Screen name="productreviews" />
            <Stack.Screen name="search" />
            <Stack.Screen name="selectshippingaddress" />
            <Stack.Screen name="settingshelpcenter" />
            <Stack.Screen name="settingsinvitefriends" />
            <Stack.Screen name="settingslanguage" />
            <Stack.Screen name="settingsnotifications" />
            <Stack.Screen name="settingspayment" />
            <Stack.Screen name="settingsprivacypolicy" />
            <Stack.Screen name="settingssecurity" />
            <Stack.Screen name="promocodes" />
            <Stack.Screen name="checkoutpayment" />
            <Stack.Screen name="addaccount" />
            <Stack.Screen name="withdrawals" />
            <Stack.Screen name="withdrawalrequested" />
            <Stack.Screen name="withdrawalhistory" />
            <Stack.Screen name="netprofit" />
            <Stack.Screen name="orderinsights" />
            <Stack.Screen name="signup" />
            <Stack.Screen name="sellerOnboarding1" />
            <Stack.Screen name="sellerOnboarding2" />
            <Stack.Screen
              name="seller"
              options={{
                gestureEnabled: false, // prevent swipe/back to buyer stack
              }}
            />
            <Stack.Screen name="sellermanagers" options={{ headerShown: false }} />
            <Stack.Screen name="addmanager" options={{ headerShown: false }} />
            <Stack.Screen name="editmanager" options={{ headerShown: false }} />
            <Stack.Screen name="managerchangepassword" options={{ headerShown: false }} />
            <Stack.Screen name="topupereceipt" />
            <Stack.Screen name="topupewalletamount" />
            <Stack.Screen name="topupewalletmethods" />
            <Stack.Screen name="trackorder" />
            <Stack.Screen name="transactionhistory" />
            <Stack.Screen name="videocall" />
            <Stack.Screen name="cardetails" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </StripeProvider>
  );
}
