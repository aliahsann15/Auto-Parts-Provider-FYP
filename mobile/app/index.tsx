import React, { useEffect } from 'react';
import { Text, ImageBackground, StyleSheet } from 'react-native';
import { COLORS, images } from '../constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './context/AuthContext';
import { hasSeenSellerOnboarding, markSellerOnboardingSeen } from '@/utils/storage/onboarding';

const Onboarding1 = () => {
  const { isHydrating, isLoggedIn, user } = useAuth();

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Wait for auth hydration so we can route based on stored session/role
      if (isHydrating) return;

      let next = 'onboarding2' as any;
      try {
        const seen = await AsyncStorage.getItem('hasSeenOnboarding');
        const seenSeller = await hasSeenSellerOnboarding();
        const role = user?.role?.toLowerCase();
        if (isLoggedIn && role === 'superadmin') {
          next = '/superadmin/orders';
        } else if (isLoggedIn && role === 'seller') {
          if (seenSeller) {
            next = '/seller';
          } else {
            // show seller onboarding once, then persist the flag so future launches skip it
            await markSellerOnboardingSeen();
            next = '/sellerOnboarding1';
          }
        } else if (seen) {
          // user already saw onboarding -> go to app after splash
          next = '(tabs)';
        }
      } catch (e) {
        // ignore and default to onboarding
      }

      // keep showing the splash for everyone, then navigate
      const timeout = setTimeout(() => {
        if (!mounted) return;
        router.replace(next as any);
      }, 2000);

      return () => clearTimeout(timeout);
    })();

    return () => { mounted = false; };
  }, [isHydrating, isLoggedIn, user?.role]); // rerun when auth hydration completes

  return (
    <ImageBackground
      source={images.splashOnboarding}
      style={styles.area}>
      <LinearGradient
        // Background linear gradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.background}>
        <Text style={styles.greetingText}>Welcome to 👋</Text>
        <Text style={styles.logoName}>Auto Parts Providers</Text>
        <Text style={styles.subtitle}>The best auto parts marketplace app of the century for your modification needs!</Text>
      </LinearGradient>
    </ImageBackground>
  )
};

const styles = StyleSheet.create({
  area: {
    flex: 1
  },
  background: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 300,
    paddingHorizontal: 16
  },
  greetingText: {
    fontSize: 40,
    color: COLORS.white,
    fontFamily: 'bold',
    
  },
  logoName: {
    fontSize: 50,
    color: COLORS.white,
    fontFamily: 'extraBold',

  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    marginVertical: 12,
    fontFamily: "semiBold",
    width: '80%'
  }
})

export default Onboarding1;
