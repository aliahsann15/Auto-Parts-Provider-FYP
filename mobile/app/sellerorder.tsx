import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions, Modal, TouchableWithoutFeedback, FlatList, ActivityIndicator, Alert, DeviceEventEmitter, RefreshControl } from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons, images, SIZES } from '@/constants';
import { useNavigation } from 'expo-router';
import { fetchSellerOrders, updateOrderStatus, OrderItem } from '@/utils/api/orders';
import { useAuth } from './context/AuthContext';
import { API_BASE_URL } from '@/utils/api/client';
import DateTimePickerModal from 'react-native-modal-datetime-picker';




const OrderRequests = () => {
    const navigation = useNavigation<NavigationProp<any>>();

    const layout = useWindowDimensions();
    const { dark, colors } = useTheme();
    const { token } = useAuth();
    const apiBase = API_BASE_URL.replace(/\/api$/, '');

    const [index, setIndex] = React.useState(0);
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusPickerOrder, setStatusPickerOrder] = useState<OrderItem | null>(null);
    const [savingStatus, setSavingStatus] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [statusFilterModal, setStatusFilterModal] = useState(false);
    const [dateFilter, setDateFilter] = useState<'all' | '7' | '30' | 'custom'>('all');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

    const statusOptions = useMemo<OrderItem['status'][]>(() => ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], []);

    const isCompleted = (status?: string) => {
        const val = (status || '').toLowerCase();
        return val === 'delivered' || val === 'completed';
    };

    const loadOrders = useCallback(async () => {
        if (!token) {
            setOrders([]);
            return;
        }
        setLoading(true);
        try {
            const res = await fetchSellerOrders(token);
            const raw = (res.orders || (res as any).data || []) as OrderItem[];
            const normalizedStatuses = raw.map(o => {
                const statusVal = (o.status as any)?.toLowerCase?.();
                const allowed: OrderItem['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
                const safeStatus = allowed.includes(statusVal as any) ? statusVal as OrderItem['status'] : 'pending';
                return { ...o, status: safeStatus };
            });
            setOrders(normalizedStatuses as OrderItem[]);
        } catch (err: any) {
            Alert.alert('Orders', err?.message || 'Could not load orders');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('orders:updated', () => {
      loadOrders();
    });
    return () => sub.remove();
  }, [loadOrders]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      loadOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadOrders, token]);

    useFocusEffect(
      useCallback(() => {
        loadOrders();
      }, [loadOrders])
    );
 
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await loadOrders();
        } finally {
            setRefreshing(false);
        }
    }, [loadOrders]);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const statusOk =
                statusFilter === 'all' ? true : (o.status || '').toLowerCase() === statusFilter;

            let dateOk = true;
            if (dateFilter === '7' || dateFilter === '30') {
                const days = dateFilter === '7' ? 7 : 30;
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - days);
                const created = o.createdAt ? new Date(o.createdAt) : new Date(0);
                dateOk = created >= cutoff;
            } else if (dateFilter === 'custom') {
                const created = o.createdAt ? new Date(o.createdAt) : new Date(0);
                if (!created) dateOk = false;
                if (startDate && created < startDate) dateOk = false;
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    if (created > end) dateOk = false;
                }
            }
            return statusOk && dateOk;
        });
    }, [orders, statusFilter, dateFilter, startDate, endDate]);

    const isStatusFinal = (status?: string) => ['cancelled', 'delivered'].includes((status || '').toLowerCase());

    const handleSelectStatus = async (order: OrderItem, newStatus: OrderItem['status']) => {
        if (!token) return;
        if (isStatusFinal(order.status)) {
            Alert.alert('Status locked', 'This order status cannot be changed anymore.');
            setStatusPickerOrder(null);
            return;
        }
        const isCancel = newStatus.toLowerCase() === 'cancelled';
        const message = isCancel
            ? 'If you cancel this order, the status cannot be changed back. Do you want to proceed?'
            : newStatus.toLowerCase() === 'delivered'
                ? 'Once you mark the order delivered, the status cannot be changed again. Continue?'
                : `Update order status to "${newStatus}"?`;
        Alert.alert('Confirm', message, [
            { text: 'No' },
            {
                text: 'Yes',
                onPress: async () => {
                    setSavingStatus(true);
                    const prev = orders;
                    setOrders(prev.map(o => o._id === order._id ? { ...o, status: newStatus } : o));
                    try {
                        await updateOrderStatus(token, order._id, newStatus);
                        setStatusPickerOrder(null);
                    } catch (err: any) {
                        Alert.alert('Update failed', err?.message || 'Could not update order status');
                        setOrders(prev);
                    } finally {
                        setSavingStatus(false);
                    }
                }
            }
        ]);
    };


    /**
    * Render header
    */
    const renderHeader = () => {
        return (
            <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}>
                        <Image
                            source={icons.back}
                            resizeMode='contain'
                            style={[styles.backIcon, {
                                tintColor: dark ? COLORS.white : COLORS.greyscale900
                            }]}
                        />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, {
                        color: dark ? COLORS.white : COLORS.greyscale900
                    }]}>
                        Orders
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Text style={[styles.filterLabel, { color: dark ? COLORS.white : COLORS.black, marginRight: 0 }]}>
                        Filter by order status:
                    </Text>
                    <TouchableOpacity
                        onPress={() => setStatusFilterModal(true)}
                        style={[
                            styles.statusFilterHeader,
                            { backgroundColor: dark ? COLORS.dark2 : COLORS.tertiaryWhite },
                        ]}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={[styles.filterLabel, { color: dark ? COLORS.white : COLORS.black }]}>
                                {statusFilter === 'all' ? 'All' : statusFilter}
                            </Text>
                            <Image source={icons.down} style={{ width: 12, height: 12, tintColor: dark ? COLORS.white : COLORS.black, marginLeft: 6 }} />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {renderHeader()}
                <View style={styles.filterRow}>
                    <View style={styles.filterGroup}>
                        {[
                            { key: 'all', label: 'All' },
                            { key: '7', label: 'Last 7 days' },
                            { key: '30', label: 'Last 30 days' },
                            { key: 'custom', label: 'Custom' },
                        ].map(f => {
                            const active = dateFilter === f.key;
                            return (
                                <TouchableOpacity
                                    key={f.key}
                                    onPress={() => {
                                        setDateFilter(f.key as any);
                                        if (f.key === 'custom') {
                                            setShowDatePicker('start');
                                        }
                                    }}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: active ? (dark ? COLORS.dark3 : COLORS.tansparentPrimary) : (dark ? COLORS.dark2 : COLORS.tertiaryWhite) },
                                    ]}
                                >
                                    <Text style={{ color: dark ? COLORS.white : COLORS.black, fontFamily: 'semiBold', fontSize: 14 }}>{f.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                        {dateFilter === 'custom' && (
                            <View style={{ marginLeft: 8 }}>
                                <View style={[styles.customRangeBox, { backgroundColor: dark ? COLORS.dark2 : COLORS.tansparentPrimary }]}>
                                    <Text style={[styles.filterLabel, { color: dark ? COLORS.white : COLORS.black }]}>
                                        From: {startDate ? startDate.toLocaleDateString() : '--'}
                                    </Text>
                                    <Text style={[styles.filterLabel, { color: dark ? COLORS.white : COLORS.black, marginHorizontal: 6 }]}>-</Text>
                                    <Text style={[styles.filterLabel, { color: dark ? COLORS.white : COLORS.black }]}>
                                        To: {endDate ? endDate.toLocaleDateString() : '--'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
                {loading ? (
                    <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
                ) : (
                    <FlatList
                        data={filteredOrders}
                        keyExtractor={item => item._id}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={COLORS.primary}
                            />
                        }
                        renderItem={({ item }) => {
                            const firstItem = item.items?.[0];
                            const product: any = firstItem?.product || {};
                            const firstImage = Array.isArray(product.images) ? product.images[0] : undefined;
                            const image = firstImage ? (firstImage.startsWith('http') ? firstImage : `${apiBase}${firstImage}`) : images.store;
                            const total = item.totalAmount ?? (firstItem?.salePrice || firstItem?.price || 0) * (firstItem?.quantity || 1);
                            const created = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';
                            const statusText = (item.status || 'pending').toString();
                            const orderId = (item._id || item.id || '').toString();
                            const shortId = orderId ? orderId.slice(-6).toUpperCase() : '';
                            const displayNumber = item.orderNumber || shortId;
                            const orderLabel = displayNumber ? `Order #${displayNumber}` : 'Order';
                            return (
                                <View style={[styles.cardContainer, {
                                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                                }]}>
                                    
                <View style={styles.detailsContainer}>
                                        <View style={styles.productImageContainer}>
                                            <Image source={{ uri: image }} resizeMode='cover' style={styles.productImage} />
                                        </View>
                                        <View style={styles.detailsRightContainer}>
                                            <View style={styles.priceContainer}>
                                                <View style={styles.priceItemContainer}>
                                                    <View style={styles.statusContainer}>
                                                    <Text style={[styles.name, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                                                        {orderLabel}
                                                    </Text>
                                                    <TouchableOpacity
                                            disabled={isStatusFinal(item.status)}
                                            onPress={() => setStatusPickerOrder(item)}
                                            style={[styles.statusBadge, { backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary }]}
                                        >
                                            <Text style={[styles.statusText, { color: dark ? COLORS.white : COLORS.primary }]}>
                                                {statusText}
                                            </Text>
                                        </TouchableOpacity></View>
                                                    <Text style={[styles.totalPrice, { color: dark ? COLORS.white : COLORS.primary }]}>
                                                        Date: {created || '--'}
                                                    </Text>
                                                </View>
                                                <View style={[styles.rightSecondContainer, {}]}>
                                                    <View style={[styles.ratingContainer, {}]}>
                                                        <Text style={styles.rating}>PKR {total}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={[styles.separateLine, {
                                        marginVertical: 10,
                                        backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                                    }]} />
                                    <View style={styles.buttonContainer}>
                                        {statusText.toLowerCase().includes('cancel') ? (
                                            <View style={[styles.cancelledPill, { backgroundColor: dark ? COLORS.grayscale400 : COLORS.grayscale200 }]}>
                                                <Text style={[styles.receiptBtnText, { color: COLORS.grayscale700 }]}>Order Cancelled</Text>
                                            </View>
                                        ) : (
                                            <>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (!isCompleted(item.status)) {
                                                            Alert.alert('Complete order', 'Please complete the order to see the receipt.');
                                                            return;
                                                        }
                                                        navigation.navigate('productereceipt', {
                                                            data: JSON.stringify({ raw: item }),
                                                        });
                                                    }}
                                                    style={[styles.cancelBtn, {
                                                        borderColor: dark ? COLORS.white : COLORS.primary
                                                    }]}>
                                                    <Text style={[styles.cancelBtnText, {
                                                        color: dark ? COLORS.white : COLORS.primary,
                                                    }]}>E-Receipt</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        navigation.navigate('sellerorderdetails', {
                                                            orderId: item._id,
                                                            order: JSON.stringify(item),
                                                        })
                                                    }

                                                    style={styles.receiptBtn}>
                                                    <Text style={styles.receiptBtnText}
                                                    >View Details</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                </View>
                            );
                        }}
                    />
                )}
            </View>
            <Modal
                transparent
                visible={!!statusPickerOrder}
                animationType="fade"
                onRequestClose={() => setStatusPickerOrder(null)}
            >
                <TouchableWithoutFeedback onPress={() => setStatusPickerOrder(null)}>
                    <View style={styles.modalBackdrop} />
                </TouchableWithoutFeedback>
                <View style={[styles.modalContainer, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                    <Text style={[styles.modalTitle, { color: dark ? COLORS.white : COLORS.black }]}>Update Status</Text>
                    {statusOptions.map(opt => {
                        const active = statusPickerOrder?.status?.toLowerCase() === opt;
                        return (
                            <TouchableOpacity
                                key={opt}
                                style={[
                                    styles.modalOption,
                                    { backgroundColor: active ? (dark ? COLORS.dark3 : COLORS.tansparentPrimary) : 'transparent' }
                                ]}
                                disabled={savingStatus}
                                onPress={() => statusPickerOrder && handleSelectStatus(statusPickerOrder, opt)}
                            >
                                <Text style={[styles.modalOptionText, { color: dark ? COLORS.white : COLORS.black }]}>
                                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                    {savingStatus && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />}
                </View>
            </Modal>
            <Modal
                transparent
                visible={statusFilterModal}
                animationType="fade"
                onRequestClose={() => setStatusFilterModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setStatusFilterModal(false)}>
                    <View style={styles.modalBackdrop} />
                </TouchableWithoutFeedback>
                <View style={[styles.modalContainer, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                    <Text style={[styles.modalTitle, { color: dark ? COLORS.white : COLORS.black }]}>Filter by status</Text>
                    {['all', ...statusOptions].map(opt => {
                        const active = statusFilter === opt;
                        return (
                            <TouchableOpacity
                                key={opt}
                                style={[
                                    styles.modalOption,
                                    { backgroundColor: active ? (dark ? COLORS.dark3 : COLORS.tansparentPrimary) : 'transparent' }
                                ]}
                                onPress={() => {
                                    setStatusFilter(opt);
                                    setStatusFilterModal(false);
                                }}
                            >
                                <Text style={[styles.modalOptionText, { color: dark ? COLORS.white : COLORS.black }]}>
                                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </Modal>
            <DateTimePickerModal
                isVisible={!!showDatePicker}
                mode="date"
                onConfirm={(date) => {
                    if (showDatePicker === 'start') {
                        setStartDate(date);
                        setShowDatePicker('end');
                    } else if (showDatePicker === 'end') {
                        setEndDate(date);
                        setShowDatePicker(null);
                        setDateFilter('custom');
                    }
                }}
                onCancel={() => setShowDatePicker(null)}
            />
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
    headerContainer: {
        flexDirection: "row",
        width: SIZES.width - 32,
        justifyContent: "space-between",
        marginBottom: 32
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center"
    },
    backIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.black
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'bold',
        color: COLORS.black,
        marginLeft: 16
    },
    cardContainer: {
        width: SIZES.width - 32,
        borderRadius: 18,
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.greyscale300
    },
    dateContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    date: {
        fontSize: 16,
        fontFamily: "bold",
        color: COLORS.greyscale900
    },
    InventoryContainer: {
        padding: 5,

        alignItems: "center",
        justifyContent: "center",

        flexDirection: 'row',

        height: 24,

        borderRadius: 4,
        backgroundColor: COLORS.silver

    },
    InventoryText: {
        fontSize: 12,


        color: COLORS.primary,
        fontFamily: "medium",
    },
    separateLine: {
        width: "100%",
        height: .7,
        backgroundColor: COLORS.greyScale800,
        marginVertical: 12
    },
    detailsContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    productImageContainer: {
        width: 90,
        height: 90,
        borderRadius: 16,
        marginRight: 16,
        
        backgroundColor: COLORS.silver,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    productImage: {
        width: 90,
        height: 90,
    },
    detailsRightContainer: {
        flex: 1,
        width: "100%"

    },
    name: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.greyscale900,

    },
    address: {
        fontSize: 12,
        fontFamily: "regular",
        color: COLORS.grayscale700,
        marginVertical: 6
    },
    serviceTitle: {
        fontSize: 12,
        fontFamily: "regular",
        color: COLORS.grayscale700,
    },
    serviceText: {
        fontSize: 12,
        color: COLORS.primary,
        fontFamily: "medium",
        marginTop: 6
    },
    cancelBtn: {
        width: "48%",
        height: 36,
        borderRadius: 24,
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 6,
        borderColor: COLORS.primary,
        borderWidth: 1.4,
        marginBottom: 12
    },
    cancelBtnText: {
        fontSize: 16,
        fontFamily: "semiBold",
        color: COLORS.primary,
    },
    receiptBtn: {
        width: '50%',
        height: 36,
        borderRadius: 24,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 6,
        borderColor: COLORS.primary,
        borderWidth: 1.4,
        marginBottom: 12
    },
    cancelledPill: {
        flex: 1,
        height: 36,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 6,
        marginBottom: 12,
        marginHorizontal: 6
    },
    receiptBtnText: {
        fontSize: 16,
        fontFamily: "semiBold",
        color: COLORS.white,
    },
    buttonContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    rightContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    remindMeText: {
        fontSize: 12,
        fontFamily: "regular",
        color: COLORS.grayscale700,
        marginVertical: 4
    },
    switch: {
        marginLeft: 8,
        transform: [{ scaleX: .8 }, { scaleY: .8 }], // Adjust the size of the switch
    },
    bottomContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginVertical: 12,
        paddingHorizontal: 16,
        width: "100%"
    },
    cancelButton: {
        width: (SIZES.width - 32) / 2 - 8,
        backgroundColor: COLORS.tansparentPrimary,
        borderRadius: 32
    },
    removeButton: {
        width: (SIZES.width - 32) / 2 - 8,
        backgroundColor: COLORS.primary,
        borderRadius: 32
    },
    bottomTitle: {
        fontSize: 24,
        fontFamily: "semiBold",
        color: "red",
        textAlign: "center",
    },
    bottomSubtitle: {
        fontSize: 22,
        fontFamily: "bold",

        textAlign: "center",
        marginTop: 12

    },
    selectedCancelContainer: {
        marginVertical: 12,
        paddingHorizontal: 36,
        width: "100%"
    },
    cancelTitle: {
        fontSize: 18,
        fontFamily: "semiBold",
        color: COLORS.greyscale900,
        textAlign: "center",
    },
    cancelSubtitle: {
        fontSize: 14,
        fontFamily: "regular",
        color: COLORS.grayscale700,
        textAlign: "center",
        marginVertical: 8,
        marginTop: 16
    },
    priceContainer: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 10

    },
       statusContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        width: "100%"

    },
    totalPrice: {
        fontSize: 14,
        fontFamily: "semiBold",
        color: COLORS.primary,
        textAlign: "center",
    },
    duration: {
        fontSize: 12,
        fontFamily: "regular",
        color: COLORS.grayscale700,
        textAlign: "center",
    },
    priceItemContainer: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6
    },

    ratingContainer: {
        alignItems: "center",
        justifyContent: "flex-start",
        flexDirection: 'row',
    },
    rating: {
        fontSize: 20,
        fontFamily: "semiBold",
        color: COLORS.primary,

    },
    rightSecondContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 10,

    },
    rating2: {
        fontSize: 12,
        fontFamily: "semiBold",
        color: COLORS.white,
        marginLeft: 4
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'semiBold',
        textTransform: 'capitalize',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContainer: {
        position: 'absolute',
        left: 24,
        right: 24,
        top: '30%',
        borderRadius: 16,
        padding: 16,
        elevation: 4,
    },
    modalTitle: {
        fontSize: 16,
        fontFamily: 'bold',
        marginBottom: 8,
    },
    modalOption: {
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    modalOptionText: {
        fontSize: 16,
        fontFamily: 'semiBold',
        textTransform: 'capitalize',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
    },
    filterGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        flex: 1,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
    },
    filterLabel: {
        fontSize: 14,
        fontFamily: 'semiBold',
    },
    statusFilter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
    },
    statusFilterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    customRangeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },

})

export default OrderRequests
