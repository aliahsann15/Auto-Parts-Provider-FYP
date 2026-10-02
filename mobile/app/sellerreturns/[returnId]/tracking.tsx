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
  DeviceEventEmitter,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Header from '@/components/Header';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS } from '@/constants';
import { useAuth } from '@/app/context/AuthContext';
import { updateReturnStatus } from '@/utils/api/returns';

const TrackingScreen = () => {
  const params = useLocalSearchParams<{ returnId?: string }>();
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [trackingId, setTrackingId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!trackingId.trim()) {
      Alert.alert('Tracking ID required', 'Please add a tracking ID before continuing.');
      return;
    }
    if (!token || !params.returnId) {
      return;
    }
    setLoading(true);
    try {
      await updateReturnStatus(params.returnId, {
        status: 'shipped',
        trackingId: trackingId.trim(),
      }, token);
      DeviceEventEmitter.emit('returns:updated');
      DeviceEventEmitter.emit('seller:returns:updated');
      Alert.alert('Saved', 'Tracking information saved.', [
        { text: 'OK', onPress: () => router.push('/sellerreturns') },
      ]);
    } catch (err) {
      Alert.alert('Error', (err as any)?.message || 'Could not save tracking ID.');
    } finally {
      setLoading(false);
    }
  }, [trackingId, token, params.returnId]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.fill}>
        <View style={[styles.headerWrapper, { borderBottomColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]}>
          <Header title="Tracking ID" onBackPress={() => router.back()} />
        </View>
        <View style={styles.form}>
          <Text style={styles.label}>Tracking ID</Text>
          <TextInput
            style={styles.input}
            value={trackingId}
            onChangeText={setTrackingId}
            placeholder="Enter tracking ID"
            placeholderTextColor={COLORS.gray3}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Text style={styles.helper}>Please add tracking ID which will be send to the customer to ship the item back to you.</Text>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>Submit Tracking ID</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'regular',
    marginBottom: 8,
    color: COLORS.black,
  },
  helper: {
    fontSize: 12,
    fontFamily: 'regular',
    color: COLORS.gray3,
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: COLORS.black,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    color: COLORS.white,
    fontFamily: 'bold',
    fontSize: 16,
  },
});

export default TrackingScreen;
