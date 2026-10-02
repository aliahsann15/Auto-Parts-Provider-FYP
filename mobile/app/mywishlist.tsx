import { View, Text, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import React, { useCallback } from 'react';
import { COLORS, icons, images as imageAssets } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-virtualized-view';
import { useTheme } from '../theme/ThemeProvider';
import HeaderWithSearch from '@/components/HeaderWithSearch';
import WishlistCard from '@/components/WishlistCard';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import useWishlist from '@/hooks/useWishlist';
import { API_BASE_URL } from '@/utils/api/client';
import { useAuth } from './context/AuthContext';

const MyWishlist = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const { dark, colors } = useTheme();
    const { isLoggedIn } = useAuth();
    const { items, isLoading, isUpdatingId, toggle, refresh, isInWishlist } = useWishlist();
    const apiBase = API_BASE_URL.replace(/\/api$/, '');

    const handleToggle = useCallback(async (productId: string) => {
        try {
            await toggle(productId);
        } catch (err: any) {
            Alert.alert('Login required', err?.message || 'Please sign in to manage your wishlist.');
        }
    }, [toggle]);

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <HeaderWithSearch
                    title="My Wishlist"
                    icon={icons.search}
                    onPress={() => navigation.navigate("search")}
                />
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.primary} />
                    }>
                    {!isLoggedIn ? (
                        <Text style={{ color: dark ? COLORS.white : COLORS.black, paddingVertical: 16 }}>
                            Please sign in to view your wishlist.
                        </Text>
                    ) : items.length === 0 && !isLoading ? (
                        <Text style={{ color: dark ? COLORS.white : COLORS.black, paddingVertical: 16 }}>
                            Your wishlist is empty.
                        </Text>
                    ) : (
                        <View style={{
                            backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                            marginVertical: 16
                        }}>
                            <FlatList
                                data={items}
                                keyExtractor={(item) => item._id}
                                numColumns={2}
                                columnWrapperStyle={{ gap: 16 }}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => {
                                    const firstImage = item.images?.[0];
                                    const resolvedImage =
                                        firstImage?.startsWith?.('http')
                                            ? firstImage
                                            : firstImage
                                                ? `${apiBase}${firstImage}`
                                                : imageAssets.store;
                                    const rating = item.reviews && item.reviews.length ? item.reviews[0].rating : 4.8;
                                    return (
                                        <WishlistCard
                                            name={item.name}
                                            image={resolvedImage}
                                            numSolds={(item as any)?.itemsSold ?? item.stock ?? 0}
                                            rating={rating}
                                            price={item.salePrice ?? item.price}
                                            onPress={() => navigation.navigate("cardetails", { id: item._id })}
                                            isWishlisted={isInWishlist(item._id)}
                                            wishlistLoading={isUpdatingId === item._id}
                                            onToggleWishlist={() => handleToggle(item._id)}
                                        />
                                    )
                                }}
                            />
                        </View>
                    )}
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
    },
    scrollView: {
        marginVertical: 2
    }
})

export default MyWishlist
