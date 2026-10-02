import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { COLORS } from '../constants';
import { OtpInput } from "react-native-otp-entry";
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import { useNavigation, useLocalSearchParams, router } from 'expo-router';
import { verifyResetCode } from '@/utils/api/auth';

type Nav = {
    navigate: (value: string) => void
}

const OTPVerification = () => {
    const { navigate } = useNavigation<Nav>();
    const params = useLocalSearchParams<{ email?: string | string[]; phoneNumber?: string | string[]; expiresAt?: string }>();
    const emailParam = Array.isArray(params.email) ? params.email[0] : params.email;
    const phoneParam = Array.isArray(params.phoneNumber) ? params.phoneNumber[0] : params.phoneNumber;
    const [time, setTime] = useState(59);
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { colors, dark } = useTheme();

    useEffect(() => {
        const intervalId = setInterval(() => {
            setTime((prevTime) => (prevTime > 0 ? prevTime - 1 : 0));
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Forgot Password" />
                <ScrollView>
                    <Text style={[styles.title, {
                        color: dark ? COLORS.white : COLORS.black
                    }]}>A Verifcation Code has been sent to {emailParam || phoneParam || 'your account'}</Text>
                    <OtpInput
                        numberOfDigits={6}
                        onTextChange={(text) => setCode(text)}
                        focusColor={COLORS.primary}
                        focusStickBlinkingDuration={500}
                        onFilled={(text) => setCode(text)}
                        theme={{
                            pinCodeContainerStyle: {
                                backgroundColor: dark ? COLORS.black : COLORS.grayscale200,
                                borderColor: dark ? COLORS.gray : COLORS.secondaryWhite,
                                borderWidth: 1,
                                borderRadius: 10,
                                height: 58,
                                width: 58,
                            },
                            pinCodeTextStyle: {
                                color: dark ? COLORS.white : COLORS.black,
                            }
                        }} />
                    <View style={styles.codeContainer}>
                        <Text style={[styles.code, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>Resend code in</Text>
                        <Text style={styles.time}>{`  ${time}  `}</Text>
                        <Text style={[styles.code, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>s</Text>
                    </View>
                </ScrollView>
                <ButtonFilled
                    title="Verify"
                    style={styles.button}
                    isLoading={isLoading}
                    disabled={isLoading}
                    onPress={async () => {
                        if (!emailParam && !phoneParam) {
                            return Alert.alert('Missing contact', 'Reset session expired. Please start over.');
                        }
                        if (!code || code.length < 6) {
                            return Alert.alert('Invalid code', 'Please enter the 6-digit code we sent.');
                        }
                        setIsLoading(true);
                        try {
                            const resp = await verifyResetCode({ email: emailParam, phoneNumber: phoneParam, code });
                            router.push({ pathname: '/createnewpassword', params: { resetToken: resp.resetToken } });
                        } catch (err: any) {
                            Alert.alert('Verification failed', err?.message || 'Please try again.');
                        } finally {
                            setIsLoading(false);
                        }
                    }}
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
    title: {
        fontSize: 18,
        fontFamily: "medium",
        color: COLORS.greyscale900,
        textAlign: "center",
        marginTop: 54,
     marginBottom: 30
    },
    OTPStyle: {
        borderRadius: 8,
        height: 58,
        width: 58,
        backgroundColor: COLORS.success,
        borderBottomColor: "gray",
        borderBottomWidth: .4,
        borderWidth: .4,
        borderColor: "gray"
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
})

export default OTPVerification
