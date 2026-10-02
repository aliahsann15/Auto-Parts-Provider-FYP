import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, Image, TouchableOpacity, SafeAreaView } from 'react-native';

import { COLORS, icons, SIZES } from '@/constants';
import { darkColors } from '@/theme/colors';
import { router } from 'expo-router';
import { fetchSellerOrders } from '@/utils/api/orders';
import { useAuth } from './context/AuthContext';

const { width } = Dimensions.get('window');

const renderHeader = () => (
    <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()}>
                <Image
                    source={icons.back}
                    resizeMode="contain"
                    style={[styles.backIcon, { tintColor: darkColors ? COLORS.primary : COLORS.greyscale900 }]}
                />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: darkColors ? COLORS.primary : COLORS.greyscale900 }]}>
                Best Selling Products
            </Text>
        </View>
    </View>
);

export default function BestSellingProductsScreen() {
    const { token } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const shortenName = (name: string) => {
        const safe = name || '';
        return safe.length > 18 ? `${safe.slice(0, 18)}...` : safe;
    };

    useEffect(() => {
        const load = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const res = await fetchSellerOrders(token);
                setOrders((res.orders || res.data || []) as any[]);
            } catch (err) {
                // ignore for now, show empty
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    const palette = ['#000000', '#1D4ED8', '#059669', '#DC2626', '#F59E0B', '#7C3AED', '#0EA5E9', '#D946EF', '#10B981', '#F97316'];

    const products = useMemo(() => {
        const map = new Map<string, { id: string; name: string; units: number; revenue: number }>();
        orders.forEach(order => {
            (order.items || []).forEach((it: any) => {
                const pid = String(it.product?._id || it.product || '');
                if (!pid) return;
                const name = it.product?.name || 'Product';
                const units = Number(it.quantity || 0);
                const unitPrice = typeof it.salePrice === 'number' ? it.salePrice : it.price || 0;
                const prev = map.get(pid) || { id: pid, name, units: 0, revenue: 0 };
                map.set(pid, {
                    id: pid,
                    name,
                    units: prev.units + units,
                    revenue: prev.revenue + units * unitPrice,
                });
            });
        });
        const list = Array.from(map.values());
        list.sort((a, b) => b.units - a.units);
        const totalUnits = list.reduce((sum, p) => sum + p.units, 0) || 1;
        return list.map((p, idx) => ({
            ...p,
            sales: Math.round((p.units / totalUnits) * 100),
            popularity: Math.round((p.units / totalUnits) * 100),
            color: palette[idx % palette.length],
        }));
    }, [orders, palette]);

    return (
        <SafeAreaView style={styles.area}>
            <View style={styles.container}>
                {renderHeader()}

                <FlatList
                    data={products}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.table}
                    ListHeaderComponent={() => (
                        <View style={styles.headerRow}>
                          <Text style={[styles.headerCell, styles.name]}>Product Name</Text>
                          <Text style={[styles.headerCell, styles.barContainer]}>Popularity</Text>
                          <Text style={[styles.headerCell, styles.salesHeader]}>Sales(%)</Text>
                        </View>
                      )}
                    ListEmptyComponent={
                        !loading ? (
                            <Text style={{ padding: 16, color: '#555', fontFamily: 'regular' }}>
                                No sales yet.
                            </Text>
                        ) : null
                    }
                    renderItem={({ item }) => (
                        <View style={styles.row}>
                            <Text style={[styles.cell, styles.name]} numberOfLines={1}>
                                {shortenName(item.name)}
                            </Text>

                            <View style={[styles.cell, styles.barContainer]}>
                                <View style={styles.barBackground}>
                                    <View
                                        style={[styles.barFill, { width: `${item.popularity}%`, backgroundColor: item.color }]}
                                    />
                                </View>
                            </View>

                            <Text style={[styles.cell, styles.sales, { color: item.color, borderColor: item.color }]}>
                                {item.sales}%
                            </Text>
                        </View>
                    )}
                />
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    area: { flex: 1, backgroundColor: COLORS.white },
    container: { flex: 1, padding: 16 },
    headerContainer: {
        flexDirection: 'row',
        width: SIZES.width - 32,
        justifyContent: 'space-between',
        paddingBottom: 32,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.black,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'bold',
        color: COLORS.black,
        marginLeft: 16,
    },
    table: {
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingBottom: 8,
   
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: '#E5E7EB',
        paddingVertical: 20,
        paddingHorizontal: 10,
 
    },
    cell: {
        fontSize: 13,
        fontFamily: 'regular',
        color: '#000',
        flex: 1,
    },
    name: {
        flex: 1.3,
    },
    barContainer: {
        flex: 1.9,
        marginRight: 8,
    },
    barBackground: {
        backgroundColor: '#E5E7EB',
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        
    },
    barFill: {
        height: 6,
        borderRadius: 3,
    },
    sales: {
        flex: 0.5,
        textAlign: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        fontSize: 12,
        fontFamily: 'medium',
    },
    headerRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: '#000',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
      },
      
      headerCell: {
        color: '#fff',
        fontSize: 12,
        fontFamily: 'medium',
        flex: 1,
      },
      salesHeader: {
        flex: 0.6,
        textAlign: 'center',
      },
      // You can reuse styles.name, styles.barContainer, styles.sales for consistent width
      
});
