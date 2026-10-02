import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, ImageSourcePropType } from 'react-native';
import { COLORS, icons } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import { MaterialIcons } from '@expo/vector-icons';

type PaymentMethodItemConnectedProps = {
    onPress: () => void;
    title: string;
    bankName?: string;
    last4?: string;
    icon: ImageSourcePropType;
    tintColor?: string;
    onDelete?: () => void;
    isDefault?: boolean;
};

const PaymentMethodItemConnected: React.FC<PaymentMethodItemConnectedProps> = ({
    onPress,
    title,
    bankName,
    last4,
    icon,
    tintColor,
    onDelete,
    isDefault = false,
}) => {
    const { dark } = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.container,
                { backgroundColor: dark ? COLORS.dark2 : COLORS.white },
            ]}
        >
            <View style={styles.rightContainer}>
                <View style={styles.iconBadge}>
                    <Image
                        source={icons.wallet2}
                        resizeMode="contain"
                        style={[styles.icon, { tintColor: COLORS.white }]}
                    />
                </View>
                <View>
                    <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{title}</Text>
                    {bankName ? (
                        <Text style={[styles.subtitle, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>{bankName}</Text>
                    ) : null}
                    {last4 ? (
                        <Text style={[styles.accountLine, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                          **** **** **** {last4}
                        </Text>
                    ) : null}
                </View>
            </View>
            <View style={styles.leftContainer}>
                <Text style={[
                  styles.connectedTitle,
                  {
                    color: dark ? COLORS.white : COLORS.primary,
                    backgroundColor: dark ? COLORS.grayscale400 : COLORS.grayscale200,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                  }
                ]}>
                  {isDefault ? 'Default' : 'Secondary'}
                </Text>
                {onDelete ? (
                    <TouchableOpacity onPress={onDelete}>
                        <Image source={icons.trash} style={[styles.actionIcon, { tintColor: dark ? COLORS.red : COLORS.red }]} />
                    </TouchableOpacity>
                ) : null}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        height: 88,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.grayscale200,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        height: 26,
        width: 26,
    },
    iconBadge: {
        height: 42,
        width: 42,
        borderRadius: 12,
        backgroundColor: COLORS.black,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    title: {
        fontSize: 18,
        fontFamily: 'bold',
        color: COLORS.greyscale900,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'medium',
        marginTop: 5,
    },
    accountLine: {
        fontSize: 14,
        fontFamily: 'medium',
        marginTop: 5,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    connectedTitle: {
        fontSize: 14,
        fontFamily: 'semiBold',
        color: COLORS.primary,
    },
    actionIcon: { height: 18, width: 18, tintColor: COLORS.red },
});

export default PaymentMethodItemConnected;
