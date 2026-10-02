import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS } from '@/constants';
import { useAuth } from '@/app/context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { fetchWarrantyClaim, updateWarrantyClaimStatus, WarrantyClaim } from '@/utils/api/warranty';
import Header from '@/components/Header';
import { useFocusEffect } from '@react-navigation/native';
import ImagePreview from '@/components/ImagePreview';
import { Image as ExpoImage } from 'expo-image';
import { getWarrantyRejectionReasonLabel } from '@/constants/rejectionReasons';
import { PRODUCT_PLACEHOLDER, toAbsoluteImageUri } from '@/utils/images';
import { OrderItem, fetchOrder } from '@/utils/api/orders';
import { getOrderItemLabel } from '@/utils/warranty';

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  BUYER_SHIPPED: 'Buyer shipped',
  SELLER_RECEIVED: 'Seller received',
  SELLER_SHIPPED: 'Seller shipped',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

const SellerWarrantyDetail = () => {
  const params = useLocalSearchParams<{ warrantyId?: string }>();
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [claim, setClaim] = useState<WarrantyClaim | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderItem | null>(null);
  const [orderItemDetail, setOrderItemDetail] = useState<OrderItem['items'][number] | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const toAbsoluteIfNeeded = (value?: string | null) => {
    if (!value) return undefined;
    if (/^https?:\/\//i.test(value)) {
      return value;
    }
    return toAbsoluteImageUri(value);
  };

  const loadClaim = useCallback(async () => {
    if (!token || !params.warrantyId) return;
    setLoading(true);
    try {
      const data = await fetchWarrantyClaim(token, params.warrantyId);
      setClaim(data);
    } catch {
      setClaim(null);
    } finally {
      setLoading(false);
    }
  }, [params.warrantyId, token]);

  const loadOrderDetail = useCallback(async () => {
    if (!claim?.orderId || !token) return;
    setLoadingOrder(true);
    try {
      const orderData = await fetchOrder(token, claim.orderId);
      setOrderDetail(orderData);
      const matchedItem =
        (orderData.items || []).find(item => {
          const idValue =
            item._id?.toString?.() ||
            (item as any).id ||
            '';
          const claimItemId = claim.orderItemId?.toString?.();
          return claimItemId && idValue === claimItemId;
        }) ||
        orderData.items?.[0] ||
        null;
      setOrderItemDetail(matchedItem);
    } catch {
      setOrderDetail(null);
      setOrderItemDetail(null);
    } finally {
      setLoadingOrder(false);
    }
  }, [claim?.orderId, claim?.orderItemId, token]);

  useFocusEffect(
    useCallback(() => {
      loadClaim();
    }, [loadClaim])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('seller:warranties:updated', loadClaim);
    return () => sub.remove();
  }, [loadClaim]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  const handleStatusUpdate = async (status: string) => {
    if (!token || !claim) return;
    setProcessing(true);
    try {
      await updateWarrantyClaimStatus(claim._id, { status }, token);
      DeviceEventEmitter.emit('seller:warranties:updated');
      DeviceEventEmitter.emit('warranties:updated');
      loadClaim();
    } catch (err: any) {
      Alert.alert('Action failed', err?.message || 'Unable to update status');
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !claim) {
    return (
      <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}> 
        <View style={styles.loader}> 
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const status = claim.status || 'REQUESTED';
  const orderLabel = claim.orderNumber
    ? `#${claim.orderNumber}`
    : claim.orderId
      ? `#${String(claim.orderId).slice(-6).toUpperCase()}`
      : '#—';

  const productSku =
    orderItemDetail?.productSnapshot?.sku ||
    orderItemDetail?.product?.sku ||
    (claim.productId ? String(claim.productId) : undefined);
  const productFullName = orderItemDetail
    ? getOrderItemLabel(orderItemDetail)
    : claim.productName || 'Product';
  const imageUrls = (claim.images || [])
    .map(toAbsoluteIfNeeded)
    .filter(Boolean) as string[];
  const productImageCandidate =
    claim.productImage ||
    imageUrls[0] ||
    toAbsoluteIfNeeded(orderItemDetail?.productSnapshot?.images?.[0]) ||
    toAbsoluteIfNeeded(orderItemDetail?.product?.images?.[0]);
  const productImageUri = toAbsoluteIfNeeded(productImageCandidate);
  const productImageSource = productImageUri ? { uri: productImageUri } : PRODUCT_PLACEHOLDER;

  const greyBorder = dark ? COLORS.greyScale800 : COLORS.grayscale200;
  const panelBg = dark ? COLORS.dark2 : COLORS.white;

  const timeline = [
    { label: 'Requested', value: claim.requestedAt },
    { label: 'Approved', value: claim.approvedAt },
    { label: 'Rejected', value: claim.rejectedAt },
    { label: 'Buyer Shipped', value: claim.buyerShippedAt },
    { label: 'Seller Received', value: claim.sellerReceivedAt },
    { label: 'Seller Shipped', value: claim.sellerShippedAt },
    { label: 'Completed', value: claim.completedAt },
  ];

  const field = (label: string, value?: string | number) => (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: dark ? COLORS.white : COLORS.black }]}>{label}</Text>
      <View
        style={[
          styles.fieldValue,
          {
            borderColor: greyBorder,
            backgroundColor: panelBg,
          },
        ]}
      >
        <Text style={[styles.fieldValueText, { color: dark ? COLORS.white : COLORS.black }]}>{value ?? '—'}</Text>
      </View>
    </View>
  );

  const confirmStatus = (nextStatus: string, message: string) => {
    Alert.alert('Confirm', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes', onPress: () => handleStatusUpdate(nextStatus) },
    ]);
  };

  const renderActions = () => {
    if (status === 'REQUESTED') {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.rejectButton, processing && styles.disabledButton]}
            onPress={() => router.push(`/warrantyclaims/seller/reject/${claim._id}`)}
            disabled={processing}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptButton, processing && styles.disabledButton]}
            onPress={() => {
              Alert.alert(
                'Approve claim',
                'Proceed to select Replace or Repair and add tracking info.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Continue',
                    onPress: () => router.push(`/warrantyclaims/seller/${claim._id}/decision`),
                  },
                ]
              );
            }}
            disabled={processing}
          >
            <Text style={[styles.actionText, { color: COLORS.white }]}>Approve</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'BUYER_SHIPPED') {
      return (
        <TouchableOpacity
          style={[styles.primaryAction, processing && styles.disabledButton]}
          onPress={() => confirmStatus('SELLER_RECEIVED', 'Mark as received?')}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.actionText}>Mark it Received</Text>
          )}
        </TouchableOpacity>
      );
    }

    if (status === 'SELLER_RECEIVED') {
      return (
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => router.push(`/warrantyclaims/seller/${claim._id}/tracking?mode=shipment`)}
        >
          <Text style={styles.actionText}>Mark it Shipped</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}> 
      <View style={styles.content}>
        <View style={styles.header}>
          <Header title="Warranty Details" onBackPress={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {status === 'REJECTED' && (
            <View
              style={[
                styles.rejectionPanel,
                {
                  borderColor: greyBorder,
                  backgroundColor: panelBg,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>Rejection Info</Text>
              {field('Reason', getWarrantyRejectionReasonLabel(claim.rejection?.reasonCode))}
              {field('Seller message', claim.rejection?.sellerMessage)}
            </View>
          )}
          <View
            style={[
              styles.section,
              {
                borderColor: greyBorder,
                backgroundColor: panelBg,
              },
            ]}
          >
            {field('Claim number', claim.claimNumber)}
            {field('Order number', orderLabel)}
            {field('Product ID', productSku)}
            {field('Product name', productFullName)}
            {field('Status', STATUS_LABELS[status] || status)}
            {field('Claim quantity', `${claim.claimQuantity}`)}
            {field('Requested on', claim.requestedAt ? new Date(claim.requestedAt).toLocaleDateString() : '—')}
            {field('Notes', claim.notes)}
          </View>
          <View
            style={[
              styles.section,
              {
                borderColor: greyBorder,
                backgroundColor: panelBg,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>Product</Text>
            <View
              style={[
                styles.productCard,
                {
                  borderColor: greyBorder,
                  backgroundColor: panelBg,
                },
              ]}
            >
              <View style={styles.itemCard}>
                <View
                  style={[
                    styles.productImageWrapper,
                    {
                      borderColor: greyBorder,
                      backgroundColor: panelBg,
                    },
                  ]}
                >
                  <ExpoImage source={productImageSource} style={styles.productImage} contentFit="cover" />
                </View>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: dark ? COLORS.white : COLORS.black }]}> {productFullName} </Text>
                  <Text style={[styles.meta, { color: dark ? COLORS.gray3 : COLORS.gray }]}>Ordered Quantity: {claim.orderedQuantity}</Text>
                  <Text style={[styles.meta, { color: dark ? COLORS.gray3 : COLORS.gray }]}>Requested Quantity: {claim.claimQuantity}</Text>
                </View>
              </View>
              {imageUrls.length ? (
                <View style={styles.photos}> 
                  <Text style={[styles.sectionSubtitle, { color: dark ? COLORS.white : COLORS.black }]}>Photos of item:</Text>
                  <View style={styles.photosRow}>
                    {imageUrls.map((uri, idx) => (
                      <TouchableOpacity
                        key={`${uri}-${idx}`}
                        style={[styles.photoWrapper, { borderColor: greyBorder }]}
                        onPress={() => setSelectedImage(uri)}
                        activeOpacity={0.8}
                      >
                        <ExpoImage source={{ uri }} style={styles.photo} contentFit="cover" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>
          <View
            style={[
              styles.section,
              {
                borderColor: greyBorder,
                backgroundColor: panelBg,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>Timeline</Text>
            {timeline.filter(entry => entry.value).map(entry => (
              <View key={entry.label} style={styles.timelineRow}>
                <Text style={[styles.timelineLabel, { color: dark ? COLORS.white : COLORS.black }]}>{entry.label}</Text>
                <View
                  style={[
                    styles.timelineField,
                    {
                      borderColor: greyBorder,
                      backgroundColor: panelBg,
                    },
                  ]}
                > 
                  <Text style={[styles.timelineValue, { color: dark ? COLORS.white : COLORS.black }]}>{entry.value ? new Date(entry.value).toLocaleDateString() : '—'}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={styles.footer}>{renderActions()}</View>
        <ImagePreview visible={!!selectedImage} imageUri={selectedImage} onClose={() => setSelectedImage(null)} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  content: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  rejectionPanel: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  section: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontFamily: 'bold', marginBottom: 12 },
  sectionSubtitle: { fontSize: 14, fontFamily: 'semiBold', marginBottom: 8 },
  fieldRow: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontFamily: 'semiBold', marginBottom: 4 },
  fieldValue: { borderWidth: 1, borderRadius: 12, padding: 12 },
  fieldValueText: { fontSize: 14, fontFamily: 'regular' },
  itemCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.grayscale200, borderRadius: 12, flex: 1, padding: 16 },
  productCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  productImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  productImage: { width: '100%', height: '100%' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontFamily: 'bold' },
  meta: { fontSize: 12, fontFamily: 'regular', marginTop: 4 },
  photos: { marginTop: 12, flexDirection: 'column', alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.grayscale200, borderRadius: 12, flex: 1, padding: 16 },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  photoWrapper: { borderWidth: 1, borderRadius: 12, marginRight: 12, marginBottom: 12, overflow: 'hidden' },
  photo: { width: 92, height: 92, borderRadius: 12 },
  scroll: { padding: 16, paddingBottom: 32 },
  timelineRow: { marginBottom: 12 },
  timelineLabel: { fontSize: 13, fontFamily: 'semiBold', marginBottom: 6 },
  timelineField: { borderWidth: 1, borderRadius: 12, padding: 10 },
  timelineValue: { fontSize: 14, fontFamily: 'regular' },
  footer: { paddingHorizontal: 16, paddingBottom: 24 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rejectButton: {
    borderWidth: 1,
    borderColor: COLORS.red,
    borderRadius: 12,
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontSize: 15, fontFamily: 'semiBold', color: COLORS.white },
  primaryAction: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  rejectText: { fontSize: 15, fontFamily: 'semiBold', color: COLORS.red },
  disabledButton: { opacity: 0.5 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default SellerWarrantyDetail;
