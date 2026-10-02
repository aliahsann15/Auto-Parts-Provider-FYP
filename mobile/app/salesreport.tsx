import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet, ScrollView, Image, SafeAreaView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { format, subDays } from 'date-fns';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useTheme } from '@react-navigation/native';
import { COLORS, FONTS, icons, SIZES } from '@/constants';
import { darkColors } from '@/theme/colors';
import { router } from 'expo-router';
import { fetchSellerOrders } from '@/utils/api/orders';
import { useAuth } from './context/AuthContext';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export default function SalesReportChart() {
    const { token } = useAuth();
    const [filter, setFilter] = useState<'today' | '7days' | '30days' | 'custom'>('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);
     const [selectedPoint, setSelectedPoint] = useState<{
        value: number;
        label: string;
        x: number;
        y: number;
      } | null>(null);
    const [salesData, setSalesData] = useState<{ date: string; sales: number }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const res = await fetchSellerOrders(token);
                const orders = (res.orders || res.data || []) as any[];
                const dailyMap = new Map<string, number>();
                orders.forEach((order) => {
                    const created = order.createdAt ? new Date(order.createdAt) : new Date();
                    const dayKey = created.toISOString().split('T')[0]; // YYYY-MM-DD
                    const items = order.items || [];
                    const orderTotal = items.reduce((sum: number, it: any) => {
                        const unit = typeof it.salePrice === 'number' ? it.salePrice : it.price || 0;
                        const qty = it.quantity || 1;
                        return sum + unit * qty;
                    }, 0);
                    const prev = dailyMap.get(dayKey) || 0;
                    dailyMap.set(dayKey, prev + orderTotal);
                });
                const aggregated = Array.from(dailyMap.entries()).map(([date, sales]) => ({ date, sales }));
                aggregated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setSalesData(aggregated);
            } catch (err: any) {
                console.warn('Failed to load sales', err?.message || err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    const handleConfirm = (date: Date) => {
        const iso = date.toISOString().split('T')[0];
        if (showPicker === 'start') setCustomStart(iso);
        else if (showPicker === 'end') setCustomEnd(iso);
        setShowPicker(null);
    };

    const filteredData = useMemo(() => {
        const now = new Date();
        let result: { date: string; sales: number }[] = [];

        if (filter === 'today') {
            const start = new Date(now);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);
            result = salesData.filter(item => {
                const dt = new Date(item.date);
                return dt >= start && dt <= end;
            });
        } else if (filter === '7days') {
            const start = subDays(now, 7);
            result = salesData.filter(item => new Date(item.date) >= start);
        } else if (filter === '30days') {
            const start = subDays(now, 30);
            result = salesData.filter(item => new Date(item.date) >= start);
        } else if (filter === 'custom' && customStart && customEnd) {
            if (!isNaN(Date.parse(customStart)) && !isNaN(Date.parse(customEnd))) {
                const start = new Date(customStart);
                const end = new Date(customEnd);
                result = salesData.filter(item => {
                    const date = new Date(item.date);
                    return date >= start && date <= end;
                });
            }
        } else {
            result = salesData;
        }

        return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filter, customStart, customEnd, salesData]);

    const totalSales = useMemo(() => filteredData.reduce((sum, item) => sum + item.sales, 0), [filteredData]);

    const chartLabels = filteredData.length > 0
        ? filteredData.map(item => format(new Date(item.date), 'MMM d'))
        : ['No Data'];

    const chartData = filteredData.length > 0
        ? filteredData.map(item => item.sales)
        : [0];

    const chartWidth = Math.max(chartLabels.length * 60, screenWidth);

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
                    Sales Report
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.area}>
            <View style={styles.container}>
                {renderHeader()}
                <ScrollView >

                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>TOTAL SALES</Text>
                        <Text style={styles.totalAmount}>PKR {totalSales.toLocaleString()}</Text>
                    </View>


                    <View style={styles.buttonContainer}>
                        {['today', '7days', '30days', 'custom'].map(key => (
                            <TouchableOpacity
                                key={key}
                                style={[styles.button, filter === key && styles.activeButton]}
                                onPress={() => setFilter(key as any)}
                            >
                                <Text style={[styles.buttonText, filter === key && styles.activeButtonText]}>
                                    {key === 'today'
                                        ? 'Today'
                                        : key === '7days'
                                        ? 'Last 7 Days'
                                        : key === '30days'
                                        ? 'Last 30 Days'
                                        : 'Custom Range'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {filter === 'custom' && (
                        <View style={styles.customInputContainer}>
                            <TouchableOpacity onPress={() => setShowPicker('start')} style={styles.dateButton}>
                                <Text style={styles.dateButtonText}>{customStart || 'Select Start Date'}</Text>
                            </TouchableOpacity>
                            <Text style={styles.toText}>to</Text>
                            <TouchableOpacity onPress={() => setShowPicker('end')} style={styles.dateButton}>
                                <Text style={styles.dateButtonText}>{customEnd || 'Select End Date'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <DateTimePickerModal
                        isVisible={showPicker !== null}
                        mode="date"
                        onConfirm={handleConfirm}
                        onCancel={() => setShowPicker(null)}
                    />



                    {loading ? (
                        <Text style={{ fontFamily: 'regular', fontSize: 14, color: 'gray', marginTop: 32 }}>
                            Loading...
                        </Text>
                    ) : filteredData.length > 0 ? (
                         <ScrollView style={{ maxHeight: screenHeight * 0.6 }} nestedScrollEnabled>
                           <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                             <View>
                               <LineChart
                                 data={{
                                   labels: chartLabels,
                                   datasets: [{ data: chartData }],
                                 }}
                                 width={chartWidth}
                                 height={screenHeight * 0.35}
                                 yAxisLabel=""
                                 fromZero
                                 chartConfig={{
                                   backgroundColor: '#fff',
                                   backgroundGradientFrom: '#fff',
                                   backgroundGradientTo: '#fff',
                                   decimalPlaces: 0,
                                   color: () => '#000',
                                   labelColor: () => '#000',
                                   style: { borderRadius: 16 },
                                   propsForDots: {
                                     r: '4',
                                     strokeWidth: '1',
                                     stroke: '#000',
                                   },
                                 }}
                                 bezier
                                 style={{ marginVertical: 20, borderRadius: 16 }}
                                 onDataPointClick={({ value, index, x, y }) =>
                                   setSelectedPoint({ value, label: chartLabels[index], x, y })
                                 }
                               />
                           
                               {/* Custom Tooltip */}
                               {selectedPoint && (
                                 (() => {
                                   const top = Math.max(selectedPoint.y - 48, 8);
                                   const left = Math.min(Math.max(selectedPoint.x - 20, 8), chartWidth - 80);
                                   return (
                                   <View
                                     style={{
                                       position: 'absolute',
                                       top,
                                       left,
                                       backgroundColor: '#000',
                                       padding: 6,
                                       borderRadius: 6,
                                     }}
                                   >
                                     <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'medium' }}>
                                       {selectedPoint.label}
                                     </Text>
                                     <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'bold' }}>
                                       {selectedPoint.value}
                                     </Text>
                                   </View>
                                   );
                                 })()
                               )}
                             </View>
                           </ScrollView>
                         </ScrollView>
                    ) : (
                        <Text style={{ fontFamily: 'regular', fontSize: 14, color: 'gray', marginTop: 32 }}>
                            No data available for the selected range.
                        </Text>
                    )}
                </ScrollView>
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
    title: {
        fontSize: 20,
        fontFamily: 'bold',
        marginBottom: 10,
        color: '#000',
    },
    total: {
        fontSize: 16,
        fontFamily: 'medium',
        color: '#000',
        marginBottom: 16,
    },
    buttonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 3,
        marginBottom: 10,
    },
    button: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#eee',
        borderRadius: 8,
    },
    activeButton: {
        backgroundColor: '#000',
    },
    buttonText: {
        color: '#000',
        fontFamily: 'regular',
        fontSize: 12,
    },
    activeButtonText: {
        color: '#fff',
    },
    customInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    dateButton: {
        borderWidth: 1,
        borderColor: '#000',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    dateButtonText: {
        fontFamily: 'regular',
        color: '#000',
        fontSize: 12,
    },
    toText: {
        fontFamily: 'medium',
        color: '#000',
    },
    totalBox: {
        backgroundColor: '#f2f2f2',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 32,
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },

    totalLabel: {
        fontFamily: 'medium',
        fontSize: 13,
        color: '#555',
        marginBottom: 4,
    },

    totalAmount: {
        fontFamily: 'bold',
        fontSize: 18,
        color: '#000',
    },

});
