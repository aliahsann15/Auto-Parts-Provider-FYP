import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS } from '@/constants';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { updateWarrantyClaimStatus } from '@/utils/api/warranty';
import { WARRANTY_REJECTION_REASONS } from '@/constants/rejectionReasons';
import ReasonItem from '@/components/ReasonItem';
import Header from '@/components/Header';

const SellerWarrantyReject = () => {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ warrantyId?: string }>();
  const [reason, setReason] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const goBackToClaims = useCallback(() => {
    router.replace('/warrantyclaims/seller');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!token || !params.warrantyId) return;
    if (!reason) {
      Alert.alert('Select a reason', 'Pick a rejection reason before continuing.');
      return;
    }
    setProcessing(true);
    try {
      await updateWarrantyClaimStatus(
        params.warrantyId,
        {
          status: 'REJECTED',
          rejectionReasonCode: reason,
          sellerMessage: message.trim() || undefined,
        },
        token
      );
      Alert.alert('Warranty rejected', 'The buyer has been notified.', [
        { text: 'OK', onPress: goBackToClaims },
      ]);
    } catch (err: any) {
      Alert.alert('Failed', err?.message || 'Unable to reject claim.');
    } finally {
      setProcessing(false);
    }
  }, [message, params.warrantyId, reason, token, goBackToClaims]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <View
          style={[
            styles.headerWrapper,
            { borderBottomColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 },
          ]}
        >
          <Header title="Reject warranty claim" onBackPress={goBackToClaims} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.fieldLabel, { color: dark ? COLORS.white : COLORS.black }]}>
            Select a Reason For Rejection
          </Text>
          {WARRANTY_REJECTION_REASONS.map(item => (
            <ReasonItem
              key={item.key}
              title={item.label}
              checked={reason === item.key}
              onPress={() => setReason(item.key)}
            />
          ))}
          <Text
            style={[
              styles.fieldLabel,
              { color: dark ? COLORS.white : COLORS.black, marginTop: 16 },
            ]}
          >
            Seller Message (Optional)
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Explain why you rejected this claim"
            placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
            style={[
              styles.textArea,
              {
                borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                color: dark ? COLORS.white : COLORS.black,
                marginBottom: 12,
              },
            ]}
            multiline
            numberOfLines={4}
          />
        </ScrollView>
        <View
          style={[
            styles.submitArea,
            { borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: processing ? COLORS.gray : COLORS.black },
            ]}
            onPress={handleSubmit}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>Submit rejection</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  area: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: 'regular',
    textAlignVertical: 'top',
  },
  submitArea: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: COLORS.white,
    fontFamily: 'semiBold',
  },
});

export default SellerWarrantyReject;
