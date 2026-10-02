import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { updateReturnStatus } from '@/utils/api/returns';
import { COLORS } from '@/constants';
import Header from '@/components/Header';
import ReasonItem from '@/components/ReasonItem';
import { SELLER_REJECTION_REASONS } from '@/constants/rejectionReasons';

const RejectReturnScreen = () => {
  const { colors, dark } = useTheme();
  const params = useLocalSearchParams<{ returnId?: string }>();
  const { token } = useAuth();
  const [selectedReason, setSelectedReason] = useState(SELLER_REJECTION_REASONS[0]?.key || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (SELLER_REJECTION_REASONS.length && !selectedReason) {
      setSelectedReason(SELLER_REJECTION_REASONS[0].key);
    }
  }, [selectedReason]);

  const handleSubmit = async () => {
    if (!token || !params.returnId) return;
    if (!selectedReason) {
      Alert.alert('Reason required', 'Please select a reason for rejecting this return.');
      return;
    }
    setSubmitting(true);
    try {
      await updateReturnStatus(
        params.returnId,
        {
          status: 'rejected',
          sellerRejectionReason: selectedReason,
          sellerRejectionMessage: message.trim() || undefined,
        },
        token
      );
      DeviceEventEmitter.emit('seller:returns:updated');
      Alert.alert('Return rejected', 'The return request has been rejected.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Action failed', err?.message || 'Could not reject return');
    } finally {
      setSubmitting(false);
    }
  };

  if (!params.returnId) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Invalid return request.</Text>
      </View>
    );
  }

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
          <Header title="Reject return" onBackPress={() => router.back()} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.fieldLabel, { color: dark ? COLORS.white : COLORS.black }]}>
            Select a Reason For Rejection
          </Text>
          {SELLER_REJECTION_REASONS.map(reason => (
            <ReasonItem
              key={reason.key}
              title={reason.label}
              checked={selectedReason === reason.key}
              onPress={() => setSelectedReason(reason.key)}
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
            placeholder="Add a short message for the buyer"
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
              { backgroundColor: submitting ? COLORS.gray : COLORS.red },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>Reject return</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    borderColor: COLORS.grayscale200,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: COLORS.white,
    fontFamily: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RejectReturnScreen;
