import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { fetchReturnsByOrder, ReturnRecord } from '@/utils/api/returns';
import { COLORS } from '@/constants';
import Header from '@/components/Header';

const statusColors: Record<string, string> = {
  requested: COLORS.primary,
  approved: COLORS.primary,
  rejected: COLORS.red,
  received: COLORS.greeen,
  refunded: COLORS.greeen,
  cancelled: COLORS.gray,
  shipped: COLORS.primary,
  shipped_back: COLORS.primary,
  pickup_scheduled: COLORS.primary,
};

const formatCurrency = (amount?: number, currency = 'PKR') => {
  const safeAmount = amount ?? 0;
  return `${currency} ${Number(safeAmount).toLocaleString()}`;
};

const OrderReturnHistoryScreen = () => {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReturns = useCallback(async () => {
    if (!token || !params.orderId) return;
    setLoading(true);
    try {
      const data = await fetchReturnsByOrder(params.orderId, token);
      setReturns(data);
    } catch (err: any) {
      Alert.alert('Returns', err?.message || 'Could not load return requests');
    } finally {
      setLoading(false);
    }
  }, [params.orderId, token]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const renderItem = ({ item }: { item: ReturnRecord }) => {
    const status = (item.status || 'requested').toLowerCase();
    const statusColor = statusColors[status] || COLORS.primary;
    const canViewReason = status === 'rejected';
    const buttonLabel =
      status === 'requested'
        ? 'Return Requested'
        : status === 'received'
          ? 'Return Completed'
          : 'See rejection reason';

    return (
      <View
        style={[
          styles.card,
          {
            borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: dark ? COLORS.white : COLORS.black }]}>
            {item.returnNumber || 'Return request'}
          </Text>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>{status}</Text>
          </View>
        </View>
        <Text style={[styles.requestStatusText, { color: dark ? COLORS.black : COLORS.black }]}>
          Request status: {status}
        </Text>
        <View
          style={[
            styles.reasonButtonContainer,
            {
              borderTopColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.reasonButton,
              {
                backgroundColor: canViewReason ? COLORS.primary : COLORS.gray,
              },
            ]}
            disabled={!canViewReason}
            onPress={() => router.push(`/returns/${item._id}`)}
          >
            <Text style={styles.reasonButtonText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.fill}>
        <Header title="Return history" onBackPress={() => router.back()} />
        {loading ? (
          <View style={styles.spinner}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={returns}
            keyExtractor={item => item._id}
            contentContainerStyle={returns.length === 0 ? styles.emptyContainer : undefined}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                No return requests found for this order.
              </Text>
            }
            renderItem={renderItem}
            style={styles.list}
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
  fill: {
    flex: 1,
    padding: 16,
  },
  list: {
    flex: 1,
    marginTop: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'bold',
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  requestStatusText: {
    fontSize: 14,
    fontFamily: 'semiBold',
    color: COLORS.black,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: 'semiBold',
    textTransform: 'capitalize',
  },
 
  reasonButtonContainer: {
    borderTopWidth: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    paddingVertical: 12,

  },
  reasonButton: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  reasonButtonText: {
    fontSize: 14,
    fontFamily: 'semiBold',
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  spinner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'medium',
  },
});

export default OrderReturnHistoryScreen;
