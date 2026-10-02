import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { COLORS, icons } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-virtualized-view';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import PaymentMethodItemConnected from '@/components/PaymentMethodItemConnected';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { BankAccount, deleteBankAccount, fetchBankAccounts } from '@/utils/api/user';

type Nav = {
    navigate: (value: string) => void
};

// Settings for payment
const SettingsPayment = () => {
  const { colors, dark } = useTheme();
  const { navigate } = useNavigation<Nav>();
  const navigation = useNavigation<NavigationProp<any>>();
  const { token, user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  /**
   * Render header
   */
  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}>
            <Image
              source={icons.back}
              resizeMode='contain'
              style={[styles.backIcon, {
                tintColor: dark ? COLORS.white : COLORS.greyscale900
              }]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {
            color: dark ? COLORS.white : COLORS.greyscale900
          }]}>Payments</Text>
        </View>
        <View style={{ width: 24, height: 24 }} />
      </View>
    )
  };

  const loadAccounts = useCallback(async () => {
    if (!token || !user?.id) return;
    try {
      setLoading(true);
      const res = await fetchBankAccounts(user.id, token);
      setAccounts(res);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts])
  );

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const mask = (last4?: string) => {
    const l4 = last4 || '';
    return l4 ? `**** **** **** ${l4}` : '****';
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove account', 'Are you sure you want to remove this bank account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (!token || !user?.id) return;
          try {
            const updated = await deleteBankAccount(user.id, id, token);
            setAccounts(updated);
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not remove account');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <ScrollView
          style={styles.settingsContainer}
          showsVerticalScrollIndicator={false}>
          {loading ? <ActivityIndicator style={{ marginVertical: 12 }} color={COLORS.primary} /> : null}
          {!loading && accounts.length === 0 ? (
            <View style={styles.emptyWrapper}>
              <Text style={[styles.emptyText, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>No accounts connected yet.</Text>
            </View>
          ) : null}
          {accounts.map(acc => (
            <PaymentMethodItemConnected
              key={String(acc._id)}
              title={acc.accountTitle || acc.bankName || 'Bank Account'}
              bankName={acc.bankName || acc.accountTitle || 'Bank'}
              last4={acc.last4}
              icon={icons.wallet2}
              tintColor={dark ? COLORS.white : COLORS.primary}
              onPress={() => {}}
              onDelete={() => handleDelete(String(acc._id))}
              isDefault={!!acc.isDefault}
            />
          ))}
        </ScrollView>
        <ButtonFilled
          title="Add New Account"
          onPress={() => navigation.navigate('addaccount')}
        />
      </View>
    </SafeAreaView>
  )
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.greyscale900,
    marginRight: 16
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "bold",
    color: COLORS.greyscale900
  },
  moreIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.greyscale900
  },
  settingsContainer: {
    marginTop: 30
  },
  emptyText: {
    fontFamily: 'medium',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
})

export default SettingsPayment
