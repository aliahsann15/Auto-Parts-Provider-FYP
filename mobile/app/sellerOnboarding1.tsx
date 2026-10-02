import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, images } from '@/constants';
import { router } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { fetchMyStore } from '@/utils/api/store';
import { markSellerOnboardingSeen } from '@/utils/storage/onboarding';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';

const SellerOnboarding1 = () => {
  const { dark } = useTheme();
  const { token } = useAuth();
  const [pending, setPending] = useState(false);

  const ensureStore = async () => {
    if (!token || pending) return;
    setPending(true);
    try {
      await fetchMyStore(token);
    } catch (err) {
      console.warn('ensureStore onboarding1 failed', err);
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
        <Image source={require('../assets/icons/store-onboarding.png')} style={styles.illustration} resizeMode="contain" />
        <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.black }]}>Edit your store</Text>
        <Text style={[styles.subtitle, { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }]}>
          Edit your store to add your store logo, store cover, and design your store by showing featured products and banners.
        </Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={async () => {
            await ensureStore();
            await markSellerOnboardingSeen();
            router.replace('/sellerOnboarding2');
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
            router.replace('/sellereditstore');
          }}
          disabled={pending}
        >
          <Text style={[styles.filledText]}>Edit your store</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20, paddingHorizontal: 16 },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%'
  },
  content: { alignItems: 'center', paddingTop: 40 },
  illustration: { width: 80, height: 80, marginBottom: 12 },
  illustrationLogo: { width: 200, height: 200, marginBottom: 10 },
  title: { fontSize: 28, fontFamily: 'bold', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 16, fontFamily: 'regular', textAlign: 'center', lineHeight: 22 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 40, width: "95%", marginLeft: "auto", marginRight: "auto" },
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

export default SellerOnboarding1;
