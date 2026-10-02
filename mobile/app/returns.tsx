import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons } from '@/constants';
import { useAuth } from './context/AuthContext';
import { fetchBuyerReturns, ReturnRecord } from '@/utils/api/returns';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

const statusColors: Record<string, string> = {
  requested: COLORS.primary,
  approved: COLORS.primary,
  complete: COLORS.greeen,
  rejected: COLORS.red,
  received: COLORS.greeen,
  refunded: COLORS.greeen,
  cancelled: COLORS.gray,
  'pickup_scheduled': COLORS.primary,
  'shipped_back': COLORS.primary,
};

const ReturnsScreen = () => {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReturns = useCallback(async () => {
    if (!token) {
      setReturns([]);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchBuyerReturns(token);
      setReturns(list);
    } catch (err) {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadReturns();
    }, [loadReturns])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('returns:updated', loadReturns);
    return () => sub.remove();
  }, [loadReturns]);

  const renderHeader = () => (
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()}>
                <Image
            source={icons.arrowLeft}
            resizeMode="contain"
            style={[
              styles.backIcon,
              { tintColor: dark ? COLORS.white : COLORS.greyscale900 },
            ]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.black }]}>My Returns</Text>
      </View>
      <View style={{ width: 48 }} />
    </View>
  );

  const renderItem = ({ item }: { item: ReturnRecord }) => {
    const rawStatus = (item.status || '').toLowerCase();
    const displayStatus = rawStatus === 'received' ? 'complete' : rawStatus;
    const statusColor = statusColors[displayStatus] || COLORS.primary;
    const orderDisplay = item.order?.orderNumber
      ? `#${item.order.orderNumber}`
      : `#${String(item.order?._id || '').slice(-6).toUpperCase()}`;
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: dark ? COLORS.dark2 : COLORS.white },
        ]}
      >
        <View style={[styles.row]}>
          <View >
            <Text style={[styles.title, { color: COLORS.black }]}>
              {item.returnNumber}
            </Text>
            <Text style={[styles.orderInfo, { color: COLORS.black }]}>
              Order: {orderDisplay}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                borderColor: statusColor,
                backgroundColor: dark ? COLORS.dark3 : COLORS.white,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: statusColor }]}>{displayStatus}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <Text style={[styles.orderInfo, { color: COLORS.black, marginTop: 0 }]}>
            Requested on {item.requestedAt ? new Date(item.requestedAt).toLocaleDateString() : '—'}
          </Text>
          <TouchableOpacity
            style={[styles.detailIconWrap, { backgroundColor: COLORS.black }]}
            onPress={() => router.push(`/returns/${item._id}`)}
          >
            <Image
              source={icons.arrowRight}
              resizeMode="contain"
              style={[styles.detailIcon, { tintColor: COLORS.white }]}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
        ) : (
          <FlatList
            data={returns}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={returns.length === 0 ? styles.emptyContainer : { paddingBottom: 32 }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                No return requests yet.
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'bold',
    marginLeft: 12,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.black,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontFamily: 'bold',
  },
  orderInfo: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginTop: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'semiBold',
    textTransform: 'capitalize',
  },
  note: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: 'regular',
  },
  date: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'regular',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIcon: {
    width: 16,
    height: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
    fontFamily: 'medium',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default ReturnsScreen;
