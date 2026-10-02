import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ImageSourcePropType, GestureResponderEvent } from 'react-native';
import { COLORS, SIZES } from '../constants';
import { getTimeAgo } from '../utils/date';
import { useTheme } from '../theme/ThemeProvider';

interface NotificationCardProps {
    icon: ImageSourcePropType;
    title: string;
    description: string;
    date: Date | string;
    onPress: (event: GestureResponderEvent) => void;
    footer?: React.ReactNode;
    disabled?: boolean;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ icon, title, description, date, onPress, footer, disabled = false }) => {
    const { dark } = useTheme();

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.row, disabled ? styles.disabledRow : null]}
                onPress={onPress}
                activeOpacity={0.8}
                disabled={disabled}
            >
                <View style={styles.leftContainer}>
                    <View style={styles.iconContainer}>
                        <Image
                            source={icon}
                            resizeMode="cover"
                            style={styles.icon}
                        />
                    </View>
                    <View style={{ flex: 0.95 }}>
                        <Text style={[
                            styles.title,
                            { color: dark ? COLORS.white : COLORS.greyscale900 }
                        ]}>
                            {title}
                        </Text>
                        <Text style={[styles.description, disabled ? styles.disabledText : null]}>
                            {description}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.date, disabled ? styles.disabledText : null]}>{getTimeAgo(date)}</Text>
            </TouchableOpacity>
            {footer ? <View style={{ marginTop: 6 }}>{footer}</View> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
        width: SIZES.width - 32,
        borderWidth: 1,
        borderColor: COLORS.grayscale200,
        borderRadius: 12,
        padding: 12,
        backgroundColor: COLORS.white,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: 'center'
    },
    leftContainer: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1
    },
    iconContainer: {
        height: 44,
        width: 44,
        backgroundColor: COLORS.black,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        marginRight: 12
    },
    icon: {
        width: 22,
        height: 22,
        tintColor: COLORS.white
    },
    title: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.black,
        marginBottom: 6
    },
    description: {
        fontSize: 14,
        fontFamily: "regular",
        color: "gray",
    },
    date: {
        fontSize: 12,
        fontFamily: "regular",
        color: "gray",
    },
    disabledRow: {
        opacity: 0.6,
    },
    disabledText: {
        color: COLORS.gray3,
    }
});

export default NotificationCard;
