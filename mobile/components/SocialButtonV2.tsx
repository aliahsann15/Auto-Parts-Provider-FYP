import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Image, ImageSourcePropType, StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

interface SocialButtonV2Props {
    title: string;
    icon: ImageSourcePropType;
    onPress: () => void;
    iconStyles?: StyleProp<ImageStyle>;
}

const SocialButtonV2: React.FC<SocialButtonV2Props> = ({ title, icon, onPress, iconStyles }) => {
    const { dark } = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.container,
                {
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    borderColor: dark ? COLORS.dark2 : 'gray',
                },
            ]}
        >
            <Image
                source={icon}
                resizeMode="contain"
                style={[styles.icon, iconStyles]}
            />
            <Text
                style={[
                    styles.title,
                    {
                        color: dark ? COLORS.white : COLORS.black,
                    },
                ]}
            >
                {title}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SIZES.width - 32,
        height: 54,
        alignItems: 'center',
        paddingHorizontal: 22,
        borderRadius: 16,
        borderColor: 'gray',
        borderWidth: 1,
        flexDirection: 'row',
        marginTop: 12,
    },
    icon: {
        height: 24,
        width: 24,
        marginRight: 32,
    },
    title: {
        fontSize: 14,
        fontFamily: 'semiBold',
        color: COLORS.black,
    },
});

export default SocialButtonV2;