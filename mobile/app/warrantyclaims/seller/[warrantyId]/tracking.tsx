import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS } from '@/constants';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { updateWarrantyClaimStatus } from '@/utils/api/warranty';
import Header from '@/components/Header';

const SellerWarrantyTracking = () => {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ warrantyId?: string; mode?: string }>();
  const [trackingId, setTrackingId] = useState('');
  const [processing, setProcessing] = useState(false);
  const status = 'SELLER_SHIPPED';

  const handleSubmit = useCallback(async () => {
    if (!token || !params.warrantyId) return;
    if (!trackingId.trim()) {
      Alert.alert('Missing tracking id', 'Enter seller-to-buyer tracking id.');
      return;
    }
    setProcessing(true);
    try {
      await updateWarrantyClaimStatus(
        params.warrantyId,
        {
          status,
          sellerToBuyerTrackingId: trackingId.trim(),
        },
        token
      );
      Alert.alert('Shipped', 'Claim status updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Failed', err?.message || 'Unable to update tracking.');
    } finally {
      setProcessing(false);
    }
  }, [params.warrantyId, token, trackingId, status]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}> 
      <View style={styles.wrapper}>
        <View style={styles.headerWrapper}>
          <Header title="Ship to buyer" />
        </View>
        <View style={styles.content}>
          <Text style={[styles.subtitle, { color: dark ? COLORS.gray3 : COLORS.black }]}>
            Add the tracking ID that will help the buyer collect the product.
          </Text>
          <TextInput
            style={styles.input}
            value={trackingId}
            onChangeText={setTrackingId}
            placeholder="Seller-to-Buyer Tracking id"
            placeholderTextColor={COLORS.gray3}
          />
          <TouchableOpacity
            style={[styles.submitButton, processing && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>Submit tracking</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  wrapper: { flex: 1 },
  headerWrapper: {
    paddingHorizontal: 16,
  },
  content: { flex: 1, padding: 16 },
  subtitle: { fontSize: 14, fontFamily: 'semiBold', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    fontFamily: 'regular',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: { color: COLORS.white, fontFamily: 'semiBold' },
  disabledButton: { opacity: 0.6 },
});

export default SellerWarrantyTracking;
