import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ImageSourcePropType } from 'react-native';
import { COLORS, SIZES, icons } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

type TransactionHistoryItemProps = {
    image: ImageSourcePropType; // Assuming image is an image source
    name: string;
    date: string;
    type: string; // Restricting type to specific values
    amount: string;
    onPress: () => void; // Callback for the onPress event
};

const TransactionHistoryItem: React.FC<TransactionHistoryItemProps> = ({
    image,
    name,
    date,
    type,
    amount,
    onPress
}) => {
    const { dark } = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            style={styles.container}>
            <View style={styles.viewLeftContainer}>
                {type === "Top Up" ? (
                    <View style={styles.topUpView1}>
                        <View style={styles.topUpView2}>
                            <Image
                                source={icons.wallet2}
                                resizeMode='contain'
                                style={styles.walletIcon}
                            />
                        </View>
                    </View>
                ) : (
                    <Image
                        source={image}
                        resizeMode='contain'
                        style={styles.avatar}
                    />
                )}
                <View>
                    <Text style={[styles.name, {
                        color: dark ? COLORS.white : COLORS.greyscale900
                    }]}>{name}</Text>
                    <Text style={[styles.date, {
                        color: dark ? COLORS.grayscale400 : COLORS.grayscale700
                    }]}>{date}</Text>
                </View>
            </View>
            <View style={styles.viewRightContainer}>
                <Text style={[styles.amount, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>{amount}</Text>
                <View style={styles.typeContainer}>
                    <Text style={[styles.type, {
                        color: dark ? COLORS.grayscale400 : COLORS.grayscale700
                    }]}>{type}</Text>
                    <Image
                        source={type === "Purchase Expense" ? icons.arrowUpSquare : icons.arrowDownSquare}
                        resizeMode='contain'
                        style={[styles.typeIcon, {
                            tintColor: type === "Purchase Expense" ? COLORS.red : COLORS.blue
                        }]}
                    />
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SIZES.width - 32,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginVertical: 6
    },
    viewLeftContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 999,
        marginRight: 12
    },
    name: {
        fontFamily: "bold",
        fontSize: 16,
        color: COLORS.black,
        marginBottom: 6
    },
    date: {
        fontFamily: "regular",
        fontSize: 12,
        color: COLORS.grayscale700
    },
    viewRightContainer: {
        flexDirection: "column",
    },
    amount: {
        fontFamily: "bold",
        fontSize: 16,
        color: COLORS.black,
        marginBottom: 4,
        textAlign: "right"
    },
    typeContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    type: {
        fontFamily: "regular",
        fontSize: 14,
        color: COLORS.grayscale700,
        marginRight: 12
    },
    typeIcon: {
        width: 16,
        height: 16,
    },
    topUpView1: {
        width: 54,
        height: 54,
        borderRadius: 999,
        marginRight: 12,
        backgroundColor: COLORS.tansparentPrimary,
        alignItems: "center",
        justifyContent: "center"
    },
    topUpView2: {
        width: 42,
        height: 42,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.primary
    },
    walletIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.white
    }
});

export default TransactionHistoryItem;