import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ImageSourcePropType, GestureResponderEvent } from 'react-native';
import { COLORS, SIZES, icons } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';

interface HeaderWithSearchProps {
    title: string;
    icon?: ImageSourcePropType;
    avatarUri?: string;
    avatarFallbackText?: string;
    onPress?: (event: GestureResponderEvent) => void;
    rightActionLabel?: string;
    onRightAction?: () => void;
    onBackPress?: () => void;
}

const HeaderWithSearch: React.FC<HeaderWithSearchProps> = ({ title, icon, avatarUri, avatarFallbackText, onPress, rightActionLabel, onRightAction, onBackPress }) => {
    const navigation = useNavigation<NavigationProp<any>>();
    const { dark } = useTheme();

    return (
    <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onBackPress ? onBackPress : () => navigation.goBack()}>
                <Image
                    source={icons.back}
                    resizeMode="contain"
                        style={[
                            styles.backIcon,
                            { tintColor: dark ? COLORS.white : COLORS.greyscale900 }
                        ]}
                />
            </TouchableOpacity>
            {(avatarUri || avatarFallbackText) ? (
                <View style={styles.avatarContainer}>
                    {avatarUri ? (
                        <Image
                            source={{ uri: avatarUri }}
                            style={styles.avatar}
                            resizeMode="cover"
                        />
                    ) : (
                        <Text style={styles.avatarFallback}>{(avatarFallbackText || 'S').charAt(0).toUpperCase()}</Text>
                    )}
                </View>
            ) : null}
            <Text style={[
                styles.headerTitle,
                { color: dark ? COLORS.white : COLORS.greyscale900 }
            ]}>
                {title}
            </Text>
        </View>
            {icon ? (
                <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Image
                        source={icon}
                        resizeMode="contain"
                        style={[
                            styles.moreIcon,
                            { tintColor: dark ? COLORS.white : COLORS.greyscale900 }
                        ]}
                    />
                </TouchableOpacity>
            ) : rightActionLabel ? (
                <TouchableOpacity onPress={onRightAction} style={styles.actionBtn}>
                    <Text style={[styles.actionText, { color: dark ? COLORS.white : COLORS.primary }]}>{rightActionLabel}</Text>
                </TouchableOpacity>
            ) : (
                <View style={{ width: 24, height: 24 }} />
            )}
        </View>
    );
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
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        width: '100%',
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    backIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.black,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'bold',
        color: COLORS.black,
        marginLeft: 8,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.grayscale200,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarFallback: {
        fontFamily: 'semiBold',
        fontSize: 18,
        color: COLORS.grayscale800,
    },
    moreIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.black
    },
    actionBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    actionText: {
        fontFamily: 'medium',
        fontSize: 14,
        color: COLORS.primary,
    },
    searchBarContainer: {
        width: SIZES.width - 32,
        backgroundColor: COLORS.secondaryWhite,
        padding: 16,
        borderRadius: 12,
        height: 52,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center"
    },
    searchIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.gray
    }
});

export default HeaderWithSearch;
