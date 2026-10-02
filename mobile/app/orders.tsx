import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions, ActivityIndicator } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView } from 'react-native-tab-view';
import { NavigationProp } from '@react-navigation/native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons, SIZES } from '@/constants';
import { CancelledOrders, CompletedOrders, OngoingOrders } from '@/tabs';
import { useNavigation } from 'expo-router';
import { fetchMyOrders, ReturnSummaryItem } from '@/utils/api/orders';
import { useAuth } from './context/AuthContext';
import { OrderCardItem } from '@/types/orders';
import { API_BASE_URL } from '@/utils/api/client';

const Orders = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const layout = useWindowDimensions();
  const { dark, colors } = useTheme();
  const { token, isLoggedIn } = useAuth();
  const apiBase = API_BASE_URL.replace(/\/api$/, '');

  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'first', title: 'Processing' },
    { key: 'second', title: 'Completed' },
    { key: 'third', title: 'Cancelled' }
  ]);
  const [orders, setOrders] = React.useState<OrderCardItem[]>([]);
  const [returnSummary, setReturnSummary] = React.useState<Record<string, ReturnSummaryItem>>({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const loadOrders = async () => {
      if (!token) {
        setOrders([]);
        return;
      }
      setLoading(true);
      try {
      const res = await fetchMyOrders(token);
      const raw = (res.orders || (res as any).data || []) as any[];
      setReturnSummary(res.returnSummary || {});
        const mapped: OrderCardItem[] = raw.map((order, idx) => {
          const orderNumber = order.orderNumber
            ? `#${order.orderNumber}`
            : order._id
              ? `#${String(order._id).slice(-6).toUpperCase()}`
              : `#${idx + 1}`;
          const price = order.grandTotal ?? order.totalAmount ?? 0;
          const normStatus = (order.status || 'pending').toString().toLowerCase();
          const displayStatus = (() => {
            if (normStatus === 'pending') return 'processing';
            if (normStatus === 'processing' || normStatus === 'shipped') return 'shipped';
            if (normStatus === 'delivered') return 'completed';
            if (normStatus === 'cancelled' || normStatus === 'canceled') return 'cancelled';
            return normStatus;
          })();
          return {
            id: order._id || String(idx),
            title: `Order ${orderNumber}`,
            subtitle: orderNumber,
            price,
            status: normStatus,
            displayStatus,
            arrivalText: order.arrivalText || order.shippingMethod || '',
            raw: order
          };
        });
        setOrders(mapped);
      } catch (err) {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, [token, isLoggedIn]);


  const statusLower = (s: string) => (s || '').toLowerCase();
  const processing = orders.filter(o => ['pending'].includes(statusLower(o.status)));
  const completed = orders.filter(o => ['shipped', 'delivered', 'completed', 'processing'].includes(statusLower(o.status)));
  const cancelled = orders.filter(o => ['cancelled', 'canceled'].includes(statusLower(o.status)));
  

  const renderTabBar = (props: any) => (
    <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: dark ? COLORS.dark3 : COLORS.grayscale200 }]}>
      {props.navigationState.routes.map((route: any, i: number) => {
        const focused = props.navigationState.index === i;
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => setIndex(i)}
          >
            <Text style={[
              styles.tabLabel,
              { color: focused ? (dark ? COLORS.white : COLORS.primary) : (dark ? COLORS.greyscale500 : COLORS.grayscale700) }
            ]}>
              {route.title}
            </Text>
            <View style={[
              styles.tabIndicator,
              { backgroundColor: focused ? (dark ? COLORS.white : COLORS.primary) : 'transparent' }
            ]} />
          </TouchableOpacity>
        )
      })}
    </View>
  )

  /**
  * Render header
  */
  const renderHeader = () => (
    <>
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
            <Image
              source={icons.back}
              resizeMode='contain'
              style={[styles.backIcon, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            My Orders
          </Text>
        </View>
        <TouchableOpacity
          style={styles.returnAction}
          onPress={() => router.push('/returns')}
        >
          <Image
            source={icons.box}
            resizeMode="contain"
            style={styles.returnActionIcon}
          />
          <Text style={styles.returnActionText}>Returns</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
        ) : (
          <TabView
            navigationState={{ index, routes }}
            renderScene={({ route }) => {
              switch (route.key) {
                case 'first':
                  return <OngoingOrders orders={processing} emptyText="No processing orders" />;
                case 'second':
                  return <CompletedOrders orders={completed} returnSummary={returnSummary} />;
                case 'third':
                  return <CancelledOrders orders={cancelled} />;
                default:
                  return null;
              }
            }}
            onIndexChange={setIndex}
            initialLayout={{ width: layout.width }}
            renderTabBar={renderTabBar}
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
  headerContainer: {
    flexDirection: "row",
    width: SIZES.width - 32,
    justifyContent: "space-between",
    marginBottom: 16
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
  headerAction: {
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  returnAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.black,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  returnActionIcon: {
    width: 16,
    height: 16,
    tintColor: COLORS.white,
  },
  returnActionText: {
    fontSize: 14,
    fontFamily: 'semiBold',
    color: COLORS.white,
    marginLeft: 6,
  },
  moreIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.black
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
    marginBottom: 12
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10
  },
  tabLabel: {
    fontSize: 16,
    fontFamily: 'semiBold'
  },
  tabIndicator: {
    marginTop: 6,
    height: 3,
    width: '60%',
    borderRadius: 999
  }
})

export default Orders
