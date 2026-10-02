import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, images } from '@/constants';
import { router } from 'expo-router';
import { fetchMyStore } from '@/utils/api/store';
import { useAuth } from './context/AuthContext';
import { markSellerOnboardingSeen } from '@/utils/storage/onboarding';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';

const SellerOnboarding2 = () => {
  const { dark } = useTheme();
  const { token } = useAuth();
  const [pending, setPending] = useState(false);

  const ensureStore = async () => {
    if (!token || pending) return;
    setPending(true);
    try {
      await fetchMyStore(token);
    } catch (err) {
      console.warn('ensureStore onboarding2 failed', err);
    } finally {
      setPending(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        router.replace('/seller');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [])
  );

  return (
    <View style={[styles.area, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.05)']}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <Image source={require('../assets/icons/cart-onboarding.png')} style={styles.illustration} resizeMode="contain" />
        <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.black }]}>Start adding your products</Text>
        <Text style={[styles.subtitle, { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }]}>
          Add your products to showcase them in your store. Highlight featured and sale items to drive more sales.
        </Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={async () => {
            await ensureStore();
            await markSellerOnboardingSeen();
            router.replace('/seller');
          }}
          disabled={pending}
        >
          <Text style={[styles.outlineText, { color: COLORS.primary }]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filledBtn}
          onPress={async () => {
            await ensureStore();
            await markSellerOnboardingSeen();
            router.replace('/addProduct');
          }}
          disabled={pending}
        >
          <Text style={[styles.filledText]}>Add new products</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 30 },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '120%'
  },
  content: { alignItems: 'center', paddingTop: 40 },
  illustration: { width: 80, height: 80, marginBottom: 12 },
  title: { fontSize: 28, fontFamily: 'bold', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, fontFamily: 'regular', textAlign: 'center', lineHeight: 22 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  outlineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: COLORS.primary,
    alignItems: 'center'
  },
  outlineText: { fontFamily: 'semiBold', fontSize: 16 },
  filledBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center'
  },
  filledText: { fontFamily: 'semiBold', fontSize: 16, color: COLORS.white }
});

export default SellerOnboarding2;
