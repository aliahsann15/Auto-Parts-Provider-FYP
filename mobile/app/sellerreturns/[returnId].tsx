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
  Image,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS } from '@/constants';
import { useAuth } from '@/app/context/AuthContext';
import { fetchReturn, ReturnRecord, updateReturnStatus } from '@/utils/api/returns';
import { useFocusEffect } from '@react-navigation/native';
import Header from '@/components/Header';
import { getSellerRejectionReasonLabel } from '@/constants/rejectionReasons';
import ImagePreview from '@/components/ImagePreview';
import { toAbsoluteImageUri } from '@/utils/images';
import { useLocalSearchParams, router } from 'expo-router';

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
};

const formatCurrency = (amount?: number, currency = 'PKR') => {
  const safeAmount = amount ?? 0;
  return `${currency} ${Number(safeAmount).toLocaleString()}`;
};

const SellerReturnDetail = () => {
  const params = useLocalSearchParams<{ returnId?: string }>();
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [returnDoc, setReturnDoc] = useState<ReturnRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadReturn = useCallback(async () => {
    if (!token || !params.returnId) return;
    setLoading(true);
    try {
      const data = await fetchReturn(params.returnId, token);
      setReturnDoc(data);
    } catch (err) {
      Alert.alert('Return', (err as any)?.message || 'Could not load return');
    } finally {
      setLoading(false);
    }
  }, [params.returnId, token]);

  useFocusEffect(
    useCallback(() => {
      loadReturn();
    }, [loadReturn])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('seller:returns:updated', loadReturn);
    return () => sub.remove();
  }, [loadReturn]);

  const handleStatus = async (targetStatus: 'rejected' | 'approved' | 'received') => {
    if (!token || !params.returnId) return;
    setUpdating(true);
    try {
      await updateReturnStatus(params.returnId, { status: targetStatus }, token);
      DeviceEventEmitter.emit('returns:updated');
      DeviceEventEmitter.emit('seller:returns:updated');
      if (targetStatus === 'approved') {
        router.push(`/sellerreturns/${params.returnId}/tracking`);
        return;
      }
      Alert.alert('Updated', `Return marked as ${targetStatus}.`, [{ text: 'OK' }]);
      loadReturn();
    } catch (err) {
      Alert.alert('Error', (err as any)?.message || 'Could not update return');
    } finally {
      setUpdating(false);
    }
  };

  const showConfirmation = (targetStatus: 'rejected' | 'approved') => {
    if (targetStatus === 'rejected') {
      if (params.returnId) {
        router.push(`/sellerreturns/reject/${params.returnId}`);
      }
      return;
    }
    const title = 'Accept return?';
    Alert.alert(title, 'This will approve the return request and move to add tracking info. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        style: 'default',
        onPress: () => handleStatus('approved'),
      },
    ]);
  };

  const confirmReject = () => showConfirmation('rejected');
  const confirmAccept = () => showConfirmation('approved');

  const closePreview = () => setSelectedImage(null);

  if (loading || !returnDoc) {
    return (
      <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const greyBorder = dark ? COLORS.greyScale800 : COLORS.grayscale200;
  const panelBg = dark ? COLORS.dark2 : COLORS.white;
  const primaryTextColor = dark ? COLORS.white : COLORS.black;
  const secondaryTextColor = dark ? COLORS.gray3 : COLORS.gray;
  const status = (returnDoc.status || 'requested').toLowerCase();
  const rejectionReasonLabel =
    getSellerRejectionReasonLabel(returnDoc.sellerRejectionReason) || returnDoc.sellerNote || '—';
  const rejectionMessage = returnDoc.sellerRejectionMessage || returnDoc.sellerNote || '—';
  const orderLabel = returnDoc.order?.orderNumber
    ? `#${returnDoc.order.orderNumber}`
    : `#${String(returnDoc.order?._id || '').slice(-6).toUpperCase()}`;

  const timelineEntries = [
    { label: 'Requested', value: returnDoc.requestedAt },
    { label: 'Approved', value: returnDoc.approvedAt },
    { label: 'Rejected', value: returnDoc.rejectedAt },
    { label: 'Received', value: returnDoc.receivedAt },
    { label: 'Refunded', value: returnDoc.refundedAt },
    { label: 'Cancelled', value: returnDoc.cancelledAt },
  ];

  const renderField = (label: string, value?: string | number) => (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: primaryTextColor }]}>{label}</Text>
      <View style={[styles.fieldValue, { borderColor: greyBorder, backgroundColor: panelBg }]}>
        <Text style={[styles.fieldValueText, { color: primaryTextColor }]}>{value ?? '—'}</Text>
      </View>
    </View>
  );

  const getItemLabel = (item: ReturnRecord['items'][number]) =>
    item.productSnapshot?.partName || item.productSnapshot?.name || item.product?.name || 'Item';

  const getItemImage = (item: ReturnRecord['items'][number]) =>
    toAbsoluteImageUri(item.productSnapshot?.images?.[0]) ||
    toAbsoluteImageUri(item.product?.images?.[0]);

  const getItemPrice = (item: ReturnRecord['items'][number]) => {
    const priceValue =
      item.unitPrice ?? item.productSnapshot?.price ?? item.product?.price ?? item.price;
    if (priceValue == null) return '—';
    if (typeof priceValue === 'number') {
      return `₱${priceValue.toFixed(2)}`;
    }
    return String(priceValue);
  };

  const actionButtons = () => {
    if (!returnDoc) return null;
    if (status === 'requested') {
      return (
        <View style={styles.actionPanel}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => confirmReject()}
            disabled={updating}
          >
            {updating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.rejectText}>Reject Return</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => confirmAccept()}
            disabled={updating}
          >
            {updating ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.actionText}>Accept Return</Text>}
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'approved' && !returnDoc.trackingId) {
      return (
        <View style={styles.actionPanel}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => router.push(`/sellerreturns/${params.returnId}/tracking`)}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.actionText}>Add Tracking Number</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'shipped') {
      return (
        <View style={styles.actionPanel}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleStatus('received')}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.actionText}>Mark as Received</Text>
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const actionFooter = actionButtons();

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
            {renderField('Return Status', status)}
            {renderField(
              'Return Amount',
              formatCurrency(returnDoc.refundAmount, returnDoc.refundCurrency || 'PKR')
            )}
            {renderField('Requested On', formatDate(returnDoc.requestedAt))}
            {renderField('Reason', returnDoc.reason || '—')}
            {status === 'rejected' && (
              <>
                {renderField('Rejection Reason', rejectionReasonLabel)}
                {renderField('Seller message', rejectionMessage)}
              </>
            )}
          </View>

          <View style={[styles.section, { borderColor: greyBorder, backgroundColor: panelBg }]}>
            <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Items Detail</Text>
            <View style={styles.itemsWrapper}>
              {returnDoc.items.map((item, idx) => {
                const key = `${item.orderItemId || item.product || idx}`;
                const imageUrl = getItemImage(item);
                const validImages = (Array.isArray(item.images) ? item.images : [])
                  .map(toAbsoluteImageUri)
                  .filter(Boolean) as string[];

                return (
                  <View key={key} style={[styles.itemWrapper, { borderColor: greyBorder, backgroundColor: panelBg }]}>
                    <View style={[styles.itemCard, { borderColor: greyBorder, backgroundColor: panelBg }]}>
                      <TouchableOpacity
                        style={[styles.itemImageWrapper, { backgroundColor: greyBorder }]}
                        activeOpacity={0.8}
                        onPress={() => imageUrl && setSelectedImage(imageUrl)}
                      >
                        {imageUrl ? (
                          <ExpoImage source={{ uri: imageUrl }} contentFit="cover" style={styles.itemImage} />
                        ) : (
                          <View style={[styles.imagePlaceholder, { backgroundColor: greyBorder }]} />
                        )}
                      </TouchableOpacity>
                      <View style={styles.itemDetails}>
                        <Text style={[styles.productName, { color: primaryTextColor }]}>{getItemLabel(item)}</Text>
                        <Text style={[styles.itemPrice, { color: secondaryTextColor }]}>
                          PKR {Number(item.unitPrice || 0).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.quantityRow}>
                      <Text style={[styles.fieldLabel, { color: primaryTextColor }]}>Quantity</Text>
                      <View style={[styles.quantityInput, { borderColor: greyBorder, backgroundColor: panelBg }]}>
                        <Text style={[styles.fieldValueText, { color: primaryTextColor }]}>
                          {item.quantity ?? '—'}
                        </Text>
                      </View>
                    </View>
                    {validImages.length ? (
                      <View style={[styles.itemPhotoSection, { borderColor: greyBorder, backgroundColor: panelBg }]}>
                        <Text style={[styles.sectionSubtitle, { color: primaryTextColor }]}>Photos of the item</Text>
                        <View style={styles.photosRow}>
                          {validImages.map((url, idx) => (
                            <TouchableOpacity
                              key={`${url}-${idx}`}
                              onPress={() => setSelectedImage(url)}
                              activeOpacity={0.8}
                            >
                              <ExpoImage
                                source={{ uri: url }}
                                contentFit="cover"
                                style={styles.photo}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.section, { borderColor: greyBorder, backgroundColor: panelBg }]}>
            <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Timeline</Text>
            {timelineEntries
              .filter(entry => entry.value)
              .map(entry => (
                <View key={entry.label} style={styles.timelineRow}>
                  <Text style={[styles.timelineLabel, { color: primaryTextColor }]}>{entry.label}</Text>
                  <View style={[styles.timelineField, { borderColor: greyBorder, backgroundColor: panelBg }]}>
                    <Text style={[styles.timelineValue, { color: primaryTextColor }]}>
                      {formatDate(entry.value)}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        </ScrollView>
        <ImagePreview visible={!!selectedImage} imageUri={selectedImage} onClose={closePreview} />
        {actionFooter ? <View style={styles.actionWrapper}>{actionFooter}</View> : null}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 16,
    paddingBottom: 24,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  infoContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'bold',
    marginBottom: 4,
  },
  fieldValue: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  fieldValueText: {
    fontSize: 15,
    fontFamily: 'regular',
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
  itemsWrapper: {
    gap: 12,
  },
  itemWrapper: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  itemImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 18,
    fontFamily: 'bold',
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: 'regular',
    marginTop: 4,
  },
  quantityRow: {
    marginTop: 12,
  },
  quantityInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  itemPhotoSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
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
    marginBottom: 12,
    marginRight: 12,
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
  actionPanel: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
  },
  actionWrapper: {
    backgroundColor: COLORS.white,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.red,
    marginRight: 12,
  },
  acceptButton: {
    backgroundColor: COLORS.black,
  },
  actionText: {
    color: COLORS.white,
    fontFamily: 'bold',
    fontSize: 16,
  },
  rejectText: {
    color: COLORS.red,
    fontFamily: 'bold',
    fontSize: 16,
  },
});

export default SellerReturnDetail;
