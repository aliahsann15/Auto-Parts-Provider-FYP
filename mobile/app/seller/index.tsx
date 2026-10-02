import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { Image } from 'expo-image';
import { useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons } from '@/constants';
import { useAuth } from '@/app/context/AuthContext';
import { fetchStoreBySellerId } from '@/utils/api/store';
import { fetchPublicProducts, Product } from '@/utils/api/products';
import { API_BASE_URL } from '@/utils/api/client';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {
  fetchSellerOrderInsights,
  fetchSellerProfitInsights,
  fetchSellerStats,
  SellerOrderInsights,
  SellerProfitInsights,
  SellerStats,
} from '@/utils/api/sellerDashboard';
import { format } from 'date-fns';
import { fetchWithdrawalSummary } from '@/utils/api/withdrawals';
import { fetchNotificationCount } from '@/utils/api/notifications';

const { width } = Dimensions.get('window');

const SellerDashboardScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { dark, colors } = useTheme();
  const { user, token } = useAuth();
  const isStoreManager = (user?.role || '').toLowerCase() === 'storemanager';
  const sellerId = isStoreManager ? (user as any)?.sellerId || user?.id : user?.id;

  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [orderInsights, setOrderInsights] = useState<SellerOrderInsights | null>(null);
  const [profitInsights, setProfitInsights] = useState<SellerProfitInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'today' | '7d' | '30d' | 'custom'>('today');
  const [salesFilter, setSalesFilter] = useState<'today' | '7d' | '30d' | 'custom'>('today');
  const [orderCustomStart, setOrderCustomStart] = useState('');
  const [orderCustomEnd, setOrderCustomEnd] = useState('');
  const [salesCustomStart, setSalesCustomStart] = useState('');
  const [salesCustomEnd, setSalesCustomEnd] = useState('');
  const [activePicker, setActivePicker] = useState<
    'orderStart' | 'orderEnd' | 'salesStart' | 'salesEnd' | null
  >(null);
  const [withdrawalAvailable, setWithdrawalAvailable] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const apiBase = useMemo(() => API_BASE_URL.replace(/\/api$/, ''), []);

  const loadNotificationCount = useCallback(async () => {
    if (!token) {
      setUnreadNotifications(0);
      return;
    }
    try {
      const res = await fetchNotificationCount(token);
      setUnreadNotifications(Number(res?.unreadCount || 0));
    } catch {
      // ignore
    }
  }, [token]);

  const pkGreeting = useMemo(() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const pk = new Date(utc + 5 * 60 * 60000);
    const h = pk.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    if (h < 21) return 'Good Evening';
    return 'Good Night';
  }, []);

  const todayKey = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  useEffect(() => {
    loadNotificationCount();
    const sub = DeviceEventEmitter.addListener('notifications:updated', (payload: any) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadNotifications(payload.unreadCount);
      } else {
        loadNotificationCount();
      }
    });
    const badgeSub = DeviceEventEmitter.addListener('notifications:badge', (payload: any) => {
      if (typeof payload?.unreadCount === 'number') {
        setUnreadNotifications(payload.unreadCount);
      }
    });
    return () => {
      sub.remove();
      badgeSub.remove();
    };
  }, [loadNotificationCount]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadNotificationCount);
    return () => {
      unsub && (unsub as any).remove ? (unsub as any).remove() : unsub();
    };
  }, [navigation, loadNotificationCount]);

  const loadStore = useCallback(async () => {
    if (!token || !sellerId) return;
    setLoading(true);
    try {
      const res = await fetchStoreBySellerId(String(sellerId));
      setStore(res.store);
      const productRes = await fetchPublicProducts({ seller: String(sellerId), limit: 200 });
      setProducts(productRes.products || []);
    } catch (err) {
      setStore(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [token, sellerId]);

  const loadWithdrawalBalance = useCallback(async () => {
    if (!token) return;
    try {
      const summary = await fetchWithdrawalSummary(token);
      setWithdrawalAvailable(summary?.storeBalance ?? summary?.availableBalance ?? 0);
    } catch {
      setWithdrawalAvailable(0);
    }
  }, [token]);

  const loadStats = useCallback(async () => {
    if (!token) return;
    const orderDays =
      orderFilter === 'today' ? 1 : orderFilter === '7d' ? 7 : orderFilter === '30d' ? 30 : null;
    const salesDays =
      salesFilter === 'today' ? 1 : salesFilter === '7d' ? 7 : salesFilter === '30d' ? 30 : null;
    const orderParams = orderFilter === 'custom' && orderCustomStart && orderCustomEnd
      ? { startDate: orderCustomStart, endDate: orderCustomEnd }
      : orderDays
        ? orderDays
        : 30;
    const salesParams = salesFilter === 'custom' && salesCustomStart && salesCustomEnd
      ? { startDate: salesCustomStart, endDate: salesCustomEnd }
      : salesDays
        ? salesDays
        : 30;
    try {
      setLoading(true);
      const [s, o, p] = await Promise.all([
        fetchSellerStats(token),
        fetchSellerOrderInsights(token, orderParams as any),
        fetchSellerProfitInsights(token, salesParams as any),
      ]);
      setStats(s as any);
      setOrderInsights(o as any);
      setProfitInsights(p as any);
    } catch (err) {
      setStats(null);
      setOrderInsights(null);
      setProfitInsights(null);
    } finally {
      setLoading(false);
    }
  }, [token, orderFilter, salesFilter, orderCustomStart, orderCustomEnd, salesCustomStart, salesCustomEnd]);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStore(), loadStats(), loadWithdrawalBalance()]).finally(() => setRefreshing(false));
  }, [loadStats, loadStore, loadWithdrawalBalance]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadWithdrawalBalance();
  }, [loadWithdrawalBalance]);

  const handlePickerConfirm = (date: Date) => {
    const iso = format(date, 'yyyy-MM-dd');
    if (activePicker === 'orderStart') setOrderCustomStart(iso);
    if (activePicker === 'orderEnd') setOrderCustomEnd(iso);
    if (activePicker === 'salesStart') setSalesCustomStart(iso);
    if (activePicker === 'salesEnd') setSalesCustomEnd(iso);
    setActivePicker(null);
  };

  const todayPoint = orderInsights?.points?.find(p => p.date === todayKey);
  const ordersToday =
    (todayPoint?.completed ?? 0) + (todayPoint?.pending ?? 0) + (todayPoint?.cancelled ?? 0);
  const salesToday = profitInsights?.points?.find(p => p.date === todayKey)?.revenue ?? 0;

  const bestSellingProducts = useMemo(
    () => [...products].sort((a, b) => ((b as any).itemsSold || 0) - ((a as any).itemsSold || 0)),
    [products]
  );

  const startOfDayLocal = useCallback((d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }, []);

  const fillOrderPoints = useCallback(
    (insights?: SellerOrderInsights | null) => {
      const today = startOfDayLocal(new Date());

      let start = new Date(today);
      let end = new Date(today);
      if (orderFilter === 'custom' && orderCustomStart && orderCustomEnd) {
        start = startOfDayLocal(new Date(orderCustomStart));
        end = startOfDayLocal(new Date(orderCustomEnd));
      } else {
        const days = orderFilter === 'today' ? 1 : orderFilter === '7d' ? 7 : 30;
        start = startOfDayLocal(new Date(today));
        start.setDate(start.getDate() - (days - 1));
      }

      const map = new Map<string, { completed: number; pending: number; cancelled: number }>();
      insights?.points?.forEach(p => map.set(p.date, p));
      const filled: { date: string; total: number }[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = format(d, 'yyyy-MM-dd');
        const pt = map.get(key);
        const total = (pt?.completed ?? 0) + (pt?.pending ?? 0) + (pt?.cancelled ?? 0);
        filled.push({ date: key, total });
      }
      return filled;
    },
    [orderFilter, orderCustomStart, orderCustomEnd, startOfDayLocal]
  );

  const fillSalesPoints = useCallback(
    (insights?: SellerProfitInsights | null) => {
      const today = startOfDayLocal(new Date());

      let start = new Date(today);
      let end = new Date(today);
      if (salesFilter === 'custom' && salesCustomStart && salesCustomEnd) {
        start = startOfDayLocal(new Date(salesCustomStart));
        end = startOfDayLocal(new Date(salesCustomEnd));
      } else {
        const days = salesFilter === 'today' ? 1 : salesFilter === '7d' ? 7 : 30;
        start = startOfDayLocal(new Date(today));
        start.setDate(start.getDate() - (days - 1));
      }

      const map = new Map<string, { revenue: number; shipping: number; profit: number }>();
      insights?.points?.forEach(p => map.set(p.date, p));
      const filled: { date: string; revenue: number; shipping: number; profit: number }[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = format(d, 'yyyy-MM-dd');
        const pt = map.get(key);
        filled.push({
          date: key,
          revenue: pt?.revenue ?? 0,
          shipping: pt?.shipping ?? 0,
          profit: pt?.profit ?? 0,
        });
      }
      return filled;
    },
    [salesFilter, salesCustomStart, salesCustomEnd, startOfDayLocal]
  );

  const orderSeries = fillOrderPoints(orderInsights);
  const salesSeries = fillSalesPoints(profitInsights);
  const totalRevenue = salesSeries.reduce((sum, s) => sum + (s.revenue || 0), 0);
  const totalProfit = salesSeries.reduce((sum, s) => sum + ((s.revenue || 0) - (s.shipping || 0)), 0);
  const profitToday = profitInsights?.points?.find(p => p.date === todayKey)?.profit ?? 0;

  const avatarLetter = (store?.storeName || user?.name || 'S').charAt(0).toUpperCase();
  const profileImage = store?.storeProfileImage
    ? store.storeProfileImage.startsWith('http')
      ? store.storeProfileImage
      : `${apiBase?.replace(/\/$/, '')}${store.storeProfileImage}`
    : null;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.viewLeft}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.userIcon} />
        ) : (
          <View style={[styles.userIcon, { backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: COLORS.white, fontFamily: 'bold', fontSize: 18 }}>{avatarLetter}</Text>
          </View>
        )}
        <View style={styles.viewNameContainer}>
          <Text style={styles.greeeting}>{pkGreeting} 👋</Text>
          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            {store?.storeName || 'Store'}
          </Text>
        </View>
      </View>
      <View style={styles.viewRight}>
        <TouchableOpacity onPress={() => navigation.navigate('notifications')}>
          <Image
            source={icons.notificationBell2}
            resizeMode="contain"
            style={[styles.bellIcon, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]}
          />
          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const metricCards: { label: string; value: string | number; onPress: () => void }[] = [
    {
      label: 'Orders Today',
      value: ordersToday || 0,
      onPress: () => navigation.navigate('orders'),
    },
    {
      label: 'Products',
      value: stats?.products ?? products.length,
      onPress: () => navigation.navigate('products'),
    },
    {
      label: 'Sales Today',
      value: `PKR ${salesToday.toLocaleString()}`,
      onPress: () => navigation.navigate('salesreport'),
    },
  ];
  if (isStoreManager) {
    metricCards.push({
      label: 'Profit',
      value: `PKR ${profitToday.toLocaleString()}`,
      onPress: () => navigation.navigate('netprofit'),
    });
  } else {
    metricCards.push({
      label: 'Withdrawal Balance',
      value: `PKR ${withdrawalAvailable.toLocaleString()}`,
      onPress: () => navigation.navigate('withdrawals'),
    });
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <DateTimePickerModal
          isVisible={activePicker !== null}
          mode="date"
          onConfirm={handlePickerConfirm}
          onCancel={() => setActivePicker(null)}
        />
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadAll} tintColor={COLORS.primary} />
          }
        >
          {loading && (
            <ActivityIndicator style={{ marginVertical: 12 }} color={COLORS.primary} />
          )}

          <View style={styles.statsRow}>
            {metricCards.map(card => (
              <TouchableOpacity key={card.label} style={styles.statCard} onPress={card.onPress}>
                <Text style={styles.statLabel}>{card.label}</Text>
                <Text style={styles.statValue}>{card.value}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.sectionBlock, { marginTop: 12 }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Order Insights</Text>
              <TouchableOpacity onPress={() => navigation.navigate('orderinsights')}>
                <Text style={styles.seeAll}>View report</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Completed</Text>
                <Text style={styles.summaryValue}>{orderInsights?.summary?.completed ?? 0}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Pending</Text>
                <Text style={styles.summaryValue}>{orderInsights?.summary?.pending ?? 0}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Cancelled</Text>
                <Text style={styles.summaryValue}>{orderInsights?.summary?.cancelled ?? 0}</Text>
              </View>
            </View>
            <View style={styles.filterRow}>
              {(['today', '7d', '30d', 'custom'] as const).map(key => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, orderFilter === key && styles.chipActive]}
                  onPress={() => setOrderFilter(key)}
                >
                  <Text style={[styles.chipText, orderFilter === key && styles.chipTextActive]}>
                    {key === 'today'
                      ? 'Today'
                      : key === '7d'
                        ? 'Last 7 days'
                        : key === '30d'
                          ? 'Last 30 days'
                          : 'Custom'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {orderFilter === 'custom' && (
              <View style={styles.customRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setActivePicker('orderStart')}>
                  <Text style={styles.dateText}>{orderCustomStart || 'From date'}</Text>
                </TouchableOpacity>
                <Text style={styles.toText}>to</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setActivePicker('orderEnd')}>
                  <Text style={styles.dateText}>{orderCustomEnd || 'To date'}</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.chartCard}>
              {loading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 0 }}>
                  <BarChart
                    data={{
                      labels: orderSeries.map(o => o.date.slice(5)),
                      datasets: [{ data: orderSeries.map(o => o.total || 0) }],
                    }}
                    width={Math.max(Math.max(orderSeries.length, 1) * 70, width)}
                    height={240}
                    fromZero
                    yAxisLabel=""
                    yAxisSuffix=""
                    yLabelsOffset={40}
                    
                    chartConfig={{
                      backgroundColor: colors.background,
                      backgroundGradientFrom: colors.background,
                      backgroundGradientTo: colors.background,
                      decimalPlaces: 0,
                      color: () => '#000000',
                      fillShadowGradientFrom: '#000000',
                      fillShadowGradientTo: '#000000',
                      fillShadowGradientOpacity: 1,
                      fillShadowGradientFromOpacity: 1,
                      fillShadowGradientToOpacity: 1,
                      labelColor: (opacity = 1) => (dark ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`),
                      propsForBackgroundLines: { stroke: dark ? COLORS.grayscale400 : COLORS.greyscale300 },
                      propsForLabels: { fontFamily: 'medium', fontSize: 11 },
                    }}
                    withInnerLines
                    flatColor
                    style={{ borderRadius: 12, }}
                    verticalLabelRotation={0}
                    showBarTops
                  />
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sales Insights</Text>
              <TouchableOpacity onPress={() => navigation.navigate('salesreport')}>
                <Text style={styles.seeAll}>View report</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Sales</Text>
                <Text style={styles.summaryValue}>PKR {totalRevenue.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Revenue</Text>
                <Text style={styles.summaryValue}>PKR {totalRevenue.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Profit</Text>
                <Text style={styles.summaryValue}>PKR {totalProfit.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.filterRow}>
              {(['today', '7d', '30d', 'custom'] as const).map(key => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, salesFilter === key && styles.chipActive]}
                  onPress={() => setSalesFilter(key)}
                >
                  <Text style={[styles.chipText, salesFilter === key && styles.chipTextActive]}>
                    {key === 'today'
                      ? 'Today'
                      : key === '7d'
                        ? 'Last 7 days'
                        : key === '30d'
                          ? 'Last 30 days'
                          : 'Custom'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {salesFilter === 'custom' && (
              <View style={styles.customRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setActivePicker('salesStart')}>
                  <Text style={styles.dateText}>{salesCustomStart || 'From date'}</Text>
                </TouchableOpacity>
                <Text style={styles.toText}>to</Text>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setActivePicker('salesEnd')}>
                  <Text style={styles.dateText}>{salesCustomEnd || 'To date'}</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.chartCard}>
              {loading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 0 }}>
                  <BarChart
                    data={{
                      labels: salesSeries.map(o => o.date.slice(5)),
                      datasets: [{ data: salesSeries.map(o => o.revenue || 0) }],
                    }}
                    width={Math.max(Math.max(salesSeries.length, 1) * 70, width)}
                    height={240}
                    fromZero
                    yAxisLabel=""
                    yAxisSuffix=""
                    yLabelsOffset={10}
                    chartConfig={{
                      backgroundColor: colors.background,
                      backgroundGradientFrom: colors.background,
                      backgroundGradientTo: colors.background,
                      decimalPlaces: 0,
                      color: () => '#000000',
                      fillShadowGradientFrom: '#000000',
                      fillShadowGradientTo: '#000000',
                      fillShadowGradientOpacity: 1,
                      fillShadowGradientFromOpacity: 1,
                      fillShadowGradientToOpacity: 1,
                      labelColor: (opacity = 1) => (dark ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`),
                      propsForBackgroundLines: { stroke: dark ? COLORS.grayscale400 : COLORS.greyscale300 },
                      propsForLabels: { fontFamily: 'medium', fontSize: 12 },
                     
                    }}
                    withInnerLines
                    flatColor
                    style={{ borderRadius: 12, }}
                    verticalLabelRotation={0}
                    showBarTops
                  />
                </ScrollView>
              )}
            </View>
          </View>

          {/* best selling section removed per request */}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SellerDashboardScreen;

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  viewLeft: { flexDirection: 'row', alignItems: 'center' },
  userIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF' },
  viewNameContainer: { marginLeft: 12 },
  greeeting: { fontSize: 12, color: 'gray', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  viewRight: { flexDirection: 'row', alignItems: 'center' },
  bellIcon: { width: 24, height: 24, marginHorizontal: 8 },
  badge: {
    position: 'absolute',
    top: -6,
    right: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontFamily: 'bold' },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
  },
  statLabel: { fontSize: 12, color: '#666', fontFamily: 'medium' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#000', marginTop: 6 },
  sectionBlock: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000' },
  seeAll: { fontFamily: 'medium', color: COLORS.primary },
  insightRow: { flexDirection: 'row', gap: 10 },
  insightCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    backgroundColor: COLORS.white,
  },
  metricLabel: { fontFamily: 'regular', fontSize: 12, color: COLORS.grayscale700 },
  metricValue: { fontFamily: 'bold', fontSize: 16, color: COLORS.black, marginTop: 6 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.greyscale300,
    backgroundColor: COLORS.white,
  },
  chipActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  chipText: { fontFamily: 'regular', color: COLORS.grayscale700, fontSize: 12 },
  chipTextActive: { color: COLORS.white },
  chartCard: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#000',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  cell: {
    fontSize: 13,
    fontFamily: 'regular',
    color: '#000',
    width: width * 0.2,
  },
  name: {
    width: width * 0.5,
  },
  salesCol: {
    width: width * 0.25,
  },
  sales: {
    width: width * 0.2,
    textAlign: 'right',
    fontSize: 13,
    fontFamily: 'medium',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    backgroundColor: COLORS.grayscale200,
  },
  summaryLabel: { fontFamily: 'regular', fontSize: 12, color: COLORS.grayscale700 },
  summaryValue: { fontFamily: 'bold', fontSize: 16, color: COLORS.black, marginTop: 4 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dateBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.greyscale300,
  },
  dateText: { fontFamily: 'regular', color: COLORS.grayscale700 },
  toText: { fontFamily: 'regular', color: COLORS.grayscale700 },
});
