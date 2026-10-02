import { View, StyleSheet, FlatList, ActivityIndicator, Alert, Text } from 'react-native';
import React, { useState } from 'react';
import { COLORS, SIZES } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { ScrollView } from 'react-native-virtualized-view';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import UserAddressItem from '@/components/UserAddressItem';
import { useNavigation } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAddresses, deleteAddress, Address } from '@/utils/api/addresses';
import { fetchMyStore } from '@/utils/api/store';
import { useAuth } from './context/AuthContext';

type Nav = {
    navigate: (value: string, params?: any) => void
};

// User address location
const AddressScreen = () => {
    const { navigate } = useNavigation<Nav>();
    const { colors, dark } = useTheme();
    const { token, isLoggedIn, user } = useAuth();
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(false);
    const isSeller = user?.role === 'Seller';

    const loadAddresses = async () => {
        if (!token) {
            setAddresses([]);
            return;
        }
        setLoading(true);
        try {
            if (isSeller) {
                const res = await fetchMyStore(token);
                setAddresses(res.store?.addresses as any || []);
            } else {
                const res = await fetchAddresses(token);
                setAddresses(res.addresses || []);
            }
        } catch (err) {
            setAddresses([]);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadAddresses();
        }, [token, isLoggedIn])
    );

    const handleDelete = async (idx: number) => {
        if (isSeller) {
            Alert.alert('Address locked', 'Store address can be set during registration only.');
            return;
        }
        if (!token) {
            Alert.alert('Login required', 'Please sign in to manage addresses.');
            return;
        }
        Alert.alert('Delete address?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteAddress(idx, token);
                        loadAddresses();
                    } catch (err: any) {
                        Alert.alert('Failed', err?.message || 'Could not delete address.');
                    }
                }
            }
        ]);
    };

    const handleEdit = (addr: Address, idx: number) => {
        if (isSeller) {
            Alert.alert('Address locked', 'Store address can be set during registration only.');
            return;
        }
        navigate("addnewaddress", { data: JSON.stringify({ ...addr, idx }) } as any);
    };

    const headerTitle = isSeller ? 'Store Address' : 'Address';

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title={headerTitle} />
                <ScrollView
                    contentContainerStyle={{ marginVertical: 12 }}
                    showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
                    ) : addresses.length === 0 ? (
                        <Text style={{ color: dark ? COLORS.white : COLORS.greyscale900, paddingVertical: 12 }}>
                            {isSeller ? 'No store address on file.' : 'No saved addresses yet.'}
                        </Text>
                    ) : (
                        <FlatList
                            data={addresses}
                            keyExtractor={(_, idx) => String(idx)}
                            renderItem={({ item, index }) => {
                                const primaryLine = item.fullAddress || item.street || item.city || 'Address';
                                const secondaryLine = [
                                  item.street && item.fullAddress ? '' : item.street,
                                  item.city,
                                  (item as any).province,
                                  item.postalCode,
                                ]
                                .filter(Boolean)
                                .join(', ');
                                const isStoreAddr = isSeller;
                                return (
                                    <UserAddressItem
                                        name={primaryLine}
                                        address={secondaryLine || primaryLine}
                                        onPress={() => {}}
                                        onDelete={!isStoreAddr ? () => handleDelete(index) : undefined}
                                        onEdit={!isStoreAddr ? () => handleEdit(item, index) : undefined}
                                    />
                                );
                            }}
                        />
                    )}
                </ScrollView>
            </View>
            <View style={styles.btnContainer}>
                {isSeller ? (
                    <ButtonFilled
                        title="Edit Address"
                        onPress={() => {
                            const existing = addresses?.[0];
                            navigate("addnewaddress", existing ? { data: JSON.stringify({ ...existing, idx: 0 }) } as any : undefined);
                        }}
                        style={styles.btn}
                    />
                ) : (
                    <ButtonFilled
                        title="Add New Address"
                        onPress={() => navigate("addnewaddress")}
                        style={styles.btn}
                    />
                )}
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
    },
    btnContainer: {
        alignItems: "center"
    },
    btn: {
        width: SIZES.width - 32,
        paddingHorizontal: 16,
    }
})

export default AddressScreen
