import { View, Text, StyleSheet, ScrollView, Image, Alert, TouchableOpacity } from 'react-native';
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, icons, images } from '../constants';
import Header from '../components/Header';
import { reducer } from '../utils/reducers/formReducers';
import { validateInput } from '../utils/actions/formActions';
import Checkbox from 'expo-checkbox';
import SocialButton from '../components/SocialButton';
import OrSeparator from '../components/OrSeparator';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import Input from '@/components/Input';
import { useNavigation, router } from 'expo-router';
import { register as registerApi, googleAuth } from '@/utils/api/auth';
import { signInWithGoogle } from '@/utils/auth/google';
import { useAuth } from '@/app/context/AuthContext';

const initialState = {
    inputValues: {
        email: '',
        password: '',
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

const Signup = () => {
    const { navigate } = useNavigation<Nav>();
    const [formState, dispatchFormState] = useReducer(reducer, initialState);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isChecked, setChecked] = useState(false);
    const { colors, dark } = useTheme();
    const [socialLoading, setSocialLoading] = useState(false);
    const { setAuth } = useAuth();
    // Access auth context to ensure provider is mounted (no direct usage needed here)

    const inputChangedHandler = useCallback(
        (inputId: string, inputValue: string) => {
            const result = validateInput(inputId, inputValue)
            dispatchFormState({
                type: 'UPDATE',
                inputId,
                validationResult: result,
                inputValue,
            })
        },
        [dispatchFormState]);

    useEffect(() => {
        if (error) {
            Alert.alert('An error occured', error)
        }
    }, [error])

   

    // Implementing google authentication (buyers only)
    const googleAuthHandler = async () => {
        try {
            setSocialLoading(true);
            const { idToken } = await signInWithGoogle();
            const resp = await googleAuth({ idToken, rememberMe: true });
            const role = (resp.user.role || '').toLowerCase();
            if (role === 'seller') {
                Alert.alert('Not available for sellers', 'Sellers cannot sign up with Google. Please sign up with email/password.');
                return;
            }
            await setAuth({ user: resp.user, token: resp.token, remember: true });
            if (resp.newUser || !resp.user.interests || resp.user.interests.length === 0) {
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
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                    }]}>Create Your Account</Text>
                    <Input
                        id="email"
                        onInputChanged={inputChangedHandler}
                        errorText={formState.inputValidities['email']}
                        placeholder="Email"
                        placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                        icon={icons.email}
                        keyboardType="email-address"
                    />
                    <Input
                        onInputChanged={inputChangedHandler}
                        errorText={formState.inputValidities['password']}
                        autoCapitalize="none"
                        id="password"
                        placeholder="Password"
                        placeholderTextColor={dark ? COLORS.grayTie : COLORS.black}
                        icon={icons.padlock}
                        secureTextEntry={true}
                    />
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
                                }]}>By continuing you accept our Privacy Policy</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <ButtonFilled
                        title="Sign Up"
                        isLoading={isLoading}
                        disabled={isLoading}
                        onPress={async () => {
                            const email = formState.inputValues.email?.trim();
                            const password = formState.inputValues.password;
                            if (!email || !password) {
                                return Alert.alert('Missing info', 'Please fill email and password.');
                            }
                            setIsLoading(true);
                            setError(null);
                            try {
                                const response = await registerApi({ email, password, rememberMe: true });
                                router.push({
                                    pathname: '/verifyemail',
                                    params: {
                                        email,
                                        user: JSON.stringify(response.user)
                                    }
                                });
                            } catch (err: any) {
                                setError(err?.message || 'Signup failed');
                                Alert.alert('Signup failed', err?.message || 'Please try again.');
                            } finally {
                                setIsLoading(false);
                            }
                        }}
                        style={styles.button}
                    />
                    <View>
                        <OrSeparator text="or continue with" />
                        <View style={styles.socialBtnContainer}>
                         
                            <SocialButton
                                icon={icons.google}
                                onPress={googleAuthHandler}
                                disabled={socialLoading}
                            />
                        </View>
                    </View>
                </ScrollView>
                <View style={styles.bottomContainer}>
                    <Text style={[styles.bottomLeft, {
                        color: dark ? COLORS.white : COLORS.black
                    }]}>Already have an account ?</Text>
                    <TouchableOpacity
                        onPress={() => navigate("login")}>
                        <Text style={[styles.bottomRight, {
                            color: dark ? COLORS.white : COLORS.primary
                        }]}>{" "}Sign In</Text>
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
        height: 150
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
    }
})

export default Signup
