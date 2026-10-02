import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  RefreshControl,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS } from '@/constants';
import { useAuth } from '@/app/context/AuthContext';
import { fetchSellerWarrantyClaims, updateWarrantyClaimStatus, WarrantyClaim } from '@/utils/api/warranty';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import Header from '@/components/Header';

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: COLORS.primary,
  APPROVED: COLORS.primary,
  BUYER_SHIPPED: COLORS.primary,
  SELLER_RECEIVED: COLORS.primary,
  SELLER_SHIPPED: COLORS.primary,
  COMPLETED: COLORS.greeen,
  REJECTED: COLORS.gray,
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  BUYER_SHIPPED: 'Awaiting Receipt',
  SELLER_RECEIVED: 'Received',
  SELLER_SHIPPED: 'Shipped',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

const SellerWarrantyClaims = () => {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadClaims = useCallback(
    async (options: { skipLoading?: boolean } = {}) => {
      if (!token) {
        setClaims([]);
        if (!options.skipLoading) {
          setLoading(false);
        }
        return;
      }
      if (!options.skipLoading) {
        setLoading(true);
      }
      try {
        const list = await fetchSellerWarrantyClaims(token);
        setClaims(list);
      } catch {
        setClaims([]);
      } finally {
        if (!options.skipLoading) {
          setLoading(false);
        }
      }
    },
    [token]
  );

  const handleRefresh = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      await loadClaims({ skipLoading: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadClaims, token]);

  useFocusEffect(
    useCallback(() => {
      loadClaims();
    }, [loadClaims])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('seller:warranties:updated', loadClaims);
    return () => sub.remove();
  }, [loadClaims]);

  const handleStatusChange = async (claimId: string, status: string) => {
    if (!token) return;
    setProcessingId(`${claimId}-${status}`);
    try {
      await updateWarrantyClaimStatus(claimId, { status }, token);
      DeviceEventEmitter.emit('seller:warranties:updated');
      DeviceEventEmitter.emit('warranties:updated');
    } catch (err: any) {
      Alert.alert('Action failed', err?.message || 'Unable to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const confirmStatusUpdate = (
    claim: WarrantyClaim,
    status: string,
    message: string,
    title?: string
  ) => {
    Alert.alert(title || status, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => handleStatusChange(claim._id, status) },
    ]);
  };

  const renderItemActions = (item: WarrantyClaim) => {
    const status = item.status || 'REQUESTED';
    const processing = processingId?.startsWith(item._id);

    if (status === 'REQUESTED') {
      return (
        <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.secondaryAction,
            styles.rejectButton,
            styles.sideButton,
            { marginRight: 8 },
            processing && styles.disabledAction,
          ]}
            onPress={() => router.push(`/warrantyclaims/seller/reject/${item._id}`)}
            disabled={!!processing}
          >
            <Text style={[styles.actionButtonText, { color: COLORS.red }]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryAction, styles.sideButton, processing && styles.disabledAction]}
            onPress={() => {
              Alert.alert(
                'Approve claim',
                'This will approve the warranty claim and collect buyer shipping info.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Approve',
                    onPress: () => router.push(`/warrantyclaims/seller/${item._id}/decision`),
                  },
                ]
              );
            }}
            disabled={!!processing}
          >
            <Text style={[styles.actionButtonText, { color: COLORS.white }]}>Approve</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'BUYER_SHIPPED') {
      return (
        <TouchableOpacity
          style={[styles.primaryAction, processing && styles.disabledAction]}
          onPress={() =>
            confirmStatusUpdate(
              item,
              'SELLER_RECEIVED',
              'Have you received the product from the buyer for inspection?',
              'Mark it received'
            )
          }
          disabled={!!processing}
        >
          {processing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={[styles.actionButtonText, { color: COLORS.white }]}>Mark it Received</Text>
          )}
        </TouchableOpacity>
      );
    }

    if (status === 'SELLER_RECEIVED') {
      return (
        <TouchableOpacity
          style={[styles.primaryAction, processing && styles.disabledAction]}
          onPress={() => router.push(`/warrantyclaims/seller/${item._id}/tracking?mode=shipment`)}
          disabled={!!processing}
        >
          <Text style={[styles.actionButtonText, { color: COLORS.white }]}>Mark it Shipped</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.viewDetailAction}
        onPress={() => router.push(`/warrantyclaims/seller/${item._id}`)}
      >
        <Text style={[styles.actionButtonText, { color: COLORS.white }]}>View Claim</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: WarrantyClaim }) => {
    const status = item.status || 'REQUESTED';
    const badgeColor = STATUS_COLORS[status] || COLORS.primary;
    const fallbackOrderNumber = item.orderId
      ? String(item.orderId).slice(-6).toUpperCase()
      : undefined;
    const orderNumberValue = item.orderNumber || fallbackOrderNumber;
    const orderLabel = `Order #${orderNumberValue || '—'}`;
    const skuLabel = item.productSku || '—';
    const productImage = item.productImage;

    return (
      <View style={[styles.card, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
        <View style={styles.cardRow}>
          <View
            style={[
              styles.imageWrapper,
              { backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 },
            ]}
          >
            {productImage ? (
              <ExpoImage source={{ uri: productImage }} contentFit="cover" style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder} />
            )}
          </View>
          <View style={styles.infoColumn}>
            <View style={styles.claimRow}>
              <Text style={[styles.claimNumber, { color: dark ? COLORS.white : COLORS.black }]}>
                Warranty #{item.claimNumber}
              </Text>
              <View
                style={[
                  styles.badge,
                  status === 'REJECTED'
                    ? {
                        borderColor: COLORS.red,
                        backgroundColor: 'transparent',
                      }
                    : {
                        backgroundColor: badgeColor,
                        borderColor: badgeColor,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: status === 'REJECTED' ? COLORS.red : COLORS.white },
                  ]}
                >
                  {STATUS_LABELS[status] || status}
                </Text>
              </View>
            </View>
            <Text style={[styles.orderText, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
              {orderLabel}
            </Text>
            <View style={styles.productIdRow}>
              <Text style={[styles.orderText, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                Product Id: {skuLabel}
              </Text>
              <TouchableOpacity
                style={styles.chevronCircle}
                onPress={() => router.push(`/warrantyclaims/seller/${item._id}`)}
              >
                <Text style={styles.chevronText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.actionsContainer,
            { borderTopColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 },
          ]}
        >
          {renderItemActions(item)}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}> 
      <View style={[, { backgroundColor: colors.background }]}> 
        <View style={styles.headerWrapper}>
          <Header title="Warranty Claims" />
        </View>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : claims.length ? (
          <FlatList
            data={claims}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
              />
            }
            renderItem={renderItem}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.text }]}>No Warranty Claims yet.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  headerWrapper: { paddingHorizontal: 16 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  image: { width: '100%', height: '100%', borderRadius: 12 },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.silver,
  },
  infoColumn: { flex: 1 },
  claimNumber: { fontSize: 16, fontFamily: 'semiBold' },
  claimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  orderText: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  productIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
  },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 12, fontFamily: 'semiBold' },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chevronText: { color: COLORS.white, fontSize: 18 },
  actionsContainer: {
    borderTopWidth: 1,
    marginTop: 8,
  },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  primaryAction: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: { fontSize: 14, fontFamily: 'semiBold' },
  metaText: { fontSize: 12, fontFamily: 'regular', marginTop: 4 },
  viewDetailAction: {
    backgroundColor: COLORS.black,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  rejectButton: {
    borderColor: COLORS.red,
  },
  sideButton: { flex: 1 },
  disabledAction: { opacity: 0.5 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontFamily: 'regular', fontSize: 16 },
});

export default SellerWarrantyClaims;
