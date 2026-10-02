import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import React, { useState } from 'react';
import { COLORS, icons } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import Button from '../components/Button';
import { useTheme } from '../theme/ThemeProvider';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { API_BASE_URL, apiRequest } from '@/utils/api/client';
import { requestPasswordReset } from '@/utils/api/auth';
import { router } from 'expo-router';

type Nav = {
    navigate: (value: string) => void
}

const SettingsSecurity = () => {
    const { navigate } = useNavigation<Nav>();
    const { colors, dark } = useTheme();
    const { user, token } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleChangePassword = async () => {
        if (!user?.id || !token) {
            Alert.alert('Not signed in', 'Please log in again.');
            return;
        }
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert('Missing fields', 'Please fill all password fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'New password and confirm password must match.');
            return;
        }
        setSubmitting(true);
        try {
            await apiRequest(`/user/${user.id}/change-password`, {
                method: 'POST',
                token,
                body: { oldPassword, newPassword },
            });
            Alert.alert('Success', 'Password updated.');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            navigate('(tabs)');
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to update password.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Change Password" />
                <View style={{ marginTop: 24 }}>
                    <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Old Password</Text>
                    <TextInput
                        secureTextEntry
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        style={[
                            styles.input,
                            {
                                borderColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                backgroundColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                color: dark ? COLORS.white : COLORS.black,
                            },
                        ]}
                        placeholder="Enter old password"
                        placeholderTextColor={dark ? COLORS.grayTie : COLORS.gray}
                    />

                    <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>New Password</Text>
                    <TextInput
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                        style={[
                            styles.input,
                            {
                                borderColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                backgroundColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                color: dark ? COLORS.white : COLORS.black,
                            },
                        ]}
                        placeholder="Enter new password"
                        placeholderTextColor={dark ? COLORS.grayTie : COLORS.gray}
                    />

                    <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Confirm Password</Text>
                    <TextInput
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        style={[
                            styles.input,
                            {
                                borderColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                backgroundColor: dark ? COLORS.dark2 : COLORS.greyscale500,
                                color: dark ? COLORS.white : COLORS.black,
                            },
                        ]}
                        placeholder="Confirm new password"
                        placeholderTextColor={dark ? COLORS.grayTie : COLORS.gray}
                    />

                    <Button
                        title={submitting ? "Updating..." : "Change Password"}
                        style={{
                            backgroundColor: COLORS.primary,
                            borderRadius: 32,
                            borderColor: COLORS.primary,
                            marginTop: 24
                        }}
                        textColor={COLORS.white}
                        onPress={handleChangePassword}
                        isLoading={submitting}
                    />
                    <Button
                        title="Forgot password?"
                        style={{
                            backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                            borderRadius: 32,
                            borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                            marginTop: 12
                        }}
                        textColor={dark ? COLORS.white : COLORS.primary}
                        onPress={async () => {
                            if (user?.email) {
                                Alert.alert(
                                    'Reset password',
                                    `Send reset otp code to ${user.email}?`,
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Send',
                                            onPress: async () => {
                                                try {
                                                    const resp = await requestPasswordReset({ email: user.email });
                                                    Alert.alert('Check your email', 'We sent a reset link to your email.');
                                                    router.push({ pathname: '/otpverification', params: { email: user.email, expiresAt: (resp as any)?.expiresAt } });
                                                } catch (err: any) {
                                                    Alert.alert('Error', err?.message || 'Unable to send reset link.');
                                                }
                                            }
                                        }
                                    ]
                                );
                            } else {
                                navigate("forgotpasswordemail");
                            }
                        }}
                    />
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
        backgroundColor: COLORS.white,
        padding: 16
    },
    label: {
        fontSize: 16,
        fontFamily: "semiBold",
        marginBottom: 8,
    },
    input: {
        height: 52,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        marginBottom: 16,
        fontFamily: "regular",
        fontSize: 15,
    },
})

export default SettingsSecurity
