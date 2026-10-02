import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import Header from '@/components/Header';
import Input from '@/components/Input';
import ButtonFilled from '@/components/ButtonFilled';
import { COLORS, icons } from '@/constants';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from './context/AuthContext';
import { listStoreManagers, updateStoreManager, StoreManager } from '@/utils/api/store';
import { uploadProfileImage } from '@/utils/api/user';
import { launchImagePicker } from '@/utils/ImagePickerHelper';
import { toAbsoluteImageUri } from '@/utils/images';

type ParamList = {
  editmanager: { manager?: string };
};

const EditManagerScreen = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'editmanager'>>();
  const { token } = useAuth();
  const passedManager = React.useMemo<StoreManager | undefined>(() => {
    if (!route.params?.manager) return undefined;
    try {
      return JSON.parse(route.params.manager) as StoreManager;
    } catch {
      return undefined;
    }
  }, [route.params?.manager]);

  const normalizePreview = (value?: string | null) => toAbsoluteImageUri(value) || null;
  const [manager, setManager] = useState<StoreManager | null>(
    passedManager
      ? { ...passedManager, profileImage: normalizePreview(passedManager.profileImage) || undefined }
      : null
  );
  const [form, setForm] = useState<{ name: string; email: string }>({ name: passedManager?.name || '', email: passedManager?.email || '' });
  const [avatar, setAvatar] = useState<string | null>(normalizePreview(passedManager?.profileImage));
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadLatest = useCallback(async () => {
    if (!token || !passedManager?.id) return;
    setLoading(true);
    try {
      const res = await listStoreManagers(token);
      const found = (res.managers || []).find(m => m.id === passedManager.id);
      if (found) {
        const normalizedImage = normalizePreview(found.profileImage);
        setManager({ ...found, profileImage: normalizedImage || undefined });
        setForm({ name: found.name || '', email: found.email || '' });
        setAvatar(normalizedImage);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [passedManager?.id, token]);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  const pickImage = useCallback(async () => {
    try {
      const uri = await launchImagePicker();
      if (uri) setAvatar(uri);
    } catch {}
  }, []);

  const handleSave = useCallback(async () => {
    if (!token || !manager?.id) {
      Alert.alert('Session expired', 'Please sign in again.');
      return;
    }
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email) {
      Alert.alert('Missing info', 'Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      let profileImage: string | undefined;
      if (avatar && avatar !== manager.profileImage) {
        profileImage = await uploadProfileImage(avatar, token, 'store-managers');
      }
      await updateStoreManager(manager.id, { name, email, profileImage }, token);
      Alert.alert('Saved', 'Manager updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update manager');
    } finally {
      setSaving(false);
    }
  }, [avatar, form, manager, navigation, token]);

  if (!manager) {
    return (
      <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
        <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: dark ? COLORS.white : COLORS.black }}>Manager not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Edit Store Manager" />
        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={COLORS.primary} />
        ) : (
          <>
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
              </View>
            </ScrollView>
            <ButtonFilled
              title={saving ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={saving}
              textColor={COLORS.white}
              style={[styles.submitBtn, { backgroundColor: COLORS.black, borderColor: COLORS.black }]}
            />
          </>
        )}
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
  avatar: { width: '100%', height: '100%' , borderRadius: 70},
  pickImage: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10000
  },
  submitBtn: { marginTop: 12, borderRadius: 14, height: 52 },
});

export default EditManagerScreen;
