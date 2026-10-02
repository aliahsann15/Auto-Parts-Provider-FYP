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

interface ButtonFilledProps {
    onPress: () => void;
    title: string;
    style?: StyleProp<ViewStyle>;
    isLoading?: boolean;
    disabled?: boolean;
    textColor?: string;
    fontFamily?: string;
    fontSize?: number;
}

const ButtonFilled: React.FC<ButtonFilledProps> = ({
    onPress,
    title,
    style,
    isLoading = false,
    disabled = false,
    textColor,
    fontFamily = 'regular',
    fontSize = 14,
}) => {
    const { dark } = useTheme();
    const labelColor = textColor || (dark ? COLORS.white : COLORS.white);

    return (
        <TouchableOpacity
            style={[
                styles.filledButton,
                {
                    backgroundColor: COLORS.black,
                    borderColor: dark ? COLORS.white : COLORS.black,
                    borderWidth: 1,
                },
                style,
            ]}
            onPress={onPress}
            disabled={disabled || isLoading}
        >
            {isLoading ? (
                <ActivityIndicator size="small" color={labelColor} />
            ) : (
                <Text
                    style={{
                        fontSize,
                        fontFamily,
                        color: labelColor,
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

export default ButtonFilled;
