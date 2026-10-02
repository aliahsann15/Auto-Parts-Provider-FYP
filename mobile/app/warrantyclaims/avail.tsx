import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Image,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons } from '@/constants';
import { useAuth } from '@/app/context/AuthContext';
import { fetchMyOrders, OrderItem } from '@/utils/api/orders';
import { createWarrantyClaim, fetchBuyerWarrantyClaims, WarrantyClaim } from '@/utils/api/warranty';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { launchImagePicker } from '@/utils/ImagePickerHelper';
import ImagePickerBox from '@/components/ImagePickerBox';
import { Image as ExpoImage } from 'expo-image';
import {
  getOrderItemLabel,
  getRemainingWarrantyQuantity,
  getWarrantyExpiryDate,
  isWarrantyExpired,
} from '@/utils/warranty';
import { uploadProfileImage } from '@/utils/api/user';
import { toAbsoluteImageUri } from '@/utils/images';

const MAX_IMAGES = 3;

const AvailWarrantyScreen = () => {
  const params = useLocalSearchParams<{ orderId?: string }>();
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [claims, setClaims] = useState<WarrantyClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(params.orderId || null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [productFocused, setProductFocused] = useState(false);

  const deliveredOrders = useMemo(
    () => orders.filter(order => (order.status || '').toLowerCase() === 'delivered'),
    [orders]
  );

  const loadData = useCallback(async () => {
    if (!token) {
      setOrders([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchMyOrders(token);
      setOrders(res.orders || res.data || []);
    } catch (err) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadClaims = useCallback(async () => {
    if (!token) {
      setClaims([]);
      return;
    }
    try {
      const list = await fetchBuyerWarrantyClaims(token);
      setClaims(list);
    } catch (err) {
      setClaims([]);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadClaims();
    }, [loadData, loadClaims])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('warranties:updated', () => {
      loadClaims();
    });
    return () => sub.remove();
  }, [loadClaims]);

  const filteredOrders = useMemo(() => {
    if (!orderSearch) return [];
    const term = orderSearch.trim().toLowerCase();
    return deliveredOrders.filter(order => {
      const number = order.orderNumber ? `#${order.orderNumber}` : order._id || '';
      return number.toLowerCase().includes(term) || String(order._id || '').includes(term);
    });
  }, [deliveredOrders, orderSearch]);

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return deliveredOrders.find(
      order => order._id === selectedOrderId || String(order.id) === selectedOrderId
    ) || null;
  }, [deliveredOrders, selectedOrderId]);

  useEffect(() => {
    setSelectedItemId(null);
    setProductSearch('');
    setQuantity('');
    setImages([]);
    setQuantityError('');
    setProductFocused(false);
  }, [selectedOrderId]);

  useEffect(() => {
    if (selectedOrder) {
      setProductFocused(false);
    }
  }, [selectedOrder]);

  const orderDeliveredAt = selectedOrder?.deliveredAt || selectedOrder?.updatedAt || selectedOrder?.createdAt;

  const eligibleItems = useMemo(() => {
    if (!selectedOrder) return [];
    return (selectedOrder.items || []).filter(item => {
      const expiry = getWarrantyExpiryDate(orderDeliveredAt, item.productSnapshot || item.product);
      if (!expiry || isWarrantyExpired(expiry)) return false;
      return getRemainingWarrantyQuantity(item, claims) > 0;
    });
  }, [selectedOrder, orderDeliveredAt, claims]);

  const filteredItems = useMemo(() => {
    if (!productSearch) return [];
    const term = productSearch.trim().toLowerCase();
    return eligibleItems.filter(item => getOrderItemLabel(item).toLowerCase().includes(term));
  }, [eligibleItems, productSearch]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return eligibleItems.find(item => String(item._id || item.id || '') === selectedItemId) || null;
  }, [eligibleItems, selectedItemId]);

  const orderLabel = selectedOrder?.orderNumber
    ? `#${selectedOrder.orderNumber}`
    : selectedOrder?.id
      ? `#${String(selectedOrder.id).slice(-6).toUpperCase()}`
      : '#—';
  const productIdentifier = selectedItem
    ? selectedItem.productSnapshot?.sku ||
      selectedItem.product?.sku ||
      selectedItem.productSnapshot?.productId ||
      selectedItem.product?.productId ||
      selectedItem.productSnapshot?._id ||
      selectedItem.product?._id ||
      '—'
    : '—';

  const maxQuantity = selectedItem ? getRemainingWarrantyQuantity(selectedItem, claims) : 0;
  const orderedQuantity = Number(selectedItem?.quantity ?? 0);

  const handleQuantityChange = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (!maxQuantity) {
      setQuantity('');
      return;
    }
    if (!cleaned) {
      setQuantity('');
      setQuantityError('');
      return;
    }
    const numeric = Number(cleaned);
    if (numeric > maxQuantity) {
      setQuantity(String(maxQuantity));
      setQuantityError(`You cannot exceed ${maxQuantity}.`);
      return;
    }
    setQuantity(cleaned);
    setQuantityError('');
  };

  const handleAddImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Limit reached', `You can upload up to ${MAX_IMAGES} images.`);
      return;
    }
    const uri = await launchImagePicker();
    if (!uri) return;
    setImages(prev => [...prev, uri]);
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Auth required', 'Please login to continue.');
      return;
    }
    if (!selectedOrder || !selectedItem) {
      Alert.alert('Incomplete', 'Select an order and product to claim.');
      return;
    }
    const itemId = String(selectedItem._id || selectedItem.id || '');
    if (!itemId) {
      Alert.alert('Unavailable', 'Cannot determine the order item to claim.');
      return;
    }
    const qty = Number(quantity || maxQuantity);
    if (!qty || qty <= 0) {
      Alert.alert('Quantity required', 'Enter the quantity you want to claim.');
      return;
    }
    if (qty > maxQuantity) {
      Alert.alert('Too much', `You can claim up to ${maxQuantity} item(s).`);
      return;
    }
    setSubmitting(true);
    try {
      const uploaded: string[] = [];
      for (const uri of images) {
        const uploadedUrl = await uploadProfileImage(uri, token, 'warranties');
        uploaded.push(uploadedUrl);
      }
      await createWarrantyClaim(
        {
          orderId: selectedOrder._id,
          orderItemId: itemId,
          claimQuantity: qty,
          notes: notes.trim() || undefined,
          images: uploaded,
        },
        token
      );
      DeviceEventEmitter.emit('warranties:updated');
      Alert.alert(
        'Claim submitted',
        'Your Claim has been sent for approval to the seller.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/warrantyclaims'),
          },
        ],
        { cancelable: false }
      );
    } catch (err: any) {
      Alert.alert('Submission failed', err?.message || 'Could not submit your claim');
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeader = () => (
    <TouchableOpacity
      style={[
        styles.headerBar,
        { borderBottomColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 },
      ]}
      onPress={() => router.back()}
    >
      <View style={styles.headerRow}>
        <Image
          source={icons.back}
          resizeMode="contain"
          style={[styles.backIcon, { tintColor: dark ? COLORS.white : COLORS.black }]}
        />
        <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.black }]}>Claim Warranty</Text>
      </View>
      <View style={styles.headerSpacer} />
    </TouchableOpacity>
  );

  const renderSelectedOrderCard = () => {
    if (!selectedOrder) return null;
    const deliveredDate = selectedOrder.deliveredAt
      ? new Date(selectedOrder.deliveredAt).toLocaleDateString()
      : '—';

    return (
      <View
        style={[
          styles.selectionCard,
          {
            backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
            borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
          },
        ]}
      >
        <View style={styles.selectionCardBody}>
          <Text style={[styles.selectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>
            Order {orderLabel}
          </Text>
          <Text style={[styles.selectionMeta, { color: dark ? COLORS.gray3 : COLORS.grayscale600 }]}>
            Delivered {deliveredDate}
          </Text>
        </View>
        <View style={styles.selectionBadgeRow}>
          <TouchableOpacity
            style={styles.selectionBadgeClose}
            onPress={() => {
              setSelectedOrderId(null);
              setOrderSearch('');
              setProductSearch('');
              setSelectedItemId(null);
              setProductFocused(false);
            }}
          >
            <Text style={styles.selectionBadgeCloseText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOrderResults = () => {
    if (!orderSearch) return null;
    if (!filteredOrders.length) {
      return (
        <View style={styles.searchResults}>
          <Text style={[styles.helper, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
            No orders match that number.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.searchResults}>
        <Text style={[styles.resultHeading, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
          Results
        </Text>
        {filteredOrders.map(order => {
          const orderKey = String(order._id);
          const label = order.orderNumber
            ? `#${order.orderNumber}`
            : `#${orderKey.slice(-6).toUpperCase()}`;
          const deliveredDate = order.deliveredAt
            ? new Date(order.deliveredAt).toLocaleDateString()
            : '—';
          return (
            <TouchableOpacity
              key={orderKey}
              style={[
                styles.selectionCard,
                styles.orderResultCard,
                {
                  borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                  backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                },
              ]}
              onPress={() => {
                setSelectedOrderId(order._id);
                setOrderSearch('');
              }}
            >
              <View style={styles.selectionCardBody}>
                <Text style={[styles.selectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                  {label}
                </Text>
                <Text style={[styles.selectionMeta, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                  Delivered {deliveredDate}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderSelectedProductCard = () => {
    if (!selectedItem) return null;

    return (
      <View
        style={[
          styles.selectionCard,
          {
            backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100,
            borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
          },
        ]}
      >
        <View style={styles.selectionCardBody}>
          <Text style={[styles.selectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>
            {getOrderItemLabel(selectedItem)}
          </Text>
          <Text style={[styles.selectionSubtitle, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
            Quantity: {selectedItem.quantity ?? 1}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.selectionBadgeClose}
          onPress={() => setSelectedItemId(null)}
        >
          <Text style={styles.selectionBadgeCloseText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderProductResults = () => {
    if (!productSearch || !selectedOrder) return null;
    if (!filteredItems.length) {
      return (
        <View style={styles.searchResults}>
          <Text style={[styles.helper, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
            No products match that search.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.searchResults}>
        <Text style={[styles.resultHeading, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
          Results
        </Text>
        {filteredItems.map(item => {
          const itemId = String(item._id || item.id || '');
          const itemImage =
            toAbsoluteImageUri(item.productSnapshot?.images?.[0]) ||
            toAbsoluteImageUri(item.product?.images?.[0]);
          return (
            <TouchableOpacity
              key={itemId}
              style={[
                styles.productItem,
                selectedItemId === itemId && styles.productItemSelected,
                {
                  borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                  backgroundColor:
                    selectedItemId === itemId
                      ? COLORS.primary
                      : dark
                        ? COLORS.dark2
                        : COLORS.white,
                },
              ]}
              onPress={() => {
                setSelectedItemId(itemId);
                setProductSearch('');
              }}
            >
              <View
                style={[
                  styles.resultImageWrapper,
                  {
                    backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                  },
                ]}
              >
                {itemImage ? (
                  <ExpoImage source={{ uri: itemImage }} contentFit="cover" style={styles.resultImage} />
                ) : (
                  <View style={styles.imagePlaceholder} />
                )}
              </View>
              <View style={styles.resultContent}>
                <Text
                  style={[
                    styles.resultTitle,
                    selectedItemId === itemId
                      ? { color: COLORS.white }
                      : { color: dark ? COLORS.white : COLORS.black },
                  ]}
                >
                  {getOrderItemLabel(item)}
                </Text>
                <Text
                  style={[
                    styles.resultMeta,
                    selectedItemId === itemId
                      ? { color: COLORS.white }
                      : { color: dark ? COLORS.gray3 : COLORS.gray },
                  ]}
                >
                  Quantity: {item.quantity ?? 1}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.fill}>
        {renderHeader()}
        <View style={styles.subtitleContainer}>
          <Text style={[styles.subtitleText, { color: COLORS.black }]}>
            Select the order and product to start
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.searchSection}>
            <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black }]}>Order number</Text>
            <TextInput
              value={orderSearch}
              onChangeText={setOrderSearch}
              placeholder="Search order number"
              placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
              style={[
                styles.searchInput,
                {
                  borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                  backgroundColor: dark ? COLORS.dark3 : COLORS.white,
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
              onFocus={() => setProductFocused(false)}
            />
            {!orderSearch && !selectedOrder && (
              <Text
                style={[
                  styles.helper,
                  { color: dark ? COLORS.gray3 : COLORS.gray, marginTop: 2 },
                ]}
              >
                Enter an order number to start.
              </Text>
            )}
            {renderOrderResults()}
            {renderSelectedOrderCard()}
          </View>

          <View style={styles.searchSection}>
            <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black }]}>Product</Text>
            <TextInput
              value={productSearch}
              onChangeText={setProductSearch}
              placeholder="Search product"
              placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
              style={[
                styles.searchInput,
                {
                  borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                  backgroundColor: dark ? COLORS.dark3 : COLORS.white,
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
              editable={Boolean(selectedOrder)}
              onFocus={() => setProductFocused(true)}
            />
            {!selectedOrder && (
              <Text
                style={[
                  styles.helper,
                  { color: COLORS.gray, marginTop: 2 },
                ]}
              >
                Please Select Order first
              </Text>
            )}
            {selectedOrder && (
              <>
                {renderSelectedProductCard()}
                {renderProductResults()}
              </>
            )}
          </View>

          {selectedItem ? (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                  {getOrderItemLabel(selectedItem)}
                </Text>
                <Text
                  style={[
                    styles.warrantyText,
                    { color: dark ? COLORS.white : COLORS.gray3 },
                  ]}
                  numberOfLines={1}
                >
                  Warranty valid until{' '}
                  {getWarrantyExpiryDate(orderDeliveredAt, selectedItem.productSnapshot || selectedItem.product)
                    ? new Date(
                        getWarrantyExpiryDate(orderDeliveredAt, selectedItem.productSnapshot || selectedItem.product)!
                      ).toLocaleDateString()
                    : '—'}
                </Text>
              </View>
              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black, marginTop: 16 }]}>
                Order number
              </Text>
              <TextInput
                value={orderLabel}
                editable={false}
                style={[
                  styles.fieldInput,
                  {
                    borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    color: dark ? COLORS.white : COLORS.black,
                  },
                ]}
              />
              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black, marginTop: 12 }]}>
                Product ID
              </Text>
              <TextInput
                value={productIdentifier}
                editable={false}
                style={[
                  styles.fieldInput,
                  {
                    borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    color: dark ? COLORS.white : COLORS.black,
                  },
                ]}
              />
              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black, marginTop: 12 }]}>
                Quantity
              </Text>
              <TextInput
                keyboardType="number-pad"
                value={quantity}
                onChangeText={handleQuantityChange}
                placeholder={`Up to ${maxQuantity || orderedQuantity || 1}`}
                placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
                style={[
                  styles.fieldInput,
                  {
                    borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    color: dark ? COLORS.white : COLORS.black,
                  },
                ]}
              />
              {quantityError ? (
                <Text style={styles.errorText}>{quantityError}</Text>
              ) : null}
              <Text style={[styles.label, { marginTop: 12, color: dark ? COLORS.white : COLORS.black }]}>
                Add Photos of the Damaged Item To Claim a Warranty of the Product
              </Text>
              <View style={styles.imageRow}>
                {images.map((uri, idx) => (
                  <ImagePickerBox
                    key={`${uri}-${idx}`}
                    uri={uri}
                    onPick={handleAddImage}
                    onDelete={() => handleRemoveImage(idx)}
                  />
                ))}
                {images.length < MAX_IMAGES && (
                  <ImagePickerBox uri="" onPick={handleAddImage} onDelete={() => {}} />
                )}
              </View>
              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black, marginTop: 16 }]}>Notes (Optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add a reason for warranty claim"
                placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
                style={[
                  styles.textArea,
                  {
                    borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    color: dark ? COLORS.white : COLORS.black,
                  },
                ]}
                multiline
                numberOfLines={4}
              />
            </View>
          ) : null}
        </ScrollView>
        <View
          style={[
            styles.submitArea,
            { borderTopColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: COLORS.black,
                opacity: submitting || !selectedItem ? 0.5 : 1,
              },
            ]}
            disabled={submitting || !selectedItem}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitText}>Claim Warranty</Text>
            )}
          </TouchableOpacity>
        </View>
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
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
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
  },
  headerSpacer: {
    width: 24,
    height: 24,
  },
  subtitleContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    marginTop: 24,
  },
  subtitleText: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 96,
  },
  label: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 6,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontFamily: 'regular',
    marginBottom: 8,
  },
  searchResults: {
    marginBottom: 16,
  },
  list: {
    marginBottom: 16,
  },
  orderItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  orderItemSelected: {
    borderWidth: 2,
  },
  orderLabel: {
    fontSize: 16,
    fontFamily: 'bold',
  },
  orderDate: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 6,
  },
  productItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productItemSelected: {
    borderWidth: 2,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: 'bold',
  },
  resultMeta: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  resultHeading: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 8,
  },
  helper: {
    fontSize: 13,
    fontFamily: 'regular',
  },
  selectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionCardBody: {
    flex: 1,
    marginRight: 8,
  },
  selectionTitle: {
    fontSize: 16,
    fontFamily: 'bold',
  },
  selectionMeta: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  selectionSubtitle: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  selectionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  selectionBadgeClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBadgeCloseText: {
    color: COLORS.white,
    fontFamily: 'bold',
    fontSize: 16,
  },
  orderResultCard: {
    marginBottom: 8,
  },
  resultImageWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.grayscale200,
  },
  resultContent: {
    flex: 1,
  },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'bold',
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: 'regular',
    marginTop: 4,
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  warrantyText: {
    fontSize: 12,
    fontFamily: 'semiBold',
    textAlign: 'right',
    flexShrink: 0,
    marginLeft: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: 'regular',
    marginBottom: 12,
  },
  submitArea: {
    borderTopWidth: 1,
    padding: 16,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'bold',
    color: COLORS.white,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 12,
    fontFamily: 'regular',
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 32,
  },
});

export default AvailWarrantyScreen;
