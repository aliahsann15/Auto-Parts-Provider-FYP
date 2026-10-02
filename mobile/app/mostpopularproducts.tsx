import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { COLORS, icons } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-virtualized-view';
import { useTheme } from '../theme/ThemeProvider';
import { categoriesByParts } from '../data';
import ProductCard from '../components/ProductCard';
import HeaderWithSearch from '../components/HeaderWithSearch';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { fetchPublicProducts, fetchCategories, Product as ApiProduct, Category as ApiCategory } from '@/utils/api/products';
import { API_BASE_URL } from '@/utils/api/client';
import useWishlist from '@/hooks/useWishlist';

const MostPopularProducts = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const { dark, colors } = useTheme();
    const [selectedCategories, setSelectedCategories] = useState(["0"]);
    const [products, setProducts] = useState<ApiProduct[]>([]);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const { isInWishlist, toggle: toggleWishlist, isUpdatingId } = useWishlist();

    useEffect(() => {
        const buildCategoryList = (apiCats: { id: string; name: string }[], prods: ApiProduct[]) => {
            const derived = Array.from(
                new Set(
                    prods.flatMap((p: any) =>
                        (p?.categories || []).map((c: any) => {
                            if (!c) return '';
                            if (typeof c === 'object') return c._id || c.id || c.name || '';
                            return c;
                        })
                    )
                )
            )
                .filter(Boolean)
                .map((id, idx) => ({
                    id: String(id),
                    name:
                        apiCats.find(c => c.id === String(id))?.name ||
                        String(id) ||
                        `Category ${idx + 1}`,
                }));

            const merged = [...apiCats];
            derived.forEach(d => {
                if (!merged.find(c => c.id === d.id)) merged.push(d);
            });
            return [{ id: '0', name: 'All' }, ...merged];
        };

        const load = async () => {
            try {
                setLoading(true);
                const [prodRes, catRes] = await Promise.all([
                    fetchPublicProducts({ limit: 200, sort: 'popular' }),
                    fetchCategories()
                ]);
                const prods = (prodRes as any).products || [];
                setProducts(prods);
                const apiCats = (catRes || []).map((c: ApiCategory) => ({ id: c._id, name: c.name }));
                const combinedCats =
                    (apiCats && apiCats.length) || (prods && prods.length)
                        ? buildCategoryList(apiCats, prods)
                        : [{ id: '0', name: 'All' }, ...categoriesByParts.map(c => ({ id: c.id, name: c.name }))];
                setCategories(combinedCats);
            } catch (err) {
                setCategories([{ id: "0", name: "All" }, ...categoriesByParts.map(c => ({ id: c.id, name: c.name }))]);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const normalizeCategoryIds = (cats: any[] | undefined) => {
        return (cats || [])
            .map(c => {
                if (!c) return '';
                if (typeof c === 'string') return c;
                if (typeof c === 'object') {
                    return c._id || c.id || c.slug || c.name || '';
                }
                return String(c);
            })
            .filter(Boolean);
    };

    const filteredProducts = useMemo(() => {
        if (selectedCategories.includes("0")) return products;
        return products.filter(p => {
            const ids = normalizeCategoryIds((p as any).categories);
            return ids.some(id => selectedCategories.includes(String(id)));
        });
    }, [products, selectedCategories]);

    // Category item
    const renderCategoryItem = ({ item }: { item: { id: string; name: string } }) => (
        <TouchableOpacity
            style={{
                backgroundColor: selectedCategories.includes(item.id) ? dark ? COLORS.dark3 : COLORS.primary : "transparent",
                padding: 10,
                marginVertical: 5,
                borderColor: dark ? COLORS.dark3 : COLORS.primary,
                borderWidth: 1.3,
                borderRadius: 24,
                marginRight: 12,
            }}
            onPress={() => toggleCategory(item.id)}>
            <Text style={{
                color: selectedCategories.includes(item.id) ? COLORS.white : dark ? COLORS.white : COLORS.primary
            }}>{item.name}</Text>
        </TouchableOpacity>
    );

    // Toggle category selection
    const toggleCategory = (categoryId: string) => {
        setSelectedCategories(prev => {
            if (categoryId === "0") {
                return ["0"];
            }

            const withoutAll = prev.filter(id => id !== "0");
            if (withoutAll.includes(categoryId)) {
                const next = withoutAll.filter(id => id !== categoryId);
                return next.length ? next : ["0"];
            }

            return [...withoutAll, categoryId];
        });
    };

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <HeaderWithSearch
                    title="Top Categories"
                    icon={icons.search}
                    onPress={() => navigation.navigate("search")}
                />
                <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}>
                    <FlatList
                        data={categories.length ? categories : [{ id: "0", name: "All" }, ...categoriesByParts.map(c => ({ id: c.id, name: c.name }))]}
                        keyExtractor={(item, index) => `${item.id}-${index}`}
                        showsHorizontalScrollIndicator={false}
                        horizontal
                        renderItem={renderCategoryItem}
                    />
                    <View style={{
                        backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                        marginVertical: 16
                    }}>
                        {loading ? (
                            <Text style={{ color: dark ? COLORS.white : COLORS.black, paddingVertical: 12 }}>Loading products...</Text>
                        ) : (
                            <FlatList
                                data={filteredProducts}
                                keyExtractor={(item) => (item as any)._id || (item as any).id}
                                numColumns={2}
                                columnWrapperStyle={{ gap: 16 }}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => {
                                    const apiBase = API_BASE_URL.replace(/\/api$/, '');
                                    const firstImage = (item as any).images?.[0];
                                    const resolvedImage =
                                        firstImage?.startsWith?.('http')
                                            ? firstImage
                                            : firstImage
                                                ? `${apiBase}${firstImage}`
                                                : undefined;
                                    const rating =
                                        (item as any).averageRating ??
                                        ((item as any).reviews && (item as any).reviews.length
                                            ? (item as any).reviews.reduce((sum: number, r: any) => sum + (r?.rating || 0), 0) /
                                              (item as any).reviews.length
                                            : 0);
                                    return (
                                        <ProductCard
                                            name={(item as any).name}
                                            image={resolvedImage}
                                            numSolds={(item as any)?.itemsSold ?? (item as any)?.stock ?? 0}
                                            price={(item as any).price}
                                            salePrice={(item as any).salePrice}
                                            rating={Number.isFinite(rating) ? Number(rating.toFixed(1)) : 0}
                                            onPress={() => navigation.navigate("cardetails", { id: (item as any)._id || (item as any).id })}
                                            isWishlisted={isInWishlist((item as any)._id)}
                                            onToggleWishlist={async () => {
                                                await toggleWishlist((item as any)._id);
                                                navigation.navigate('mywishlist');
                                            }}
                                            wishlistLoading={isUpdatingId === (item as any)._id}
                                        />
                                    )
                                }}
                            />
                        )}
                    </View>
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
        marginBottom: 16
    }
})

export default MostPopularProducts
