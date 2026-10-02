import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  DeviceEventEmitter,
  Alert,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS } from '@/constants';
import { useAuth } from '@/app/context/AuthContext';
import { fetchSellerReturns, ReturnRecord, updateReturnStatus } from '@/utils/api/returns';
import { useFocusEffect } from '@react-navigation/native';
import Header from '@/components/Header';
import { router } from 'expo-router';

const statusColors: Record<string, string> = {
  requested: COLORS.primary,
  approved: COLORS.primary,
  shipped: COLORS.primary,
  rejected: COLORS.red,
  received: COLORS.greeen,
  refunded: COLORS.greeen,
  cancelled: COLORS.gray,
  pickup_scheduled: COLORS.primary,
  shipped_back: COLORS.primary,
};

const SellerReturnsList = () => {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadReturns = useCallback(async () => {
    if (!token) {
      setReturns([]);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchSellerReturns(token);
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
    const sub = DeviceEventEmitter.addListener('seller:returns:updated', loadReturns);
    return () => sub.remove();
  }, [loadReturns]);

  const handleStatusChange = async (returnId: string, status: 'approved' | 'rejected') => {
    if (!token) return;
    setProcessingId(`${returnId}-${status}`);
    try {
      await updateReturnStatus(returnId, { status }, token);
      loadReturns();
      if (status === 'approved') {
        router.push(`/sellerreturns/${returnId}/tracking`);
      }
    } catch (err: any) {
      Alert.alert('Action failed', err?.message || 'Could not update return');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkReceived = async (returnId: string) => {
    if (!token) return;
    setProcessingId(`${returnId}-received`);
    try {
      await updateReturnStatus(returnId, { status: 'received' }, token);
      loadReturns();
    } catch (err: any) {
      Alert.alert('Action failed', err?.message || 'Could not update return');
    } finally {
      setProcessingId(null);
    }
  };

  const confirmStatusChange = (returnId: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected') {
      router.push(`/sellerreturns/reject/${returnId}`);
      return;
    }
    const title = 'Accept return?';
    Alert.alert(title, 'This will approve the return request and take you to add a tracking number. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        style: 'default',
        onPress: () => handleStatusChange(returnId, 'approved'),
      },
    ]);
  };

  const renderItem = ({ item }: { item: ReturnRecord }) => {
    const status = (item.status || 'requested').toLowerCase();
    const statusColor = statusColors[status] || COLORS.primary;
    const orderLabel = item.order?.orderNumber
      ? `#${item.order.orderNumber}`
      : `#${String(item.order?._id || '').slice(-6).toUpperCase()}`;
    const isProcessing = processingId?.startsWith(item._id);
    const isCancelled = status === 'cancelled';
    const isReceived = status === 'received';
    const isRejected = status === 'rejected';
    const needsTracking = status === 'approved' && !item.trackingId;
    const isShipped = status === 'shipped';

    return (
      <View style={[styles.card, { borderColor: dark ? COLORS.gray3 : COLORS.grayscale200 }]}>
        <View style={styles.row}>
          <View>
            <Text style={[styles.requestNumber, { color: COLORS.black }]}>{item.returnNumber || '—'}</Text>
            <Text style={[styles.orderLabel, { color: COLORS.black }]} numberOfLines={1}>
              Order: {orderLabel}
            </Text>
          </View>
          <View style={[styles.badge, { borderColor: statusColor }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{status}</Text>
          </View>
        </View>
        <View style={styles.detailsRow}>
          <TouchableOpacity onPress={() => router.push(`/sellerreturns/${item._id}`)}>
            <Text
              style={[
                styles.detailLabel,
                {
                  color: dark ? COLORS.white : COLORS.black,
                  textDecorationLine: 'underline',
                },
              ]}
            >
              View Return Details
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.buttonSeparator, { borderColor: dark ? COLORS.gray3 : COLORS.grayscale200 }]} />
        <View style={styles.buttonRow}>
          {isRejected ? (
            <View style={[styles.singleButton, { backgroundColor: COLORS.grayscale200 }]}>
              <Text style={[styles.buttonText, { color: COLORS.gray }]}>Request Rejected</Text>
            </View>
          ) : isCancelled ? (
            <View style={[styles.singleButton, { backgroundColor: COLORS.grayscale200 }]}>
              <Text style={[styles.buttonText, { color: COLORS.gray }]}>Request Cancelled</Text>
            </View>
          ) : isReceived ? (
            <View style={[styles.singleButton, { backgroundColor: COLORS.grayscale200 }]}>
              <Text style={[styles.buttonText, { color: COLORS.gray }]}>Return Completed</Text>
            </View>
          ) : isShipped ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleMarkReceived(item._id)}
              disabled={processingId === `${item._id}-received`}
            >
              {processingId === `${item._id}-received` ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={[styles.buttonText, { color: COLORS.white }]} numberOfLines={1}>
                  Mark as Received
                </Text>
              )}
            </TouchableOpacity>
          ) : needsTracking ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => router.push(`/sellerreturns/${item._id}/tracking`)}
            >
              <Text style={[styles.buttonText, { color: COLORS.white }]}>Add Tracking Number</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => confirmStatusChange(item._id, 'rejected')}
                disabled={isProcessing}
              >
                {processingId === `${item._id}-rejected` ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={[styles.buttonText, { color: COLORS.red }]}>Reject Return</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => confirmStatusChange(item._id, 'approved')}
                disabled={isProcessing}
              >
                {processingId === `${item._id}-approved` ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={[styles.buttonText, { color: COLORS.white }]}>Accept Return</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}> 
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <Header title="Return Requests" onBackPress={() => router.back()} />
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={returns}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            contentContainerStyle={returns.length === 0 ? styles.emptyContainer : { paddingBottom: 32 }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: dark ? COLORS.gray3 : COLORS.gray }]}>No return requests yet.</Text>
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
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: COLORS.white,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestNumber: {
    fontSize: 18,
    fontFamily: 'bold',
  },
  orderLabel: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginTop: 8,
  },
  detailsRow: {
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  buttonSeparator: {
    borderTopWidth: 1,
    marginTop: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.red,
    marginRight: 8,
  },
  acceptButton: {
    backgroundColor: COLORS.black,
  },
  singleButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'bold',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'regular',
  },
});

export default SellerReturnsList;
