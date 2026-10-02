import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { COLORS } from '../constants';
import { OtpInput } from "react-native-otp-entry";
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import { useLocalSearchParams, router } from 'expo-router';
import { verifyEmail as verifyEmailApi } from '@/utils/api/auth';
import { useAuth } from './context/AuthContext';

const VerifyEmail = () => {
  const params = useLocalSearchParams<{ email?: string | string[]; user?: string | string[] }>();
  const email = useMemo(() => Array.isArray(params.email) ? params.email[0] : params.email, [params.email]);
  const serializedUser = useMemo(() => Array.isArray(params.user) ? params.user[0] : params.user, [params.user]);
  const pendingUser = useMemo(() => {
    try {
      return serializedUser ? JSON.parse(serializedUser) : null;
    } catch {
      return null;
    }
  }, [serializedUser]);

  const [time, setTime] = useState(59);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { colors, dark } = useTheme();
  const { setAuth } = useAuth();

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const handleVerify = async () => {
    if (!email) {
      Alert.alert('Session expired', 'Missing email to verify. Please sign up again.');
      router.replace('/signup');
      return;
    }
    if (!code || code.length < 6) {
      Alert.alert('Invalid code', 'Please enter the 6-digit code we sent.');
      return;
    }
    setIsLoading(true);
    try {
      const resp = await verifyEmailApi({ email, code });
      if (pendingUser) {
        await setAuth({
          user: { ...pendingUser, isEmailVerified: true },
          token: resp.token,
          remember: true
        });
        router.replace('/fillyourprofile');
      } else {
        Alert.alert('Verified', 'Email verified. Please sign in to continue.');
        router.replace('/login');
      }
    } catch (err: any) {
      Alert.alert('Verification failed', err?.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Verify Email" />
        <ScrollView>
          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.black }]}>
            A Verification Code has been sent to {email || 'your email'}
          </Text>
          <OtpInput
            numberOfDigits={6}
            onTextChange={setCode}
            focusColor={COLORS.primary}
            focusStickBlinkingDuration={500}
            onFilled={setCode}
            theme={{
              pinCodeContainerStyle: {
                backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200,
                borderColor: dark ? COLORS.gray : COLORS.secondaryWhite,
                borderWidth: 1,
                borderRadius: 10,
                height: 58,
                width: 58,
              },
              pinCodeTextStyle: {
                color: dark ? COLORS.white : COLORS.black,
              }
            }}
          />
          <View style={styles.codeContainer}>
            <Text style={[styles.code, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Resend code in</Text>
            <Text style={styles.time}>{`  ${time}  `}</Text>
            <Text style={[styles.code, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>s</Text>
          </View>
        </ScrollView>
        <ButtonFilled
          title="Verify"
          style={styles.button}
          isLoading={isLoading}
          disabled={isLoading}
          onPress={handleVerify}
        />
      </View>
    </SafeAreaView>
  );
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
  title: {
    fontSize: 18,
    fontFamily: "medium",
    color: COLORS.greyscale900,
    textAlign: "center",
    marginTop: 54,
     marginBottom: 30
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    justifyContent: "center"
  },
  code: {
    fontSize: 18,
    fontFamily: "medium",
    color: COLORS.greyscale900,
    textAlign: "center"
  },
  time: {
    fontFamily: "medium",
    fontSize: 18,
    color: COLORS.primary
  },
  button: {
    borderRadius: 32
  }
});

export default VerifyEmail;
