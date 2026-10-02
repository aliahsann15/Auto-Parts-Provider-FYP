import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, Alert, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, Keyboard, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { COLORS, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, router } from 'expo-router';
import Button from '@/components/Button';
import ButtonFilled from '@/components/ButtonFilled';
import { useAuth } from '@/app/context/AuthContext';
import { PakistanBank, fetchPakistaniBanks } from '@/utils/pkBanks';
import { addBankAccount } from '@/utils/api/user';
import { requestWithdrawal } from '@/utils/api/withdrawals';
import { saveReturnBankDetails } from '@/utils/api/returns';
import Input from '@/components/Input';

const isPkIban = (val: string) => /^PK\d{2}[A-Z0-9]{20}$/i.test(val);
const isAccountNumber = (val: string) => /^\d{8,24}$/.test(val);

const AddAccountScreen = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation();
const params = useLocalSearchParams<{ redirectTo?: string; withdrawAmount?: string; withdrawCurrency?: string; returnId?: string }>();
const { token, user } = useAuth();
const returnId = typeof params?.returnId === 'string' ? params.returnId : undefined;

  const [banks, setBanks] = useState<PakistanBank[]>([]);
  const [bankModal, setBankModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<PakistanBank | null>(null);
  const [search, setSearch] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [accountTitle, setAccountTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPakistaniBanks().then(setBanks).catch(() => setBanks([]));
  }, []);

  const filteredBanks = banks.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    if (!token || !user?.id) {
      Alert.alert('Login required', 'Please sign in to add a bank account.');
      return;
    }
    if (!selectedBank) {
      Alert.alert('Bank required', 'Please choose a bank.');
      return;
    }
    if (!accountTitle.trim()) {
      Alert.alert('Account title required', 'Please enter an account title.');
      return;
    }
    const trimmedNumber = accountNumber.replace(/\D+/g, '');
    if (!trimmedNumber) {
      Alert.alert('Account number required', 'Enter an account number (digits only).');
      return;
    }
    const accountIsNumber = isAccountNumber(trimmedNumber);
    if (!accountIsNumber) {
      Alert.alert('Invalid account number', 'Enter a valid account number (8-24 digits).');
      return;
    }
    if (branchCode && !/^[0-9]{4,6}$/.test(branchCode)) {
      Alert.alert('Branch code', 'Branch code must be 4-6 digits.');
      return;
    }

    try {
      setSaving(true);
      await addBankAccount(user.id, {
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
        accountNumber: trimmedNumber,
        branchCode: branchCode.trim(),
        accountTitle: accountTitle.trim(),
        isDefault,
      }, token);
      if (returnId && token) {
        try {
          await saveReturnBankDetails(returnId, {
            bankName: selectedBank.name,
            accountTitle: accountTitle.trim(),
            accountNumber: trimmedNumber,
          }, token);
        } catch (err: any) {
          Alert.alert(
            'Return bank details',
            err?.message || 'Could not save these bank details for your return request. Please try again.'
          );
        }
      }
      const redirect = params?.redirectTo ? String(params.redirectTo) : null;

      // If we arrived here from withdrawal flow with amount, trigger withdrawal then redirect to success
      if (params?.withdrawAmount) {
        const amountNum = Number(params.withdrawAmount);
        if (!isNaN(amountNum) && amountNum > 0) {
          try {
            await requestWithdrawal(token || '', amountNum, params.withdrawCurrency || 'PKR');
          } catch (err: any) {
            Alert.alert('Withdrawal', err?.message || 'Could not request withdrawal');
          }
        }
      }

      const successMessage = returnId
        ? 'Bank details saved for your return request.'
        : 'Bank account added.'
      const handleRedirect = () => {
        if (redirect) {
          router.push(redirect as never);
          return;
        }
        navigation.goBack();
      };
      Alert.alert('Saved', successMessage, [{ text: 'OK', onPress: handleRedirect }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Header title="Add Account" />
            {returnId ? (
              <View
                style={[
                  styles.infoBox,
                  {
                    backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.infoTitle,
                    { color: dark ? COLORS.white : COLORS.greyscale900 },
                  ]}
                >
                  Bank details for refund
                </Text>
                <Text
                  style={[
                    styles.infoText,
                    { color: dark ? COLORS.gray3 : COLORS.greyscale600 },
                  ]}
                >
                  We will use these details to refund your return request #{returnId.slice(-6).toUpperCase()}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={1}
              onPress={Keyboard.dismiss}
              style={[
                styles.defaultRow,
                {
                  borderColor: dark ? COLORS.grayscale400 : COLORS.greyscale300,
                  backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200,
                },
              ]}
            >
              <Text style={[styles.defaultLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Set as default</Text>
              <Switch
                value={isDefault}
                onValueChange={setIsDefault}
                thumbColor={isDefault ? COLORS.white : COLORS.white}
                trackColor={{ false: COLORS.white, true: COLORS.primary }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setBankModal(true)}
              style={[
                styles.bankSelector,
                {
                  borderColor: dark ? COLORS.grayscale400 : COLORS.greyscale300,
                  backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200,
                },
              ]}
            >
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: selectedBank ? (dark ? COLORS.white : COLORS.greyscale900) : COLORS.greyscale600,
                    fontFamily: 'regular',
                  },
                ]}
              >
                {selectedBank ? `${selectedBank.name} (${selectedBank.code})` : 'Choose bank'}
              </Text>
            </TouchableOpacity>

            <View style={styles.inputWrapper}>
              <Input
                id="accountTitle"
                onInputChanged={(_id, text) => setAccountTitle(text)}
                value={accountTitle}
                placeholder="Account title"
                placeholderTextColor={COLORS.greyscale600}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Input
                id="accountNumber"
                onInputChanged={(_id, text) => setAccountNumber(text.replace(/\D+/g, ''))}
                value={accountNumber}
                placeholder="Account number"
                placeholderTextColor={COLORS.greyscale600}
                autoCapitalize="none"
                keyboardType="number-pad"
                maxLength={24}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Input
                id="branchCode"
                onInputChanged={(_id, text) => setBranchCode(text.replace(/[^0-9]/g, ''))}
                value={branchCode}
                placeholder="Branch code (optional)"
                placeholderTextColor={COLORS.greyscale600}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            {/* default toggle only at top */}
          </View>

          <View style={[styles.bottomContainer, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
            <View style={styles.bottomButtons}>
              <Button
                title="Cancel"
                style={styles.cancelBtn}
                textColor={COLORS.greyscale900}
                onPress={() => navigation.goBack()}
              />
              <ButtonFilled
                title={saving ? 'Saving...' : 'Save Account'}
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
              />
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <Modal visible={bankModal} animationType="slide" transparent onRequestClose={() => setBankModal(false)}>
        <TouchableWithoutFeedback onPress={() => setBankModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
                style={[styles.modalContent, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}
              >
                <Text style={[styles.modalTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Select Bank</Text>
                <TextInput
                  placeholder="Search bank"
                  placeholderTextColor={COLORS.greyscale500}
                  value={search}
                  onChangeText={setSearch}
                  style={[styles.searchInput, { color: dark ? COLORS.white : COLORS.greyscale900, borderColor: dark ? COLORS.grayscale400 : COLORS.grayscale200 }]}
                />
                <FlatList
                  data={filteredBanks}
                  keyExtractor={(item) => item.code}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.bankRow}
                      onPress={() => {
                        setSelectedBank(item);
                        setBankModal(false);
                      }}
                    >
                      <Text style={[styles.bankName, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{item.name}</Text>
                      <Text style={[styles.bankCode, { color: dark ? COLORS.greyscale300 : COLORS.greyscale600 }]}>{item.code}</Text>
                    </TouchableOpacity>
                  )}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 0 }}
                />
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  infoBox: {
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontFamily: 'semiBold',
    fontSize: 13,
    marginBottom: 4,
  },
  infoText: {
    fontFamily: 'regular',
    fontSize: 12,
  },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  selector: { paddingVertical: 6 },
  selectorText: { fontFamily: 'semiBold', fontSize: 15 },
  inputWrapper: { marginTop: 4, marginBottom: 12 },
  input: { fontSize: 15, paddingVertical: 6 },
  bankSelector: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  defaultRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  defaultLabel: { fontFamily: 'semiBold', fontSize: 15 },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    width: SIZES.width,
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  bottomButtons: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  cancelBtn: {
    flex: 1,
    height: 54,
    borderRadius: 28,
    backgroundColor: COLORS.tansparentPrimary,
    borderColor: COLORS.tansparentPrimary,
  },
  saveBtn: {
    flex: 1,
    height: 54,
    borderRadius: 28,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: 0, margin: 0 },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    alignSelf: 'stretch',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    marginBottom: 0,
  },
  modalTitle: { fontFamily: 'bold', fontSize: 16, marginBottom: 10 },
  searchInput: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10, fontFamily: 'medium' },
  bankRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.grayscale200 },
  bankName: { fontFamily: 'semiBold', fontSize: 14 },
  bankCode: { fontFamily: 'regular', fontSize: 12, marginTop: 2 },
  closeBtn: { marginTop: 10, height: 50, borderRadius: 14, backgroundColor: COLORS.tansparentPrimary, borderColor: COLORS.tansparentPrimary },
  // defaultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 12 },
  // defaultLabel: { fontFamily: 'semiBold', fontSize: 15 },
});

export default AddAccountScreen;
