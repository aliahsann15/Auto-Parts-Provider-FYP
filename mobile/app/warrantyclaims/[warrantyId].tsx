import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/app/context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { fetchWarrantyClaim, WarrantyClaim } from '@/utils/api/warranty';
import Header from '@/components/Header';
import { COLORS } from '@/constants';
import { useFocusEffect } from '@react-navigation/native';
import { DeviceEventEmitter } from 'react-native';
import ImagePreview from '@/components/ImagePreview';
import { Image as ExpoImage } from 'expo-image';
import { toAbsoluteImageUri } from '@/utils/images';
import { getWarrantyRejectionReasonLabel } from '@/constants/rejectionReasons';

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  BUYER_SHIPPED: 'Buyer shipped',
  SELLER_RECEIVED: 'Seller received',
  SELLER_SHIPPED: 'Seller shipped',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

const WarrantyDetailsScreen = () => {
  const params = useLocalSearchParams<{ warrantyId?: string }>();
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [claim, setClaim] = useState<WarrantyClaim | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadClaim = useCallback(async () => {
    if (!token || !params.warrantyId) return;
    setLoading(true);
    try {
      const data = await fetchWarrantyClaim(token, params.warrantyId);
      setClaim(data);
    } catch (err) {
      setClaim(null);
    } finally {
      setLoading(false);
    }
  }, [params.warrantyId, token]);

  useFocusEffect(
    useCallback(() => {
      loadClaim();
    }, [loadClaim])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('warranties:updated', loadClaim);
    return () => sub.remove();
  }, [loadClaim]);

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
            borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
            backgroundColor: panelBg,
          },
        ]}
      >
        <Text style={[styles.fieldValueText, { color: dark ? COLORS.white : COLORS.black }]}>
          {value ?? '—'}
        </Text>
      </View>
    </View>
  );

  const imageUrls = (claim.images || []).map(toAbsoluteImageUri).filter(Boolean) as string[];

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
                  borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                  backgroundColor: panelBg,
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>Rejection Info</Text>
              {field('Reason', getWarrantyRejectionReasonLabel(claim.rejection?.reasonCode))}
              {field('Seller Message', claim.rejection?.sellerMessage)}
            </View>
          )}
          <View
            style={[
              styles.section,
              {
                borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                backgroundColor: panelBg,
              },
            ]}
          >
            {field('Warranty Number', claim.claimNumber)}
            {field('Order Number', orderLabel)}
            {field('Status', STATUS_LABELS[status] || status.toLowerCase())}
            {field('Claim Quantity', `${claim.claimQuantity}`)}
            {field('Requested On', claim.requestedAt ? new Date(claim.requestedAt).toLocaleDateString() : '—')}
            {field('Notes', claim.notes)}
          </View>
          <View
            style={[
              styles.section,
              {
                borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                backgroundColor: panelBg,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>Product</Text>
            <View style={styles.itemCard}>
              <View style={[styles.productImage, { backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]}>
                {claim.productImage ? (
                  <TouchableOpacity onPress={() => setSelectedImage(claim.productImage)}>
                    <ExpoImage source={{ uri: claim.productImage }} style={styles.productImage} contentFit="cover" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.imagePlaceholder} />
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: dark ? COLORS.white : COLORS.black }]}>
                  {claim.productName || 'Product'}
                </Text>
                <Text style={[styles.meta, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                  Ordered quantity: {claim.orderedQuantity}
                </Text>
                <Text style={[styles.meta, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                  Claim quantity: {claim.claimQuantity}
                </Text>
              </View>
            </View>
            {imageUrls.length ? (
              <View style={styles.photos}>
                <Text style={[styles.sectionSubtitle, { color: dark ? COLORS.white : COLORS.black }]}>
                  Photos of the item
                </Text>
                <View style={styles.photosRow}>
                  {imageUrls.map((uri, idx) => (
                    <TouchableOpacity key={`${uri}-${idx}`} onPress={() => setSelectedImage(uri)}>
                      <ExpoImage source={{ uri }} style={styles.photo} contentFit="cover" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
          <View
            style={[
              styles.section,
              {
                borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
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
                      borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                      backgroundColor: panelBg,
                    },
                  ]}
                >
                  <Text style={[styles.timelineValue, { color: dark ? COLORS.white : COLORS.black }]}>
                    {entry.value ? new Date(entry.value).toLocaleDateString() : '—'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        {status === 'REJECTED' && (
          <View
            style={[
              styles.footer,
              { borderTopColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 },
            ]}
          >
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => router.push('/settingshelpcenter')}
            >
              <Text style={styles.contactButtonText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        )}
        <ImagePreview visible={!!selectedImage} imageUri={selectedImage} onClose={() => setSelectedImage(null)} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  rejectionPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'bold',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 8,
  },
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'semiBold',
    marginBottom: 4,
  },
  fieldValue: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  fieldValueText: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 18,
    fontFamily: 'bold',
  },
  meta: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  photos: {
    marginTop: 12,
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  photo: {
    width: 92,
    height: 92,
    borderRadius: 12,
    marginRight: 12,
    marginBottom: 12,
  },
  timelineRow: {
    marginBottom: 12,
  },
  timelineLabel: {
    fontSize: 13,
    fontFamily: 'semiBold',
    marginBottom: 6,
  },
  timelineField: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  timelineValue: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  contactButton: {
    backgroundColor: COLORS.black,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  contactButtonText: {
    color: COLORS.white,
    fontFamily: 'semiBold',
  },
  footer: {
    borderTopWidth: 1,
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WarrantyDetailsScreen;
