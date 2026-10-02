import { View, Text, StyleSheet, ScrollView, Image, Alert, TouchableOpacity } from 'react-native';
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, icons, images } from '../constants';
import Header from '../components/Header';
import { reducer } from '../utils/reducers/formReducers';
import { validateInput } from '../utils/actions/formActions';
import Input from '../components/Input';
import Checkbox from 'expo-checkbox';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import { router, useNavigation } from 'expo-router';
import { requestPasswordReset } from '@/utils/api/auth';

const initialState = {
    inputValues: {
        email: '',
    },
    inputValidities: {
        email: false
    },
    formIsValid: false,
}

type Nav = {
    navigate: (value: string) => void
}

const ForgotPasswordEmail = () => {
    const { navigate } = useNavigation<Nav>();
    const [formState, dispatchFormState] = useReducer(reducer, initialState);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isChecked, setChecked] = useState(false);
    const { colors, dark } = useTheme();

    const inputChangedHandler = useCallback(
        (inputId: string, inputValue: string) => {
            const result = validateInput(inputId, inputValue)
            dispatchFormState({
                type: 'UPDATE',
                inputId,
                validationResult: result,
                inputValue
            })
        }, [dispatchFormState])

    useEffect(() => {
        if (error) {
            Alert.alert('An error occured', error)
        }
    }, [error])

    const handleSubmit = async () => {
        const email = formState.inputValues.email?.trim();
        if (!email) {
            return Alert.alert('Missing email', 'Please enter your account email.');
        }
        setLoading(true);
        setError(null);
        try {
            const resp = await requestPasswordReset({ email });
            const preview = (resp as any)?.emailPreviewUrl;
            const msg = preview
                ? `We sent a reset link to your email. Preview (dev): ${preview}`
                : 'We sent you a reset link. Check your email.';
            Alert.alert('Check your inbox', msg);
            router.push({ pathname: '/otpverification', params: { email, expiresAt: resp.expiresAt } });
        } catch (err: any) {
            setError(err?.message || 'Failed to start reset');
            Alert.alert('Reset failed', err?.message || 'Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Forgot Password" />
                <ScrollView style={{ marginVertical: 54 }} showsVerticalScrollIndicator={false}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={images.store}
                            resizeMode='contain'
                            style={styles.logo}
                        />
                    </View>
                    <Text style={[styles.title, {
                        color: dark ? COLORS.white : COLORS.black
                    }]}>Enter your Email</Text>
                    <Input
                        id="email"
                        onInputChanged={inputChangedHandler}
                        value={formState.inputValues.email}
                        errorText={formState.inputValidities['email']}
                        placeholder="Email"
                        placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                        icon={icons.email}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <ButtonFilled
                        title="Reset Password"
                        isLoading={loading}
                        disabled={loading}
                        onPress={handleSubmit}
                        style={styles.button}
                    />
                    <TouchableOpacity
                        onPress={() => navigate("login")}>
                        <Text style={[styles.forgotPasswordBtnText, {
                            color: dark ? COLORS.white : COLORS.primary
                        }]}>Remember the password?</Text>
                    </TouchableOpacity>
                    <View>
                    </View>
                </ScrollView>
                <View style={styles.bottomContainer}>
                    <Text style={[styles.bottomLeft, {
                        color: dark ? COLORS.white : COLORS.black
                    }]}>Don't have an account ?</Text>
                    <TouchableOpacity
                        onPress={() => navigate("signup")}>
                        <Text style={[styles.bottomRight, {
                            color: dark ? COLORS.white : COLORS.primary
                        }]}>{"  "}Sign Up</Text>
                    </TouchableOpacity>
                </View>
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
    logo: {
        width: 150,
        height: 100,
        
    },
    logoContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 32
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 26,
        fontFamily: "semiBold",
        color: COLORS.black,
        textAlign: "center",
        marginBottom: 22
    },
    checkBoxContainer: {
        flexDirection: "row",
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 18,
    },
    checkbox: {
        marginRight: 8,
        height: 16,
        width: 16,
        borderRadius: 4,
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    privacy: {
        fontSize: 12,
        fontFamily: "regular",
        color: COLORS.black,
    },
    socialTitle: {
        fontSize: 19.25,
        fontFamily: "medium",
        color: COLORS.black,
        textAlign: "center",
        marginVertical: 26
    },
    socialBtnContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    bottomContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 18,
        position: "absolute",
        bottom: 12,
        right: 0,
        left: 0,
    },
    bottomLeft: {
        fontSize: 14,
        fontFamily: "regular",
        color: "black"
    },
    bottomRight: {
        fontSize: 16,
        fontFamily: "medium",
        color: COLORS.primary
    },
    button: {
        marginVertical: 6,
        width: SIZES.width - 32,
        borderRadius: 30
    },
    forgotPasswordBtnText: {
        fontSize: 16,
        fontFamily: "semiBold",
        color: COLORS.primary,
        textAlign: "center",
        marginTop: 12
    }
})

export default ForgotPasswordEmail
