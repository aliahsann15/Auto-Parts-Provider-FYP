import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect } from 'react';
import { COLORS, SIZES, illustrations } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import { router } from 'expo-router';

const ForgotPasswordMethods = () => {
    const { colors, dark } = useTheme();

    useEffect(() => {
        // SMS removed; always go to email flow
        router.replace('/forgotpasswordemail');
    }, []);

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Forgot Password" />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={COLORS.primary} />
                    <Text style={{ marginTop: 12, color: dark ? COLORS.white : COLORS.black }}>Redirecting...</Text>
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
    password: {
        width: 276,
        height: 250
    },
    passwordContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 32
    },
    title: {
        fontSize: 18,
        fontFamily: "medium",
        color: COLORS.greyscale900
    },
    methodContainer: {
        width: SIZES.width - 32,
        height: 112,
        borderRadius: 32,
        borderColor: "gray",
        borderWidth: .3,
        flexDirection: "row",
        alignItems: "center",
        marginTop: 22
    },
})

export default ForgotPasswordMethods
