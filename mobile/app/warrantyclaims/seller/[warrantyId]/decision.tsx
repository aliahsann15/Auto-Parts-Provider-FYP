import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS } from '@/constants';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { updateWarrantyClaimStatus } from '@/utils/api/warranty';
import Header from '@/components/Header';

const DECISIONS: Array<{ label: string; value: 'REPLACE' | 'REPAIR' }> = [
  { label: 'Replace', value: 'REPLACE' },
  { label: 'Repair', value: 'REPAIR' },
];

const SellerWarrantyDecision = () => {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ warrantyId?: string }>();
  const [decision, setDecision] = useState<'REPLACE' | 'REPAIR' | null>(null);
  const [trackingId, setTrackingId] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!token || !params.warrantyId) return;
    if (!decision) {
      Alert.alert('Select a decision', 'Please pick Replace or Repair.');
      return;
    }
    if (!trackingId.trim()) {
      Alert.alert('Missing tracking id', 'Enter buyer-to-seller tracking id.');
      return;
    }
    setProcessing(true);
    try {
      await updateWarrantyClaimStatus(
        params.warrantyId,
        {
          status: 'APPROVED',
          sellerDecision: decision,
          buyerToSellerTrackingId: trackingId.trim(),
        },
        token
      );
      Alert.alert('Claim approved', 'Claim status updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Failed', err?.message || 'Unable to approve claim.');
    } finally {
      setProcessing(false);
    }
  }, [decision, params.warrantyId, token, trackingId]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}> 
      <View style={styles.wrapper}>
        <View style={styles.headerWrapper}>
          <Header title="Approval decision" />
        </View>
        <View style={styles.content}>
        <Text style={[styles.subtitle, { color: dark ? COLORS.white : COLORS.black }]}>Choose how you want to handle the product</Text>
        <View style={styles.optionsRow}>
          {DECISIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.decisionOption,
                decision === option.value && { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
              ]}
              onPress={() => setDecision(option.value)}
            >
              <Text
                style={{
                  color: decision === option.value ? COLORS.white : COLORS.black,
                  fontFamily: 'semiBold',
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.fieldLabel, { color: dark ? COLORS.white : COLORS.black }]}>Buyer-to-Seller Tracking ID</Text>
        <TextInput
          style={styles.input}
          value={trackingId}
          onChangeText={setTrackingId}
          placeholder="Enter tracking number"
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
            <Text style={styles.submitText}>Submit approval</Text>
          )}
        </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  wrapper: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: { fontSize: 14, fontFamily: 'semiBold', marginBottom: 16 },
  optionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  decisionOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fieldLabel: { fontSize: 14, fontFamily: 'semiBold', marginBottom: 8 },
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

export default SellerWarrantyDecision;
