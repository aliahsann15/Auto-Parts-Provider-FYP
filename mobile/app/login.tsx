import { View, Text, StyleSheet, ScrollView, Image, Alert, TouchableOpacity } from 'react-native';
import React, { useCallback, useReducer, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, icons, images } from '../constants';
import Header from '../components/Header';
import { reducer } from '../utils/reducers/formReducers';
import Input from '../components/Input';
import Checkbox from 'expo-checkbox';
import SocialButton from '../components/SocialButton';
import OrSeparator from '../components/OrSeparator';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import { router, useNavigation } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { login as loginApi, googleAuth, requestPasswordReset } from '@/utils/api/auth';
import { signInWithGoogle } from '@/utils/auth/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasSeenSellerOnboarding, markSellerOnboardingSeen } from '@/utils/storage/onboarding';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
const initialState = {
    inputValues: {
        email: '',
        password: ''
    },
    inputValidities: {
        email: false,
        password: false
    },
    formIsValid: false,
}

type Nav = {
    navigate: (value: string) => void
}

const shouldForceSellerOnboarding = () => {
    const rawFlag =
        (Constants.expoConfig?.extra as any)?.alwaysShowSellerOnboarding ??
        (Constants as any)?.manifest?.extra?.alwaysShowSellerOnboarding ??
        (Constants as any)?.manifest2?.extra?.alwaysShowSellerOnboarding ??
        process.env.EXPO_PUBLIC_ALWAYS_SHOW_SELLER_ONBOARDING ??
        process.env.ALWAYS_SHOW_SELLER_ONBOARDING;
    const flagStr = typeof rawFlag === 'string' ? rawFlag.toLowerCase().trim() : String(rawFlag);
    return rawFlag === true || flagStr === 'true' || flagStr === '1';
};

WebBrowser.maybeCompleteAuthSession();

const Login = () => {
    const { navigate } = useNavigation<Nav>();
    const [formState, dispatchFormState] = useReducer(reducer, initialState);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState(false);
    const [isChecked, setChecked] = useState(false);
    const { colors, dark } = useTheme();
    const { setAuth } = useAuth();
    const inputChangedHandler = useCallback(
        (inputId: string, inputValue: string) => {
            const result = true; // TODO: re-enable validateInput when ready
            dispatchFormState({
                type: 'UPDATE',
                inputId,
                inputValue,
                validationResult: result,
            })
        }, [dispatchFormState]);

    const handleLogin = async () => {
        const email = formState.inputValues.email?.trim().toLowerCase();
        const password = formState.inputValues.password;

        if (!email || !password) {
            return Alert.alert('Missing info', 'Please enter email and password.');
        }
        setLoading(true);
        setError(null);
        try {
            const response = await loginApi({ email, password, rememberMe: isChecked });
            await setAuth({ user: response.user, token: response.token, remember: isChecked });
            try { await AsyncStorage.setItem('hasSeenOnboarding', 'true'); } catch {}
            const role = (response.user.role || '').toLowerCase();

            if (role === 'superadmin') {
                router.replace('/superadmin/orders');
            } else if (role === 'seller' || role === 'storemanager') {
                const forceSellerOnboarding = shouldForceSellerOnboarding();
                const seenSeller = await hasSeenSellerOnboarding();
                if (!forceSellerOnboarding && seenSeller) {
                    router.replace('/seller');
                } else {
                    await markSellerOnboardingSeen();
                    router.replace('/sellerOnboarding1');
                }
            } else {
                router.replace('/(tabs)');
            }
        } catch (err: any) {
            setError(err?.message || 'Login failed');
            Alert.alert('Login failed', err?.message || 'Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const googleAuthHandler = async () => {
        try {
            setSocialLoading(true);
            const { idToken } = await signInWithGoogle();
            const resp = await googleAuth({ idToken, rememberMe: isChecked });
            const role = (resp.user.role || '').toLowerCase();
            if (role === 'seller') {
                Alert.alert('Not available for sellers', 'Sellers cannot sign in with Google. Please use email/password.');
                return;
            }
            await setAuth({ user: resp.user, token: resp.token, remember: isChecked });
            try { await AsyncStorage.setItem('hasSeenOnboarding', 'true'); } catch {}
            if (resp.newUser) {
                router.replace('/chooseinterest');
            } else {
                router.replace('/(tabs)');
            }
        } catch (err: any) {
            Alert.alert('Google Sign-In failed', err?.message || 'Please try again.');
        } finally {
            setSocialLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.area, {
            backgroundColor: colors.background
        }]}>
            <View style={[styles.container, {
                backgroundColor: colors.background
            }]}>
                <Header title="" />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={images.logo}
                            resizeMode='contain'
                            style={[styles.logo]}
                        />
                    </View>
                    <Text style={[styles.title, {
                        color: dark ? COLORS.white : COLORS.black
                    }]}>Login to Your Account</Text>
                    <View style={{ flexDirection: 'column', gap: 5 }}>
                        <Input
                            id="email"
                            onInputChanged={inputChangedHandler}
                            placeholder="Email"
                            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                            icon={icons.email}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <Input
                            onInputChanged={inputChangedHandler}
                            autoCapitalize="none"
                            id="password"
                            placeholder="Password"
                            placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                            icon={icons.padlock}
                            secureTextEntry={true}
                        />
                    </View>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setChecked(!isChecked)}
                        style={styles.checkBoxContainer}
                    >
                        <View style={{ flexDirection: 'row' }}>
                            <Checkbox
                                style={styles.checkbox}
                                value={isChecked}
                                color={isChecked ? COLORS.primary : dark ? COLORS.white : "gray"}
                                onValueChange={setChecked}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.privacy, {
                                    color: dark ? COLORS.white : COLORS.black
                                }]}>Remember me</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <ButtonFilled
                        title="Login"
                        onPress={handleLogin}
                        isLoading={loading || socialLoading}
                        disabled={loading || socialLoading}
                        style={styles.button}
                        textColor={COLORS.white}

                    />
                    <TouchableOpacity
                        onPress={async () => {
                            const email = formState.inputValues.email?.trim();
                            // Always send users to the OTP flow; the email screen will trigger the request
                            navigate("forgotpasswordemail");
                        }}>
                        <Text style={[styles.forgotPasswordBtnText, {
                            color: dark ? COLORS.white : COLORS.primary
                        }]}>Forgot the password?</Text>
                    </TouchableOpacity>
                    <View>
                        <OrSeparator text="or continue with" />
                        <View style={styles.socialBtnContainer}>
                         
                            <SocialButton
                                icon={icons.google}
                                onPress={googleAuthHandler}
                            />
                        </View>
                    </View>
                </ScrollView>

            </View>
            <View style={styles.bottomContainer}>
                <Text style={[styles.bottomLeft, {
                    color: dark ? COLORS.white : COLORS.black
                }]}>Don't have an account ?</Text>
                <TouchableOpacity
                    onPress={() => navigate("welcome")}>
                    <Text style={[styles.bottomRight, {
                        color: dark ? COLORS.white : COLORS.primary
                    }]}>{"  "}Sign Up</Text>
                </TouchableOpacity>
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
        marginVertical: 30
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
        marginBottom: 27
    },
    checkBoxContainer: {
        flexDirection: "row",
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 13,
        marginTop: 15,
        paddingLeft: 5
        
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
        backgroundColor: COLORS.white,
        paddingTop: 20
    },
    bottomLeft: {
        fontSize: 14,
        fontFamily: "regular",
        color: "black"
    },
    bottomRight: {
        fontSize: 14,
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

export default Login
