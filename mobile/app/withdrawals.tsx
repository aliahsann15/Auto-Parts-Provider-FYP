import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { COLORS, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { NavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/app/context/AuthContext';
import { fetchWithdrawalSummary, requestWithdrawal } from '@/utils/api/withdrawals';
import { fetchBankAccounts } from '@/utils/api/user';

const WithdrawalsScreen = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const { token, user } = useAuth();

  const [balance, setBalance] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [returnDebt, setReturnDebt] = useState(0);
  const [availableForWithdrawal, setAvailableForWithdrawal] = useState(0);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const summary = await fetchWithdrawalSummary(token);
      const pendingSum = (summary as any).pendingAmount ?? 0;
      setPendingAmount(pendingSum);
      const storeBalance = summary.storeBalance ?? summary.availableBalance ?? 0;
      const available = summary.withdrawableBalance ?? Math.max(0, summary.availableBalance ?? 0);
      setBalance(storeBalance);
      setAvailableForWithdrawal(available);
      setThreshold(summary.threshold ?? 0);
      setReturnDebt(summary.returnDebt ?? 0);
      if (user?.id) {
        const accounts = await fetchBankAccounts(user.id, token);
        setHasBankAccount((accounts || []).length > 0);
      } else {
        setHasBankAccount(false);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    loadData();
  }, [token, loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const formatBalanceText = (value: number) => {
    if (value > 0) return `PKR ${value.toLocaleString()}`;
    if (value < 0) return `-PKR ${Math.abs(value).toLocaleString()}`;
    return 'PKR 0';
  };

  const handleRequest = async (): Promise<void> => {
    if (!token) {
      Alert.alert('Login required', 'Please sign in to request a withdrawal.');
      return;
    }
    if (availableForWithdrawal <= 0) {
      Alert.alert('Insufficient balance', 'Balance cannot be withdrawn until it is equal to or more than PKR 5000.');
      return;
    }
    if (availableForWithdrawal < threshold) {
      Alert.alert('Below threshold', `Balance cannot be withdrawn until it is equal to or more than PKR ${threshold}.`);
      return;
    }
    if (!hasBankAccount) {
      // re-check bank accounts before redirecting
      if (user?.id) {
        try {
          const accounts = await fetchBankAccounts(user.id, token);
          const hasAny = (accounts || []).length > 0;
          setHasBankAccount(hasAny);
          if (hasAny) {
            return handleRequest(); // retry now that account exists
          }
        } catch {
          // ignore and continue redirect
        }
      }
      navigation.navigate('addaccount', { redirectTo: 'withdrawalrequested', withdrawAmount: String(balance), withdrawCurrency: 'PKR' } as any);
      return;
    }
    try {
      setLoadingRequest(true);
      await requestWithdrawal(token, availableForWithdrawal, 'PKR');
      navigation.navigate('withdrawalrequested');
      loadData();
    } catch (err: any) {
      Alert.alert('Request failed', err?.message || 'Could not request withdrawal');
    } finally {
      setLoadingRequest(false);
    }
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          title="Withdrawals"
          onBackPress={() => {
            if ((navigation as any)?.canGoBack?.()) {
              navigation.goBack();
            } else {
              (navigation as any).navigate('seller', { screen: 'more' });
            }
          }}
        />

        <View style={[styles.card, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
          <Text style={[styles.label, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Available Balance</Text>
          <Text style={[styles.balance, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            {formatBalanceText(balance)}
          </Text>
          {returnDebt > 0 ? (
            <Text style={styles.deductionNotice}>
              You owe PKR {returnDebt.toLocaleString()} due to return deductions. Please settle this amount before adding balance.
            </Text>
          ) : null}
          <View style={styles.thresholdRow}>
            <Text style={[styles.threshold, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
              Withdrawal threshold
            </Text>
            <Text style={[styles.thresholdValue, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
              {threshold === 0
                ? 'PKR 0'
                : availableForWithdrawal >= threshold
                ? `PKR ${threshold.toLocaleString()}+`
                : `PKR ${Math.min(availableForWithdrawal, threshold).toLocaleString()} / PKR ${threshold.toLocaleString()}`}
            </Text>
          </View>
          <View style={[styles.progressTrack, { borderColor: dark ? COLORS.grayscale400 : COLORS.greyscale300 }]}>
            <View
              style={[
                styles.progressFill,
                {
              width: `${Math.min(1, threshold ? availableForWithdrawal / threshold : 0) * 100}%`,
                  backgroundColor: COLORS.black,
                },
              ]}
            />
          </View>
          <TouchableOpacity
            style={[styles.withdrawBtn, { backgroundColor: COLORS.primary }]}
            onPress={handleRequest}
            disabled={loadingRequest}
          >
            <Text style={{ color: COLORS.white, fontFamily: 'bold', fontSize: 16 }}>
              {loadingRequest ? 'Requesting...' : 'Request Withdrawal'}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator style={{ marginTop: 16 }} color={COLORS.primary} /> : null}
      </View>
      <View style={styles.bottomButton}>
        <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('withdrawalhistory')}>
          <Text style={styles.historyBtnText}>See Withdrawal History</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    marginBottom: 12,
  },
  label: { fontFamily: 'regular', fontSize: 13 },
  balance: { fontFamily: 'bold', fontSize: 24, marginTop: 6 },
  thresholdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  threshold: { fontFamily: 'regular', fontSize: 13 },
  thresholdValue: { fontFamily: 'semiBold', fontSize: 13 },
  progressTrack: {
    height: 10,
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
  },
  pendingNote: { fontFamily: 'medium', fontSize: 12, marginTop: 8 },
  withdrawBtn: {
    marginTop: 14,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeHistory: { fontFamily: 'medium', fontSize: 14, textDecorationLine: 'underline', marginTop: 4 },
  bottomButton: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  historyBtn: {
    width: SIZES.width - 32,
    backgroundColor: COLORS.primary,
    borderRadius: 32,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnText: { color: COLORS.white, fontFamily: 'bold', fontSize: 16 },
  deductionNotice: {
    fontSize: 13,
    fontFamily: 'regular',
    color: COLORS.red,
    marginVertical: 8,
  },
});

export default WithdrawalsScreen;
