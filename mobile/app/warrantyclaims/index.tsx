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
  Image,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons } from '@/constants';
import { useAuth } from '@/app/context/AuthContext';
import { fetchBuyerWarrantyClaims, updateWarrantyClaimStatus, WarrantyClaim } from '@/utils/api/warranty';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: COLORS.primary,
  APPROVED: COLORS.primary,
  BUYER_SHIPPED: COLORS.primary,
  SELLER_RECEIVED: COLORS.gray,
  SELLER_SHIPPED: COLORS.primary,
  COMPLETED: COLORS.black,
  REJECTED: COLORS.red,
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  BUYER_SHIPPED: 'Buyer shipped',
  SELLER_RECEIVED: 'Received by seller',
  SELLER_SHIPPED: 'Seller shipped',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

const WarrantyClaimsScreen = () => {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadClaims = useCallback(async () => {
    if (!token) {
      setClaims([]);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchBuyerWarrantyClaims(token);
      setClaims(list);
    } catch (err) {
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadClaims();
    }, [loadClaims])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('warranties:updated', loadClaims);
    return () => sub.remove();
  }, [loadClaims]);

  const handleStatusUpdate = async (claimId: string, status: string) => {
    if (!token) return;
    setProcessingId(`${claimId}-${status}`);
    try {
      await updateWarrantyClaimStatus(claimId, { status }, token);
      DeviceEventEmitter.emit('warranties:updated');
      DeviceEventEmitter.emit('seller:warranties:updated');
      setClaims(prev => prev.map(item => (item._id === claimId ? { ...item, status } as WarrantyClaim : item)));
    } catch (err: any) {
      Alert.alert('Action failed', err?.message || 'Unable to update the claim');
    } finally {
      setProcessingId(null);
    }
  };

  const confirmBuyerShipped = (claim: WarrantyClaim) => {
    Alert.alert(
      'Confirm shipment',
      'Have you shipped the product to the seller for inspection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, shipped',
          onPress: () => handleStatusUpdate(claim._id, 'BUYER_SHIPPED'),
        },
      ]
    );
  };

  const confirmBuyerReceived = (claim: WarrantyClaim) => {
    Alert.alert(
      'Confirm receipt',
      'Have you received the repaired/replaced product from the seller?',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Yes, received',
          onPress: () => handleStatusUpdate(claim._id, 'COMPLETED'),
        },
      ]
    );
  };

const renderHeader = () => (
    <View
      style={[
        styles.headerContainer,
        { borderBottomColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 },
      ]}
    >
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image
            source={icons.back}
            resizeMode="contain"
            style={[styles.backIcon, { tintColor: dark ? COLORS.white : COLORS.black }]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.black }]}>Warranty</Text>
      </View>
      <TouchableOpacity
        style={[styles.availButton, { backgroundColor: COLORS.black }]}
        onPress={() => router.push('/warrantyclaims/avail')}
      >
        <View style={styles.availContent}>
          <Image
            source={icons.plus}
            style={styles.plusIcon}
            resizeMode="contain"
            tintColor={COLORS.white}
          />
          <Text style={styles.availText}>Avail Warranty</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderCardButton = (claim: WarrantyClaim) => {
    const status = claim.status || 'REQUESTED';
    const isProcessing = processingId?.startsWith(claim._id);

    const renderButton = (
      label: string,
      onPress: () => void,
      disabled = false,
      indicator = false
    ) => (
      <TouchableOpacity
        style={[styles.actionButton, styles.primaryAction, (disabled || indicator) && styles.disabledAction]}
        onPress={!disabled ? onPress : undefined}
        disabled={disabled}
      >
        {indicator ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.actionButtonText}>{label}</Text>
        )}
      </TouchableOpacity>
    );

    switch (status) {
      case 'REQUESTED':
        return renderButton('View Warranty Details', () => router.push(`/warrantyclaims/${claim._id}`));
      case 'APPROVED':
        return renderButton('Mark it shipped', () => confirmBuyerShipped(claim));
      case 'BUYER_SHIPPED':
        return renderButton('Awaiting Seller', () => {}, true);
      case 'SELLER_RECEIVED':
        return renderButton('Seller received', () => {}, true);
      case 'SELLER_SHIPPED':
        return renderButton(
          'Mark it Received',
          () => confirmBuyerReceived(claim),
          !!isProcessing,
          !!isProcessing
        );
      case 'COMPLETED':
        return renderButton('View Claim Details', () => router.push(`/warrantyclaims/${claim._id}`));
      case 'REJECTED':
        return renderButton('View Warranty Detail', () => router.push(`/warrantyclaims/${claim._id}`));
      default:
        return renderButton('View Warranty Details', () => router.push(`/warrantyclaims/${claim._id}`));
    }
  };

  const renderItem = ({ item }: { item: WarrantyClaim }) => {
    const status = item.status || 'REQUESTED';
    const badgeColor = STATUS_COLORS[status] || COLORS.primary;
    const orderLabel = item.orderNumber
      ? `#${item.orderNumber}`
      : item.orderId
        ? `#${String(item.orderId).slice(-6).toUpperCase()}`
        : '#—';

    return (
    <View style={[styles.card, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
      <View style={styles.cardRow}>
        <View style={[styles.imageWrapper, { backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]}>
          {item.productImage ? (
            <ExpoImage source={{ uri: item.productImage }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={styles.imagePlaceholder} />
          )}
        </View>
    <View style={styles.infoColumn}>
      <Text style={[styles.claimNumber, { color: dark ? COLORS.white : COLORS.black }]}>
        Warranty #{item.claimNumber}
      </Text>
      <Text
        style={[
          styles.productLabel,
          { color: dark ? COLORS.gray3 : COLORS.gray, marginTop: 6 },
        ]}
      >
        Product ID: {item.productId ? String(item.productId).slice(-6).toUpperCase() : '—'}
      </Text>
      <Text
        style={[
          styles.productLabel,
          { color: dark ? COLORS.gray3 : COLORS.gray, marginTop: 6 },
        ]}
      >
        Order {orderLabel}
      </Text>
      <Text
        style={[
          styles.productLabel,
          { color: dark ? COLORS.gray3 : COLORS.gray, marginTop: 6 },
        ]}
      >
        Requested on {item.requestedAt ? new Date(item.requestedAt).toLocaleDateString() : '—'}
      </Text>
    </View>
        <View style={styles.statusColumn}>
          <View
            style={[
              styles.badge,
              status === 'REJECTED'
                ? {
                    borderColor: COLORS.black,
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
                {
                  color: status === 'REJECTED' ? COLORS.black : COLORS.white,
                },
              ]}
            >
              {STATUS_LABELS[status] || status.toLowerCase()}
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.divider, { borderTopColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]} />
      {renderCardButton(item)}
    </View>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={claims}
            keyExtractor={item => item._id}
            contentContainerStyle={claims.length === 0 ? styles.emptyContainer : { paddingBottom: 32 }}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                  No Warranty Claims yet.
                </Text>
              </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'bold',
  },
  backIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  availButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availText: {
    fontSize: 14,
    fontFamily: 'regular',
    color: COLORS.white,
  },
  availContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plusIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: COLORS.white,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageWrapper: {
    width: 85,
    height: 85,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  infoColumn: {
    flex: 1,
    marginLeft: 12,
  },
  claimNumber: {
    fontSize: 16,
    fontFamily: 'bold',
  },
  productLabel: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  statusColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'semiBold',
    textTransform: 'capitalize',
  },
  orderLabel: {
    fontSize: 12,
    fontFamily: 'regular',
    marginBottom: 12,
  },
  divider: {
    borderTopWidth: 1,
    marginVertical: 12,
  },
  actionButton: {
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    backgroundColor: COLORS.transparentWhite,
  },
  disabledAction: {
    backgroundColor: COLORS.grayscale200,
  },
  actionButtonText: {
    fontFamily: 'semiBold',
    color: COLORS.white,
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
});

export default WarrantyClaimsScreen;
