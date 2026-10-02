import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { COLORS, SIZES } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';

const baseAmount = [
    {
        id: "1",
        amount: "$10"
    },
    {
        id: "2",
        amount: "$20"
    },
    {
        id: "3",
        amount: "$50"
    },
    {
        id: "4",
        amount: "$100"
    },
    {
        id: "5",
        amount: "$200"
    },
    {
        id: "6",
        amount: "$250"
    },
    {
        id: "7",
        amount: "$500"
    },
    {
        id: "8",
        amount: "$750"
    },
    {
        id: "9",
        amount: "$1000"
    }
]

const TopupEwalletAmount = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const [selectedAmount, setSelectedAmount] = useState("$120");
    const { colors, dark } = useTheme();

    const handleAmountSelection = (amount: any) => {
        setSelectedAmount(amount);
    };
    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Top Up E-wallet" />
                <View>
                    <Text style={[styles.title, {
                        color: dark ? COLORS.white : COLORS.greyscale900
                    }]}>Enter the amount of top up</Text>
                    <TextInput
                        placeholder='$120'
                        placeholderTextColor={COLORS.black}
                        style={[styles.input, {
                            color: dark ? COLORS.secondaryWhite : COLORS.greyscale900,
                            borderColor: dark ? COLORS.white : COLORS.primary,
                        }]}
                        value={selectedAmount}
                        onChangeText={setSelectedAmount}
                    />
                    <FlatList
                        data={baseAmount}
                        keyExtractor={item => item.id}
                        numColumns={3}
                        columnWrapperStyle={{ gap: 4 }}
                        style={{ marginVertical: 22 }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.amountContainer, {
                                    borderColor: dark ? COLORS.white : COLORS.primary,
                                }]}
                                onPress={() => handleAmountSelection(item.amount)}>
                                <Text style={[styles.amount, {
                                    color: dark ? COLORS.white : COLORS.primary,
                                }]}>{item.amount}</Text>
                            </TouchableOpacity>
                        )}
                    />
                    <ButtonFilled
                        title="Continue"
                        onPress={() => navigation.navigate("topupewalletmethods")}
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
    title: {
        fontSize: 16,
        fontFamily: "regular",
        color: COLORS.greyscale900,
        marginLeft: 12,
        marginVertical: 32,
        textAlign: "center"
    },
    input: {
        width: SIZES.width - 32,
        height: 112,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        fontSize: 48,
        fontFamily: "extraBold",
        color: COLORS.greyscale900,
        textAlign: "center"
    },
    amountContainer: {
        width: (SIZES.width - 48) / 3,
        height: 42,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        borderColor: COLORS.primary,
        borderWidth: 2,
        marginBottom: 12
    },
    amount: {
        fontSize: 16,
        fontFamily: "bold",
        color: COLORS.primary,
        textAlign: "center"
    }
})

export default TopupEwalletAmount