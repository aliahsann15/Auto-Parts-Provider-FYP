import React from 'react';
import { TouchableOpacity, StyleSheet, Image, ImageSourcePropType, Text, View } from 'react-native';
import { COLORS } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

interface SocialButtonProps {
    icon: ImageSourcePropType;
    onPress: () => void;
    tintColor?: string;
    disabled?: boolean;
}

const SocialButton: React.FC<SocialButtonProps> = ({ icon, onPress, tintColor, disabled }) => {
    const { dark } = useTheme();

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[
                styles.container,
                {
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    borderColor: dark ? COLORS.dark2 : COLORS.grayscale200,
                    opacity: disabled ? 0.6 : 1,
                },
            ]}
        >
            <View style={styles.content}>
                <Image
                    source={icon}
                    resizeMode="contain"
                    style={[styles.icon, { tintColor }]}
                />
                <Text style={styles.googletext}>Sign in with Google</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderColor: COLORS.grayscale200,
        borderWidth: 1,
        marginHorizontal: 8,
        flexDirection: 'row',
        gap: 12,
    },
    googletext:{
        fontSize: 16,
        fontFamily: "medium",
        color: COLORS.primary
    },

    icon: {
        height: 24,
        width: 24,
    },
    content:{
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    }
});

export default SocialButton;
