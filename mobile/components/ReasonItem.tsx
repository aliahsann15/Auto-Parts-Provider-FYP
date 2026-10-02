import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

type ReasonItemProps = {
    checked: boolean; // Indicates if the item is checked
    onPress: () => void; // Callback function for the onPress event
    title: string; // Title of the reason item
};

const ReasonItem: React.FC<ReasonItemProps> = ({ checked, onPress, title }) => {
    const { dark } = useTheme();

    return (
        <TouchableOpacity onPress={onPress} style={styles.container}>
            <View style={styles.rightContainer}>
                <TouchableOpacity style={{ marginLeft: 8 }} onPress={onPress}>
                    <View
                        style={[
                            styles.checkItemContainer,
                            {
                                borderColor: dark ? COLORS.white : COLORS.primary,
                            },
                        ]}
                    >
                        {checked && (
                            <View
                                style={[
                                    styles.checkItem,
                                    {
                                        backgroundColor: dark ? COLORS.white : COLORS.primary,
                                    },
                                ]}
                            />
                        )}
                    </View>
                </TouchableOpacity>
                <View>
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
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingVertical: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 14,
        fontFamily: 'regular',
        color: COLORS.black,
    },
    checkItemContainer: {
        width: 20,
        height: 20,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    checkItem: {
        height: 10,
        width: 10,
        backgroundColor: COLORS.primary,
        borderRadius: 999,
    },
});

export default ReasonItem;