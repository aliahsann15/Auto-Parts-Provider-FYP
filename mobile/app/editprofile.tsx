import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import ButtonFilled from '../components/ButtonFilled';
import { launchImagePicker } from '../utils/ImagePickerHelper';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '@/app/context/AuthContext';
import { COLORS, SIZES } from '../constants';
import { API_BASE_URL } from '@/utils/api/client';
import { fetchUserProfile, updateUserProfile, UpdateUserPayload, uploadProfileImage } from '@/utils/api/user';

type FormShape = {
  name: string;
  nickname: string;
  email: string;
  phoneNumber: string;
  occupation: string;
  dateOfBirth: string;
};

const EditProfile = () => {
  const { dark, colors } = useTheme();
  const { user, token, updateUserProfile: updateAuthUser } = useAuth();
  const apiBase = API_BASE_URL.replace(/\/api$/, '');

  const [form, setForm] = useState<FormShape>({
    name: user?.name || '',
    nickname: user?.nickname || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    occupation: '',
    dateOfBirth: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImage || null);
  const [localImage, setLocalImage] = useState<string | null>(null);

  const refs: Record<keyof FormShape, React.RefObject<TextInput | null>> = {
    name: useRef<TextInput | null>(null),
    nickname: useRef<TextInput | null>(null),
    email: useRef<TextInput | null>(null),
    phoneNumber: useRef<TextInput | null>(null),
    occupation: useRef<TextInput | null>(null),
    dateOfBirth: useRef<TextInput | null>(null),
  };

  const enableField = (key: keyof FormShape) => {
    setActiveField(key);
    setTimeout(() => {
      refs[key]?.current?.focus();
    }, 50);
  };

  const resolveAvatarSource = () => {
    const uri = localImage || profileImage;
    if (!uri) return null;
    const isAbsolute =
      uri.startsWith('http') ||
      uri.startsWith('data:') ||
      uri.startsWith('file:') ||
      uri.startsWith('content:');
    return { uri: isAbsolute ? uri : `${apiBase}${uri}` };
  };

  const loadProfile = useCallback(async () => {
    if (!user?.id || !token) return;
    setLoading(true);
    try {
      const remote = await fetchUserProfile(user.id, token);
      setForm({
        name: remote.name || '',
        nickname: remote.nickname || '',
        email: remote.email || '',
        phoneNumber: remote.phoneNumber || '',
        occupation: '',
        dateOfBirth: '',
      });
      setProfileImage(remote.profileImage || null);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handlePickImage = async () => {
    try {
      const uri = await launchImagePicker();
      if (uri) {
        setLocalImage(uri);
      }
    } catch (err: any) {
      Alert.alert('Image error', err?.message || 'Unable to pick image right now.');
    }
  };

  const handleSave = async () => {
    if (!user?.id || !token) {
      Alert.alert('Not logged in', 'Please sign in again.');
      return;
    }
    const phone = form.phoneNumber?.trim();
    if (phone && (phone.length !== 11 || !/^\d{11}$/.test(phone))) {
      Alert.alert('Invalid phone', 'Please enter an 11-digit phone number (numbers only).');
      return;
    }
    setSaving(true);
    try {
      const payload: UpdateUserPayload = {
        name: form.name?.trim(),
        nickname: form.nickname?.trim() || undefined,
        email: form.email?.trim(),
        phoneNumber: phone || undefined,
        occupation: form.occupation?.trim() || undefined,
      };
      // Remove occupation/dateOfBirth from buyer edits
      if (localImage) {
        const uploadedUrl = await uploadProfileImage(localImage, token);
        payload.profileImage = uploadedUrl;
      }
      const updated = await updateUserProfile(user.id, payload, token);
      await updateAuthUser(updated);
      setProfileImage(updated.profileImage || null);
      setLocalImage(null);
      setForm({
        name: updated.name || '',
        nickname: updated.nickname || '',
        email: updated.email || '',
        phoneNumber: updated.phoneNumber || '',
        occupation: '',
        dateOfBirth: '',
      });
      setActiveField(null);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err: any) {
      Alert.alert('Update failed', err?.message || 'Could not update your profile');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (
    key: keyof FormShape,
    label: string,
    options?: { keyboardType?: 'default' | 'email-address' | 'phone-pad' }
  ) => {
    const editable = key === 'email' ? false : activeField === key;
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => {
          if (key === 'email') return;
          enableField(key);
        }}
        style={{ marginBottom: 14 }}
      >
        <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{label}</Text>
        <View
          style={[
            styles.inputContainer,
            {
              borderColor: editable ? COLORS.primary : dark ? COLORS.dark2 : COLORS.greyscale500,
              backgroundColor: editable ? COLORS.tansparentPrimary : dark ? COLORS.dark2 : COLORS.greyscale500,
            },
          ]}
        >
          <TextInput
            ref={refs[key]}
            value={form[key] || ''}
            editable={editable}
            onChangeText={(text) => setForm((prev) => ({ ...prev, [key]: text }))}
            placeholder={label}
            placeholderTextColor={dark ? COLORS.grayTie : COLORS.gray}
            keyboardType={options?.keyboardType || 'default'}
            maxLength={key === 'phoneNumber' ? 11 : undefined}
            style={[styles.input, { color: dark ? COLORS.white : COLORS.black }]}
            onFocus={() => setActiveField(key)}
            selectTextOnFocus
          />
        </View>
        {key === 'email' ? (
          <Text style={styles.readonlyHint}>Email cannot be edited</Text>
        ) : (
          !editable && <Text style={styles.readonlyHint}>Tap to edit</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Edit Profile" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <View style={styles.avatarContainer}>
              {resolveAvatarSource() ? (
                <Image source={resolveAvatarSource() as any} resizeMode="cover" style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{(form.name || 'U').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <TouchableOpacity onPress={handlePickImage} style={styles.pickImage}>
                <MaterialIcons name="edit" size={14} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={{ marginTop: 8, color: dark ? COLORS.white : COLORS.black }}>Loading profile...</Text>
            </View>
          ) : (
            <View style={{ paddingBottom: 32 }}>
              {renderField('name', 'Full Name')}
              {renderField('nickname', 'Nickname')}
              {renderField('email', 'Email', { keyboardType: 'email-address' })}
              {renderField('phoneNumber', 'Phone Number', { keyboardType: 'phone-pad' })}
            </View>
          )}
        </ScrollView>
      </View>
      <View style={styles.bottomContainer}>
        <ButtonFilled
          title={saving ? 'Updating...' : 'Update'}
          style={styles.continueButton}
          onPress={handleSave}
          disabled={saving}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.white,
  },
  avatarContainer: {
    marginVertical: 12,
    alignItems: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  avatar: {
    height: 140,
    width: 140,
    borderRadius: 70,
  },
  avatarFallback: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: COLORS.white,
    fontFamily: 'bold',
    fontSize: 44,
  },
  pickImage: {
    height: 28,
    width: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    width: SIZES.width - 32,
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: 'regular',
    fontSize: 15,
    paddingVertical: 0,
  },
  readonlyHint: {
    fontSize: 12,
    color: COLORS.grayscale700,
    marginTop: 4,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    left: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SIZES.width - 32,
    alignItems: 'center',
  },
  continueButton: {
    width: SIZES.width - 32,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
});

export default EditProfile;
