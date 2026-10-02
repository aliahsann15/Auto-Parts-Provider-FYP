import { View, StyleSheet, FlatList } from 'react-native';
import React from 'react';
import { COLORS } from '../constants';
import Header from '../components/Header';
import { SafeAreaView } from 'react-native-safe-area-context';
import { transactionHistory } from '../data';
import TransactionHistoryItem from '../components/TransactionHistoryItem';
import { ScrollView } from 'react-native-virtualized-view';
import { useTheme } from '../theme/ThemeProvider';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';

// Transactions history
const TransactionHistory = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const { colors } = useTheme();

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Transaction History" />
                <ScrollView
                    contentContainerStyle={{ marginVertical: 16 }}
                    showsVerticalScrollIndicator={false}>
                    <FlatList
                        data={transactionHistory}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TransactionHistoryItem
                                image={item.image}
                                name={item.name}
                                date={item.date}
                                type={item.type}
                                amount={item.amount}
                                onPress={() => navigation.navigate("topupereceipt")}
                            />
                        )}
                    />
                </ScrollView>
            </View>
        </SafeAreaView>
    )
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
    }
})

export default TransactionHistory