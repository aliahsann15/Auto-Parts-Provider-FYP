import React, { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import Header from '@/components/Header';
import Input from '@/components/Input';
import ButtonFilled from '@/components/ButtonFilled';
import { COLORS, icons } from '@/constants';
import { launchImagePicker } from '@/utils/ImagePickerHelper';
import { useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { useAuth } from './context/AuthContext';
import { addStoreManager } from '@/utils/api/store';
import { uploadProfileImage } from '@/utils/api/user';

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const AddManagerScreen = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const { token } = useAuth();
  const [form, setForm] = useState<FormState>({ name: '', email: '', password: '', confirmPassword: '' });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickImage = useCallback(async () => {
    try {
      const uri = await launchImagePicker();
      if (uri) setAvatar(uri);
    } catch {}
  }, []);

  const handleSubmit = useCallback(async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password.trim();
    const confirm = form.confirmPassword.trim();
    if (!token) {
      Alert.alert('Session expired', 'Please sign in again.');
      return;
    }
    if (!name || !email || !password || !confirm) {
      Alert.alert('Missing info', 'Name, email, password, and confirmation are required.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      let profileImage: string | undefined;
      if (avatar) {
        profileImage = await uploadProfileImage(avatar, token, 'store-managers');
      }
      await addStoreManager({ name, email, password, profileImage }, token);
      Alert.alert('Added', 'Store manager added successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not add manager');
    } finally {
      setSaving(false);
    }
  }, [avatar, form, navigation, token]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Add Store Manager" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <View style={[styles.avatarContainer, { backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200 }]}>
              <Image source={avatar ? { uri: avatar } : icons.userDefault2} style={styles.avatar} resizeMode="cover" />
              <TouchableOpacity style={styles.pickImage} onPress={pickImage}>
                <Text style={{ color: COLORS.white, fontFamily: 'bold' }}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ gap: 12 }}>
            <Input
              id="name"
              value={form.name}
              onInputChanged={(_, v) => setForm(prev => ({ ...prev, name: v }))}
              placeholder="Full name"
              placeholderTextColor={dark ? COLORS.gray : COLORS.grayTie}
            />
            <Input
              id="email"
              value={form.email}
              onInputChanged={(_, v) => setForm(prev => ({ ...prev, email: v }))}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={dark ? COLORS.gray : COLORS.grayTie}
            />
            <Input
              id="password"
              value={form.password}
              onInputChanged={(_, v) => setForm(prev => ({ ...prev, password: v }))}
              placeholder="Temporary password"
              secureTextEntry
              placeholderTextColor={dark ? COLORS.gray : COLORS.grayTie}
            />
            <Input
              id="confirmPassword"
              value={form.confirmPassword}
              onInputChanged={(_, v) => setForm(prev => ({ ...prev, confirmPassword: v }))}
              placeholder="Confirm password"
              secureTextEntry
              placeholderTextColor={dark ? COLORS.gray : COLORS.grayTie}
            />
          </View>
        </ScrollView>
        <ButtonFilled
          title={saving ? 'Adding...' : 'Add Manager'}
          onPress={handleSubmit}
          disabled={saving}
          textColor={COLORS.white}
          style={[styles.submitBtn, { backgroundColor: COLORS.black, borderColor: COLORS.black }]}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: "visible"
  },
  avatar: { width: '100%', height: '100%' },
  pickImage: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10000,

  },
  submitBtn: { marginTop: 12, borderRadius: 14, height: 52 , backgroundColor:COLORS.black},
});

export default AddManagerScreen;
