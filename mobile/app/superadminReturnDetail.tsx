import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Header from '@/components/Header';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/app/context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { COLORS } from '@/constants';
import { fetchReturn, ReturnRecord } from '@/utils/api/returns';
import { toAbsoluteImageUri } from '@/utils/images';
import ImagePreview from '@/components/ImagePreview';

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
};

const formatCurrency = (amount?: number, currency = 'PKR') => {
  const safeAmount = amount ?? 0;
  return `${currency} ${Number(safeAmount).toLocaleString()}`;
};

const combineAddress = (address?: any) => {
  if (!address) return '—';
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode || address.postalCode,
    address.country,
  ].filter(Boolean);
  return parts.join(', ');
};

const SuperAdminReturnDetail = () => {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ returnId?: string }>();
  const [returnDoc, setReturnDoc] = useState<ReturnRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadReturn = useCallback(async () => {
    if (!params.returnId || !token) return;
    setLoading(true);
    try {
      const data = await fetchReturn(params.returnId, token);
      setReturnDoc(data);
    } catch (err: any) {
      Alert.alert('Return', err?.message || 'Could not load return');
    } finally {
      setLoading(false);
    }
  }, [params.returnId, token]);

  useEffect(() => {
    loadReturn();
  }, [loadReturn]);

  if (loading || !returnDoc) {
    return (
      <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const greyBorder = dark ? COLORS.greyScale800 : COLORS.grayscale200;
  const panelBg = dark ? COLORS.dark2 : COLORS.white;
  const primaryText = dark ? COLORS.white : COLORS.black;
  const secondaryTextColor = dark ? COLORS.gray3 : COLORS.gray;
  const statusLabel = (returnDoc.status || 'requested').charAt(0).toUpperCase() + (returnDoc.status || 'requested').slice(1);
  const orderLabel = returnDoc.order?.orderNumber
    ? `#${returnDoc.order.orderNumber}`
    : `#${String(returnDoc.order?._id || '').slice(-6).toUpperCase()}`;

  const seller = returnDoc.seller as any;
  const buyer = returnDoc.buyer as any;
  const sellerName = seller?.storeName || seller?.businessName || seller?.name || 'Store';
  const sellerEmail = seller?.email || '—';
  const sellerPhone = seller?.phoneNumber || '—';
  const sellerAddress = combineAddress(seller?.address);

  const customerName =
    (returnDoc.order?.customer?.firstName || buyer?.name || 'Customer') +
    (returnDoc.order?.customer?.lastName ? ` ${returnDoc.order?.customer?.lastName}` : '');
  const customerEmail = (returnDoc.order?.customer?.email || buyer?.email || '—');
  const customerPhone = (returnDoc.order?.customer?.phoneNumber || buyer?.phoneNumber || '—');
  const customerAddress = combineAddress(returnDoc.order?.shippingAddress || buyer?.address);

  const renderField = (label: string, value?: string) => (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: primaryText }]}>{label}</Text>
      <View style={[styles.fieldValue, { borderColor: greyBorder, backgroundColor: panelBg }]}>
        <Text style={[styles.fieldValueText, { color: primaryText }]}>{value || '—'}</Text>
      </View>
    </View>
  );

  const normalizedItems = (returnDoc.items || []).map((item, idx) => {
    const imageUrl =
      toAbsoluteImageUri(item.productSnapshot?.images?.[0]) ||
      toAbsoluteImageUri(item.product?.images?.[0])
    const normalizedImages = (Array.isArray(item.images) ? item.images : [])
      .map(toAbsoluteImageUri)
      .filter(Boolean) as string[]
    const name =
      item.productSnapshot?.partName ||
      item.productSnapshot?.name ||
      item.product?.partName ||
      item.product?.name ||
      'Item'
    return {
      key: `${item.orderItemId || idx}`,
      label: name,
      quantity: item.quantity ?? 0,
      price: item.unitPrice ?? 0,
      image: imageUrl,
      photos: normalizedImages,
    }
  })

  const timelineEntries = [
    { label: 'Requested', value: returnDoc.requestedAt },
    { label: 'Approved', value: returnDoc.approvedAt },
    { label: 'Rejected', value: returnDoc.rejectedAt },
    { label: 'Received', value: returnDoc.receivedAt },
    { label: 'Refunded', value: returnDoc.refundedAt },
    { label: 'Cancelled', value: returnDoc.cancelledAt },
  ];

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.fill}>
        <View style={styles.headerWrapper}>
          <Header title="Return Details" onBackPress={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={[styles.scroll]} showsVerticalScrollIndicator={false}>
          <View style={[styles.infoContainer, { borderColor: greyBorder }]}>
            {renderField('Return Number', returnDoc.returnNumber)}
            {renderField('Order Number', orderLabel)}
            {renderField('Return Status', statusLabel)}
            {renderField('Return Amount', formatCurrency(returnDoc.refundAmount, returnDoc.refundCurrency || 'PKR'))}
            {renderField('Requested On', formatDate(returnDoc.requestedAt))}
            {renderField('Reason', returnDoc.reason)}
          </View>

          <View style={[styles.sectionContainer, { borderColor: greyBorder, backgroundColor: panelBg }]}>
            <Text style={[styles.sectionTitle, { color: primaryText }]}>Items Detail</Text>
            <View style={styles.itemsWrapper}>
              {normalizedItems.map(item => (
                <View key={item.key} style={[styles.itemWrapper, { borderColor: greyBorder }]}>
                  <View style={[styles.itemCard, { borderColor: greyBorder, backgroundColor: panelBg }]}>
                    <TouchableOpacity
                      style={[styles.itemImageWrapper, { backgroundColor: greyBorder }]}
                      activeOpacity={0.8}
                      onPress={() => item.image && setSelectedImage(item.image)}
                    >
                      {item.image ? (
                        <ExpoImage source={{ uri: item.image }} style={styles.itemImage} contentFit="cover" />
                      ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: panelBg }]}>
                          <Text style={[styles.itemInitial, { color: primaryText }]}>{item.label.charAt(0)}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.itemDetails}>
                      <Text style={[styles.productName, { color: primaryText }]}>{item.label}</Text>
                      <Text style={[styles.itemMeta, { color: secondaryTextColor }]}>Qty {item.quantity}</Text>
                      <Text style={[styles.itemMeta, { color: secondaryTextColor }]}>
                        PKR {Number(item.price).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  {item.photos.length ? (
                    <View style={[styles.mediasWrapper, { borderColor: greyBorder, backgroundColor: panelBg }]}>
                      {item.photos.map((url, idx) => (
                        <TouchableOpacity key={`${item.key}-photo-${idx}`} onPress={() => setSelectedImage(url)} activeOpacity={0.8}>
                          <ExpoImage
                            source={{ uri: url }}
                            contentFit="cover"
                            style={styles.photo}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
          <View style={[styles.section, { borderColor: greyBorder, backgroundColor: panelBg }]}>
            <Text style={[styles.sectionTitle, { color: primaryText }]}>Timeline</Text>
            {timelineEntries
              .filter(entry => entry.value)
              .map(entry => (
                <View key={entry.label} style={styles.timelineRow}>
                  <Text style={[styles.timelineLabel, { color: primaryText }]}>{entry.label}</Text>
                  <View style={[styles.timelineField, { borderColor: greyBorder, backgroundColor: panelBg }]}>
                    <Text style={[styles.timelineValue, { color: primaryText }]}>{formatDate(entry.value)}</Text>
                  </View>
                </View>
              ))}
          </View>
          <View style={[styles.sectionContainer, { borderColor: greyBorder, backgroundColor: panelBg }]}>
            <Text style={[styles.sectionTitle, { color: primaryText }]}>Store Info</Text>
            {renderField('Store Name', sellerName)}
            {renderField('Store Email', sellerEmail)}
            {renderField('Store Phone', sellerPhone)}
            {renderField('Store Address', sellerAddress)}
          </View>

          <View style={[styles.sectionContainer, { borderColor: greyBorder, backgroundColor: panelBg }]}>
            <Text style={[styles.sectionTitle, { color: primaryText }]}>Customer Info</Text>
            {renderField('Customer Name', customerName)}
            {renderField('Customer Email', customerEmail)}
            {renderField('Customer Phone', customerPhone)}
            {renderField('Customer Address', customerAddress)}
          </View>
        </ScrollView>
        <ImagePreview visible={!!selectedImage} imageUri={selectedImage} onClose={() => setSelectedImage(null)} />
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
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'semiBold',
    marginBottom: 6,
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
  sectionContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginBottom: 12,
  },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  itemsWrapper: {
    marginTop: 8,
  },
  itemWrapper: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  itemImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInitial: {
    fontSize: 18,
    fontFamily: 'semiBold',
  },
  itemDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  mediasWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  photo: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  timelineRow: {
    marginBottom: 12,
  },
  timelineLabel: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 6,
  },
  timelineField: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  timelineValue: {
    fontSize: 14,
    fontFamily: 'regular',
  },
});

export default SuperAdminReturnDetail;
