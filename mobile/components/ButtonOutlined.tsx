import React from 'react';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    StyleProp,
} from 'react-native';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

interface ButtonOutlinedProps {
    onPress: () => void;
    title: string;
    style?: StyleProp<ViewStyle>;
    isLoading?: boolean;
    disabled?: boolean;
}

const ButtonOutlined: React.FC<ButtonOutlinedProps> = ({
    onPress,
    title,
    style,
    isLoading = false,
    disabled = false,
}) => {
    const { dark } = useTheme();

    return (
        <TouchableOpacity
            style={[
                styles.filledButton,
                style,
                {
                    backgroundColor: 'transparent',
                    borderColor: dark ? COLORS.white : COLORS.primary,
                    opacity: disabled || isLoading ? 0.6 : 1,
                },
            ]}
            onPress={!disabled && !isLoading ? onPress : undefined}
            disabled={disabled || isLoading}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.black} />
            ) : (
                <Text
                    style={{
                        fontSize: 14,
                        fontFamily: 'semiBold',
                        color: COLORS.black,
                    }}
                >
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    filledButton: {
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.padding,
        borderColor: COLORS.primary,
        borderWidth: 1,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        backgroundColor: COLORS.primary,
    },
});

export default ButtonOutlined;
