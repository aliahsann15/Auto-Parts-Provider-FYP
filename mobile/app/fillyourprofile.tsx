import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import React, { useCallback, useEffect, useReducer, useState } from 'react'
import { COLORS, SIZES, icons } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { reducer } from '../utils/reducers/formReducers';
import { validateInput } from '../utils/actions/formActions';
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { launchImagePicker } from '../utils/ImagePickerHelper';
import Input from '../components/Input';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import { useNavigation, router } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { updateUserProfile, uploadProfileImage } from '@/utils/api/user';

const initialState = {
  inputValues: {
    fullName: '',
    email: '',
    nickname: '',
    phoneNumber: ''
  },
  inputValidities: {
    fullName: false,
    email: false,
    nickname: true,
    phoneNumber: false,
  },
  formIsValid: false,
}

type Nav = {
    navigate: (value: string) => void
}

const FillYourProfile = () => {
  const { navigate } = useNavigation<Nav>();
  const [image, setImage] = useState<any>(null);
  const [error, setError] = useState();
  const [formState, dispatchFormState] = useReducer(reducer, initialState);
  const { colors, dark } = useTheme();
  const { user, token, updateUserProfile: setAuthUser } = useAuth();
  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const inputChangedHandler = useCallback(
    (inputId: string, inputValue: string) => {
        const result = validateInput(inputId, inputValue)
        dispatchFormState({
            type: 'UPDATE',
            inputId,
            validationResult: result,
            inputValue,
        })
    }, [dispatchFormState]);

  useEffect(() => {
        if (error) {
          Alert.alert('An error occured', error)
        }
      }, [error])

  useEffect(() => {
    if (!user || hasPrefilled) return;
    const nextState = {
      ...initialState,
      inputValues: {
        ...initialState.inputValues,
        fullName: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || ''
      }
    };
    dispatchFormState({ type: 'RESET', initialState: nextState });
    setHasPrefilled(true);
  }, [user, hasPrefilled])

  const pickImage = async () => {
    try {
      const tempUri = await launchImagePicker()

      if (!tempUri) return

      // Set the image
      setImage({ uri: tempUri })
    } catch (error) { }
  };

  const buildPhoneNumber = () => {
    const digits = (formState.inputValues.phoneNumber || '').replace(/\D/g, '').slice(0, 11);
    return digits;
  };

  const handleSaveProfile = async () => {
    const fullName = formState.inputValues.fullName?.trim();
    const email = formState.inputValues.email?.trim();
    const nickname = formState.inputValues.nickname?.trim();
    const phoneDigits = (formState.inputValues.phoneNumber || '').replace(/\D/g, '');
    const phoneNumber = buildPhoneNumber();
    const phoneRegex = /^\d{11}$/;
    if (!fullName || !email || !phoneDigits) {
      Alert.alert('Missing info', 'Please add your name, email and phone number.');
      return;
    }
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert('Invalid phone', 'Enter a valid 11 digit phone number.');
      return;
    }
    if (!user?.id || !token) {
      Alert.alert('Session expired', 'Please sign in again to continue.');
      return;
    }
    setIsSaving(true);
    try {
      let profileImageUrl: string | undefined;
      if (image?.uri) {
        profileImageUrl = await uploadProfileImage(image.uri, token);
      }
      const updated = await updateUserProfile(
        user.id,
        { name: fullName, email, nickname, phoneNumber, profileImage: profileImageUrl || undefined },
        token
      );
      await setAuthUser(updated);
      router.replace("/chooseinterest");
    } catch (err: any) {
      Alert.alert('Update failed', err?.message || 'Could not save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Fill Your Profile" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: "center", marginVertical: 12 }}>
            <View style={styles.avatarContainer}>
              <Image
                source={image === null ? icons.userDefault2 : image}
                resizeMode="cover"
                style={styles.avatar} />
              <TouchableOpacity
                onPress={pickImage}
                style={styles.pickImage}>
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={24}
                  color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
          <View>
            <Input
              id="fullName"
              onInputChanged={inputChangedHandler}
              errorText={formState.inputValidities['fullName']}
              placeholder="Full Name"
              placeholderTextColor={COLORS.gray}
              value={formState.inputValues.fullName}
            />
            <Input
              id="nickname"
              onInputChanged={inputChangedHandler}
              errorText={formState.inputValidities['nickname']}
              placeholder="Nickname (Optional)"
              placeholderTextColor={COLORS.gray}
              value={formState.inputValues.nickname}
            />
            <Input
              id="email"
              onInputChanged={inputChangedHandler}
              errorText={formState.inputValidities['email']}
              placeholder="Email"
              placeholderTextColor={COLORS.gray}
              keyboardType="email-address"
              value={formState.inputValues.email}
              editable={false}
            />
            <Input
              id="phoneNumber"
              onInputChanged={(id, text) => inputChangedHandler(id, text.replace(/\D/g, '').slice(0, 11))}
              errorText={formState.inputValidities['phoneNumber']}
              placeholder="Phone number"
              placeholderTextColor={COLORS.gray}
              keyboardType="phone-pad"
              value={formState.inputValues.phoneNumber}
              maxLength={11}
            />
          </View>
        </ScrollView>
      </View>
      <View style={styles.bottomContainer}>
        <ButtonFilled
          title={isSaving ? "Saving..." : "Continue"}
          style={styles.continueButton}
          onPress={handleSaveProfile}
          disabled={isSaving}
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
    padding: 16,
    backgroundColor: COLORS.white
  },
  avatarContainer: {
    marginVertical: 12,
    alignItems: "center",
    width: 130,
    height: 130,
    borderRadius: 65,

  },
  avatar: {
    height: 130,
    width: 130,
    borderRadius: 65,
  
  },
  pickImage: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  bottomContainer: {
    position: "absolute",
    bottom: 32,
    right: 16,
    left: 16,
    flexDirection: "row",
    justifyContent: "center",
    width: SIZES.width - 32,
    alignItems: "center"
  },
  continueButton: {
    width: SIZES.width - 32,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
})

export default FillYourProfile
