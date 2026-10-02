
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
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/app/context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { COLORS } from '@/constants';
import { fetchReturn, ReturnRecord, updateReturnStatus } from '@/utils/api/returns';
import { useFocusEffect } from '@react-navigation/native';
import Header from '@/components/Header';
import { getSellerRejectionReasonLabel } from '@/constants/rejectionReasons';
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

const ReturnDetailsScreen = () => {
  const params = useLocalSearchParams<{ returnId?: string }>();
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [returnDoc, setReturnDoc] = useState<ReturnRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const loadReturn = useCallback(async () => {
    if (!params.returnId || !token) return;
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
    const sub = DeviceEventEmitter.addListener('returns:updated', loadReturn);
    return () => sub.remove();
  }, [loadReturn]);

  const handleCancel = () => {
    if (!returnDoc || !token || !params.returnId) return;
    Alert.alert('Cancel return', 'Are you sure you want to cancel this return request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          setUpdating(true);
          try {
            await updateReturnStatus(params.returnId!, { status: 'cancelled' }, token);
            Alert.alert('Cancelled', 'Return request has been cancelled.');
            DeviceEventEmitter.emit('returns:updated');
            router.back();
          } catch (err) {
            Alert.alert('Error', (err as any)?.message || 'Could not cancel return');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

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
  const primaryTextColor = dark ? COLORS.white : COLORS.black;
  const secondaryTextColor = dark ? COLORS.gray3 : COLORS.gray;
  const status = (returnDoc.status || 'requested').toLowerCase();
  const orderLabel = returnDoc.order?.orderNumber
    ? `#${returnDoc.order.orderNumber}`
    : `#${String(returnDoc.order?._id || '').slice(-6).toUpperCase()}`;
  const displayStatus = status === 'received' ? 'complete' : status;
  const showRejectionInfo = status === 'rejected';
  const rejectionReasonLabel =
    getSellerRejectionReasonLabel(returnDoc.sellerRejectionReason) || returnDoc.sellerNote || '—';
  const rejectionMessage = returnDoc.sellerRejectionMessage || returnDoc.sellerNote || '—';
  const isCancelable = status === 'requested';
  const isComplete = status === 'received';
  const cancelLabel =
    status === 'rejected'
      ? 'Request Rejected'
      : isComplete
        ? 'Request Complete'
        : 'Cancel Request';
  const cancelDisabled = !isCancelable || updating;
  const showContactSupport = status === 'rejected';
  const timelineEntries = [
    { label: 'Requested', value: returnDoc.requestedAt },
    { label: 'Approved', value: returnDoc.approvedAt },
    { label: 'Rejected', value: returnDoc.rejectedAt },
    { label: 'Received', value: returnDoc.receivedAt },
    { label: 'Refunded', value: returnDoc.refundedAt },
    { label: 'Cancelled', value: returnDoc.cancelledAt },
  ];

  const renderField = (label: string, value?: string) => (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: primaryTextColor }]}>{label}</Text>
      <View style={[styles.fieldValue, { borderColor: greyBorder, backgroundColor: panelBg }]}>
        <Text style={[styles.fieldValueText, { color: primaryTextColor }]}>{value || '—'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.fill}>
        <View style={styles.headerWrapper}>
          <Header title="Return Details" onBackPress={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={[styles.scroll]} showsVerticalScrollIndicator={false}>
          {showRejectionInfo && (
          <View
            style={[
              styles.rejectionTabContainer,
              { borderColor: greyBorder, backgroundColor: panelBg },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: primaryTextColor, marginBottom: 16 },
              ]}
            >
              Rejection Info
            </Text>
            {renderField('Rejection Reason', rejectionReasonLabel)}
            {renderField('Seller Message', rejectionMessage)}
  
          </View>
          )}
          <View style={[styles.infoContainer, { borderColor: greyBorder }]}>
            {renderField('Return Number', returnDoc.returnNumber)}
            {renderField('Order Number', orderLabel)}
            {renderField('Return Status', displayStatus)}
            {renderField('Return Amount', formatCurrency(returnDoc.refundAmount, returnDoc.refundCurrency || 'PKR'))}
            {renderField('Requested On', formatDate(returnDoc.requestedAt))}
            {renderField('Reason', returnDoc.reason || '—')}
          </View>

          <View style={[styles.section, { borderColor: greyBorder, backgroundColor: panelBg }]}>
            <Text style={[styles.sectionTitle, { color: primaryTextColor }]}>Items Detail</Text>
            <View style={styles.itemsWrapper}>
              {returnDoc.items.map((item, idx) => {
                const imageUrl =
                  toAbsoluteImageUri(item.productSnapshot?.images?.[0]) ||
                  toAbsoluteImageUri(item.product?.images?.[0]);
                const normalizedItemImages = (Array.isArray(item.images) ? item.images : [])
                  .map(toAbsoluteImageUri)
                  .filter(Boolean) as string[];
                const itemLabel =
                  item.productSnapshot?.partName ||
                  item.productSnapshot?.name ||
                  'Item';
                const key = String(item.orderItemId ?? `${item.product}${idx}`);
                return (
                  <View key={key} style={[styles.itemWrapper, { borderColor: greyBorder }]}>
                    <View
                      style={[
                        styles.itemCard,
                        { borderColor: greyBorder, backgroundColor: panelBg },
                      ]}
                    >
                    <TouchableOpacity
                      style={[
                        styles.itemImageWrapper,
                        { backgroundColor: greyBorder },
                      ]}
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
                        <Text style={[styles.productName, { color: primaryTextColor }]}>{itemLabel}</Text>
                        <Text style={[styles.itemMeta, { color: secondaryTextColor }]}>Qty {item.quantity}</Text>
                        <Text style={[styles.itemMeta, { color: secondaryTextColor }]}>
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
                    {normalizedItemImages.length ? (
                      <View style={[styles.itemPhotoSection, { borderColor: greyBorder, backgroundColor: panelBg }]}>
                        <Text style={[styles.sectionSubtitle, { color: primaryTextColor }]}>Photos of the item</Text>
                        <View style={styles.photosRow}>
                          {normalizedItemImages.map((url, idx) => (
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

        <View style={styles.footer}>
          {showContactSupport ? (
            <TouchableOpacity
              style={styles.contactSupportBtn}
              onPress={() => router.push('/settingshelpcenter')}
            >
              <Text style={styles.contactSupportText}>Contact Support</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.cancelButton,
                !isCancelable && styles.cancelButtonDisabled,
              ]}
              onPress={handleCancel}
              disabled={cancelDisabled}
            >
              {updating ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: isCancelable ? COLORS.white : secondaryTextColor },
                  ]}
                >
                  {cancelLabel}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
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
  center: {
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
    marginBottom: 16,
  },
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 6,
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
  rejectionTabContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  contactButton: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 14,
    fontFamily: 'semiBold',
    textTransform: 'capitalize',
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 8,
  },
  itemPhotoSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  itemsWrapper: {
    marginTop: 4,
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
    marginLeft: 12,
  },
  productName: {
    fontSize: 15,
    fontFamily: 'bold',
  },
  itemMeta: {
    fontSize: 13,
    fontFamily: 'regular',
    marginTop: 4,
  },
  quantityRow: {
    marginTop: 8,
  },
  quantityInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
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
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 4,
  },
  photo: {
    width: 92,
    height: 92,
    borderRadius: 12,
    marginBottom: 12,
    marginRight: 12,
  },
  footer: {
    padding: 16,
  },
  cancelButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonDisabled: {
    backgroundColor: COLORS.grayscale200,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  contactSupportBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactSupportText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    color: COLORS.white,
  },
});

export default ReturnDetailsScreen;
