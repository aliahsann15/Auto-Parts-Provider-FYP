import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType, GestureResponderEvent } from 'react-native';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

interface CategoryProps {
    name: string;
    icon: ImageSourcePropType;
    onPress?: () => void;
    columns?: number;
}

const Category: React.FC<CategoryProps> = ({ name, icon, onPress, columns = 4 }) => {
    const { dark } = useTheme();
    const itemWidth = (SIZES.width - 32) / columns;

    return (
        <View style={[styles.container, { width: itemWidth }]}>
            <TouchableOpacity
                onPress={onPress}
                style={[
                    styles.iconContainer,
                    { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }
                ]}>
                <Image
                    source={icon}
                    resizeMode="contain"
                    style={[
                        styles.icon,
                        { tintColor: dark ? COLORS.white : COLORS.greyscale900 }
                    ]}
                />
            </TouchableOpacity>
            <Text style={[
                styles.name,
                { color: dark ? COLORS.white : COLORS.greyscale900 }
            ]}>
                {name}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "column",
        alignItems: "center",
        marginBottom: 12
    },
    iconContainer: {
        width: 54,
        height: 54,
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8
    },
    icon: {
        height: 24,
        width: 24
    },
    name: {
        fontSize: 14,
        fontFamily: "medium",
        color: COLORS.black
    }
});

export default Category;
