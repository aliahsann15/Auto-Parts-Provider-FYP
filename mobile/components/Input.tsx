import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Image, TextInputProps, NativeSyntheticEvent, TextInputFocusEventData } from 'react-native';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

interface InputProps extends TextInputProps {
    id: string;
    icon?: any;
    placeholderTextColor?: string;
    errorText?: string | string[];
    value?: string;
    onInputChanged: (id: string, text: string) => void;
    inputContainerStyle?: any;
    inputStyle?: any;
}

const Input: React.FC<InputProps> = (props) => {
    const [isFocused, setIsFocused] = useState(false);
    const { dark } = useTheme();
    const isDisabled = props.editable === false;

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocused(false);
        if (props.onBlur) {
            props.onBlur(event);
        }
    };

    const onChangeText = (text: string) => {
        props.onInputChanged(props.id, text);
    };

    return (
        <View style={[styles.container]}>
            <View
                style={[
                    styles.inputContainer,
                    {
                        borderWidth: isDisabled ? 0 : 1,
                        borderColor: isDisabled
                            ? dark ? COLORS.dark3 : COLORS.greyscale300
                            : isFocused
                                ? dark ? COLORS.primary100 : COLORS.primary
                                : dark ? COLORS.grayscale400 : COLORS.greyscale300,
                        backgroundColor: isDisabled
                            ? dark ? COLORS.dark3 : COLORS.grayscale200
                            : isFocused
                                ? COLORS.tansparentPrimary
                                : dark ? COLORS.dark2 : COLORS.grayscale200,
                    },
                    props.inputContainerStyle,
                ]}
            >
                {props.icon && (
                    <Image
                        source={props.icon}
                        style={[
                            styles.icon,
                            {
                                tintColor: isFocused
                                    ? dark ? COLORS.white : COLORS.primary
                                    : '#BCBCBC',
                            },
                        ]}
                    />
                )}
                <TextInput
                    {...props}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    value={props.value}
                    style={[
                        styles.input,
                        {
                            color: isDisabled ? (dark ? COLORS.grayscale400 : COLORS.grayscale700) : dark ? COLORS.white : COLORS.black
                        },
                        props.inputStyle,
                    ]}
                    placeholder={props.placeholder}
                    placeholderTextColor={props.placeholderTextColor ?? (dark ? COLORS.grayscale400 : COLORS.greyscale500)}
                    autoCapitalize="none"
                />
            </View>
            {props.errorText && (Array.isArray(props.errorText) ? props.errorText.length > 0 : props.errorText.length > 0) && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{Array.isArray(props.errorText) ? props.errorText.join(', ') : props.errorText}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    inputContainer: {
        width: '100%',
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.padding2,
        borderRadius: 12,
        borderWidth: 1,
      marginVertical: 5,
        flexDirection: 'row',
        height: 52,
        alignItems: 'center',
    },
    icon: {
        marginRight: 10,
        height: 20,
        width: 20,
        tintColor: '#BCBCBC',
    },
    input: {
        color: COLORS.black,
        flex: 1,
        fontFamily: 'regular',
        fontSize: 14,
        paddingTop: 0,
    },
    errorContainer: {
        marginVertical: 4,
    },
    errorText: {
        color: 'red',
        fontSize: 12,
    },
});

export default Input;
