import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

interface ShippingItemProps {
    checked: boolean;
    name: string;
    arrivalDate: string;
    onPress: () => void;
    icon: any; // Replace 'any' with the appropriate type for the icon source if known
    price: number; // Assuming price is a number
}

const ShippingItem: React.FC<ShippingItemProps> = ({
    checked,
    name,
    arrivalDate,
    onPress,
    icon,
    price
}) => {
    const { dark } = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.container, {
                backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                borderColor: checked ? COLORS.black : (dark ? COLORS.grayscale200 : COLORS.grayscale200),
            }]}>
            <View style={styles.routeLeftContainer}>
                <View style={styles.locationIcon1}>
                    <View style={styles.locationIcon2}>
                        <Image
                            source={icon}
                            resizeMode='contain'
                            style={styles.locationIcon3}
                        />
                    </View>
                </View>
                <View>
                    <Text style={[styles.routeName, {
                        color: dark ? COLORS.white : COLORS.greyscale900
                    }]}>{name}</Text>
                    <Text style={[styles.routeAddress, {
                        color: dark ? COLORS.grayscale200 : COLORS.grayscale700
                    }]}>Estimated Arrival, {arrivalDate}</Text>
                    <Text style={[styles.price, { 
                        color: dark ? COLORS.white : COLORS.greyscale900,
                    }]}>PKR {price.toFixed(0)}</Text>
                </View>
            </View>
            <View style={styles.leftContainer}>
                <TouchableOpacity style={{ marginLeft: 8 }}>
                    <View style={[styles.roundedChecked, { 
                        borderColor: checked ? COLORS.black : (dark ? COLORS.white : COLORS.primary),
                    }]}>
                        {checked && <View style={[styles.roundedCheckedCheck, { 
                            backgroundColor: COLORS.black,
                        }]} />}
                    </View>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SIZES.width - 32,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 12,
        alignItems: 'center',
        marginVertical: 12,
        borderWidth: 1,
        borderColor: COLORS.grayscale200,
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    routeLeftContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    locationIcon1: {
        height: 52,
        width: 52,
        borderRadius: 999,
        marginRight: 12,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    locationIcon2: {
        height: 36,
        width: 36,
        borderRadius: 999,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    locationIcon3: {
        height: 20,
        width: 20,
        tintColor: COLORS.white
    },
    routeName: {
        fontSize: 18,
        color: COLORS.greyscale900,
        fontFamily: "bold",
        marginBottom: 6
    },
    routeAddress: {
        fontSize: 13,
        color: COLORS.grayscale700,
        fontFamily: "regular"
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roundedChecked: {
        width: 20,
        height: 20,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: COLORS.black,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 0,
    },
    roundedCheckedCheck: {
        height: 10,
        width: 10,
        backgroundColor: COLORS.primary,
        borderRadius: 999,
    },
    price: {
        fontSize: 16,
        fontFamily: "semiBold",
        color: COLORS.greyscale900,
        marginTop: 8,
    }
});

export default ShippingItem;
