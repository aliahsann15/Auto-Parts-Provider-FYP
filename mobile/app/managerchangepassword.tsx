import React, { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import Header from '@/components/Header';
import Input from '@/components/Input';
import ButtonFilled from '@/components/ButtonFilled';
import { COLORS, icons } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StoreManager, updateStoreManager } from '@/utils/api/store';
import { useAuth } from './context/AuthContext';
import ButtonOutlined from '@/components/ButtonOutlined';

type ParamList = {
  managerchangepassword: { manager: StoreManager };
};

const ManagerChangePasswordScreen = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ParamList, 'managerchangepassword'>>();
  const { token, user } = useAuth();
  const manager = route.params?.manager;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!token || !manager?.id) {
      Alert.alert('Session expired', 'Please sign in again.');
      return;
    }
    const pass = password.trim();
    const confirm = confirmPassword.trim();
    if (!pass || !confirm) {
      Alert.alert('Missing info', 'Enter and confirm the new password.');
      return;
    }
    if (pass !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await updateStoreManager(manager.id, { password: pass }, token);
      Alert.alert('Updated', 'Password updated for this manager.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update password');
    } finally {
      setSaving(false);
    }
  }, [confirmPassword, manager?.id, navigation, password, token]);

  const handleForgot = useCallback(() => {
    // route to email verification flow; prefill owner email if available
    const ownerEmail = user?.email || '';
    navigation.navigate('forgotpasswordemail' as never, ownerEmail ? ({ email: ownerEmail } as never) : undefined);
  }, [navigation, user?.email]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Change Manager Password" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 32 }}>
         
          <Input
            id="newPassword"
            value={password}
            onInputChanged={(_, v) => setPassword(v)}
            placeholder="New password"
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            icon={icons.padlock}
            secureTextEntry
          />
          <Input
            id="confirmPassword"
            value={confirmPassword}
            onInputChanged={(_, v) => setConfirmPassword(v)}
            placeholder="Confirm new password"
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
            icon={icons.padlock}
            secureTextEntry
          />
          <ButtonFilled
            title={saving ? 'Updating...' : 'Update Password'}
            onPress={handleSave}
            disabled={saving}
            style={styles.btn}
          />
          <ButtonOutlined
            title="Forgot password?"
            onPress={handleForgot}
            style={[styles.btn, { backgroundColor: dark ? COLORS.dark3 : COLORS.white }]}
            disabled={saving}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  subtitle: { fontFamily: 'medium', fontSize: 14, marginBottom: 12 },
  btn: { marginTop: 12, borderRadius: 14, height: 52 },
});

export default ManagerChangePasswordScreen;
