import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { COLORS, SIZES, icons } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

type UserAddressItemProps = {
    name: string;
    address: string;
    onPress: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
};

const UserAddressItem: React.FC<UserAddressItemProps> = ({ name, address, onPress, onDelete, onEdit }) => {
    const { dark } = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.container,
                { borderColor: dark ? COLORS.greyscale900 : COLORS.grayscale100 },
            ]}>
            <View style={styles.routeLeftContainer}>
                <View style={styles.locationIcon1}>
                    <View style={[styles.locationIcon2, { 
                        backgroundColor: dark ? COLORS.white : COLORS.primary,
                    }]}>
                        <Image
                            source={icons.location2}
                            resizeMode="contain"
                            style={[styles.locationIcon3, { 
                                tintColor: dark ? COLORS.primary : COLORS.white,
                            }]}
                        />
                    </View>
                </View>
                <View>
                    <Text
                        style={[
                            styles.routeName,
                            { color: dark ? COLORS.white : COLORS.greyscale900 },
                        ]}>
                        {name}
                    </Text>
                    <Text
                        style={[
                            styles.routeAddress,
                            { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 },
                        ]}
                    >
                        {address}
                    </Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {onDelete && (
                    <TouchableOpacity onPress={onDelete} style={{ marginRight: 12 }}>
                        <Image
                            source={icons.trash}
                            resizeMode="contain"
                            style={[
                                styles.editIcon,
                                { tintColor: dark ? COLORS.red : COLORS.red },
                            ]}
                        />
                    </TouchableOpacity>
                )}
                {onEdit && (
                    <TouchableOpacity onPress={onEdit}>
                        <Image
                            source={icons.editPencil}
                            resizeMode="contain"
                            style={[
                                styles.editIcon,
                                { tintColor: dark ? COLORS.white : COLORS.primary },
                            ]}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SIZES.width - 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.grayscale700,
        borderRadius: 8,
    },
    routeLeftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationIcon1: {
        height: 52,
        width: 52,
        borderRadius: 999,
        marginRight: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationIcon2: {
        height: 36,
        width: 36,
        borderRadius: 999,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationIcon3: {
        height: 16,
        width: 16,
        tintColor: COLORS.white,
    },
    routeName: {
        fontSize: 18,
        color: COLORS.greyscale900,
        fontFamily: 'bold',
        marginBottom: 6,
    },
    routeAddress: {
        fontSize: 12,
        color: COLORS.grayscale700,
        fontFamily: 'regular',
    },
    editIcon: {
        height: 20,
        width: 20,
        tintColor: COLORS.primary,
    },
});

export default UserAddressItem;
