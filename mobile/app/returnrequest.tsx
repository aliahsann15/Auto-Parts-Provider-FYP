import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons } from '@/constants';
import { useAuth } from './context/AuthContext';
import { fetchOrder, OrderItem } from '@/utils/api/orders';
import { createReturn } from '@/utils/api/returns';
import { launchImagePicker } from '@/utils/ImagePickerHelper';
import ImagePickerBox from '@/components/ImagePickerBox';
import ReasonItem from '@/components/ReasonItem';
import { uploadProfileImage } from '@/utils/api/user';
import { Image } from 'expo-image';

const REASONS = [
  'Wrong item delivered',
  'Arrived damaged',
  'Defective part',
  'Changed mind',
  'Other',
];

type ReturnableOrderItem = NonNullable<OrderItem['items']>[number] & {
  _id?: string;
  productSnapshot?: any;
  returnDays?: number;
  pendingReturnQuantity?: number;
  returnableQuantity?: number;
}

const MS_DAY = 24 * 60 * 60 * 1000;
const MAX_IMAGES_PER_ITEM = 3;

const ReturnRequestScreen = () => {
  const params = useLocalSearchParams<{ orderId?: string; orderNumber?: string }>();
  const navigation = useNavigation<NavigationProp<any>>();
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [order, setOrder] = useState<OrderItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [itemImages, setItemImages] = useState<Record<string, string[]>>({});
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);

  const getItemReturnWindow = (item: ReturnableOrderItem) =>
    Number(
      item.returnDays ??
      item.productSnapshot?.returnDays ??
      item.product?.returnDays ??
      0
    );

  const eligibleItems = useMemo<ReturnableOrderItem[]>(() => {
    if (!order?.items?.length) return [];
    return (order.items as ReturnableOrderItem[]).filter(item => {
      const availableQty = Number(item.returnableQuantity ?? item.quantity ?? 0);
      const hasPending = Number(item.pendingReturnQuantity ?? 0) > 0;
    return getItemReturnWindow(item) > 0 && availableQty > 0;
    });
  }, [order]);

  const orderBaseDate = useMemo(() => {
    if (!order) return null;
    const base = order.deliveredAt || order.updatedAt || order.createdAt;
    return base ? new Date(base) : null;
  }, [order]);

  const eligibleItemsMap = useMemo(() => {
    const map = new Map<string, ReturnableOrderItem>();
    eligibleItems.forEach(item => {
      const id = String(item._id || '');
      if (id) map.set(id, item);
    });
    return map;
  }, [eligibleItems]);

  const selectedItems = useMemo(
    () => selectedItemIds.map(id => eligibleItemsMap.get(id)).filter(Boolean) as ReturnableOrderItem[],
    [eligibleItemsMap, selectedItemIds]
  );

  const filteredResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return eligibleItems;
    return eligibleItems.filter(item => {
      const label =
        item.productSnapshot?.partName ||
        item.productSnapshot?.name ||
        item.product?.name ||
        '';
      return label.toLowerCase().includes(term);
    });
  }, [eligibleItems, searchTerm]);

  const loadOrder = useCallback(async () => {
    if (!params.orderId) {
      Alert.alert('Missing order', 'Order ID missing for return request.');
      navigation.goBack();
      return;
    }
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchOrder(token, params.orderId);
      setOrder(data);
    } catch (err: any) {
      Alert.alert('Order', err?.message || 'Could not load order');
    } finally {
      setLoading(false);
    }
  }, [navigation, params.orderId, token]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('returns:updated', loadOrder);
    return () => sub.remove();
  }, [loadOrder]);

  const deliveredAt = useMemo(() => {
    if (!order) return null;
    return order.deliveredAt || order.updatedAt || order.createdAt || null;
  }, [order]);

  const getItemLabel = (item: ReturnableOrderItem) =>
    item.productSnapshot?.partName ||
    item.productSnapshot?.name ||
    item.product?.name ||
    'Item';

  const getItemPrimaryImage = (item: ReturnableOrderItem) =>
    (item.productSnapshot?.images?.[0] as string | undefined) ||
    (item.product?.images?.[0] as string | undefined) ||
    undefined;

  const getReturnDeadlineLabel = (item: ReturnableOrderItem) => {
    const days = getItemReturnWindow(item);
    if (!days) return 'Return window unavailable';
    if (!orderBaseDate) {
      return `${days} day${days === 1 ? '' : 's'} window`;
    }
    const deadline = new Date(orderBaseDate.getTime() + days * MS_DAY);
    return `Return before ${deadline.toLocaleDateString()}`;
  };

  const handleSelectItem = (item: ReturnableOrderItem) => {
    const itemId = String(item._id || '');
    if (!itemId) return;
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(prev => prev.filter(id => id !== itemId));
      setItemQuantities(prev => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
      setItemErrors(prev => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
      setItemImages(prev => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
      return;
    }
    const defaultQty = Math.max(1, Number(item.returnableQuantity ?? item.quantity ?? 1));
    setSelectedItemIds(prev => [...prev, itemId]);
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: prev[itemId] ?? String(defaultQty),
    }));
  };

  const handleQuantityChange = (itemId: string, value: string, maxQty: number) => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (cleaned === '') {
      setItemQuantities(prev => ({ ...prev, [itemId]: '' }));
      setItemErrors(prev => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
      return;
    }
    const numeric = Number(cleaned);
    if (numeric > maxQty) {
      setItemQuantities(prev => ({ ...prev, [itemId]: String(maxQty) }));
      setItemErrors(prev => ({ ...prev, [itemId]: `You can’t exceed ${maxQty} units.` }));
      return;
    }
    setItemQuantities(prev => ({ ...prev, [itemId]: String(numeric) }));
    setItemErrors(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleAddImageForItem = async (itemId: string) => {
    if (!token) {
      Alert.alert('Authentication required', 'Please sign in to upload images.');
      return;
    }
    try {
      const picked = await launchImagePicker();
      if (!picked) return;
      setItemImages(prev => {
        const existing = prev[itemId] || [];
        if (existing.length >= MAX_IMAGES_PER_ITEM) {
          Alert.alert('Limit reached', `You can upload up to ${MAX_IMAGES_PER_ITEM} images per item.`);
          return prev;
        }
        return { ...prev, [itemId]: [...existing, picked] };
      });
    } catch (err: any) {
      Alert.alert('Upload failed', err?.toString?.() || 'Could not pick image');
    }
  };

  const handleRemoveImageForItem = (itemId: string, index: number) => {
    setItemImages(prev => {
      const current = prev[itemId] || [];
      const next = current.filter((_, idx) => idx !== index);
      if (next.length === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Authentication required', 'Please login to continue.');
      return;
    }

    if (!order) {
      Alert.alert('Order missing', 'Unable to load order items.');
      return;
    }

    if (!selectedItems.length) {
      Alert.alert('Select items', 'Please select at least one item to return.');
      return;
    }

    const freshMap = new Map<string, ReturnableOrderItem>();
    eligibleItems.forEach(item => {
      const id = String(item._id || '');
      if (id) freshMap.set(id, item);
    });

    const payloadItems = selectedItemIds.flatMap(id => {
      const item = freshMap.get(id);
      if (!item) return [];
      const availableQty = Math.max(1, Number(item.returnableQuantity ?? item.quantity ?? 0));
      const rawQty = Number(itemQuantities[id] ?? availableQty);
      const qty = Math.max(1, Math.min(availableQty, Number.isFinite(rawQty) ? rawQty : availableQty));
      if (qty <= 0) return [];
      return [{ orderItemId: id, quantity: qty, reason: selectedReason }];
    });

    if (!payloadItems.length) {
      Alert.alert('Quantity missing', 'Enter valid quantities for your selected items.');
      return;
    }

    setSubmitting(true);
    setUploading(true);
    try {
      const uploadedItemImages: Record<string, string[]> = {};
      for (const item of payloadItems) {
        const itemId = item.orderItemId;
        if (!itemId) continue;
        const uris = itemImages[itemId] || [];
        const uploaded: string[] = [];
        for (const uri of uris) {
          const uploadUrl = await uploadProfileImage(uri, token, 'returns');
          uploaded.push(uploadUrl);
        }
        uploadedItemImages[itemId] = uploaded;
      }

      const itemsWithImages = payloadItems.map(item => ({
        ...item,
        images: uploadedItemImages[item.orderItemId] || [],
      }));
      const aggregatedImages = Object.values(uploadedItemImages).flat();

      const created = await createReturn(
        {
          orderId: params.orderId!,
          items: itemsWithImages,
          reason: selectedReason,
          note,
          images: aggregatedImages,
        },
        token
      )

      DeviceEventEmitter.emit('returns:updated');
      const showBankDetailsPopup = () => {
        if (created?._id) {
          router.push(
            `/addaccount?returnId=${created._id}&redirectTo=/returns/${created._id}`
          );
          return;
        }
        router.push('/returns');
      };
      Alert.alert(
        'Return requested',
        'Your return is under review. Please add your bank details so we can refund you once the return is approved.',
        [{ text: 'Add bank details', onPress: showBankDetailsPopup }],
        { cancelable: false }
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not submit return');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (loading && !order) {
    return (
      <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <View style={[styles.header, { borderBottomColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image source={icons.back} style={[styles.backIcon, { tintColor: dark ? COLORS.white : COLORS.black }]} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.black }]}>Request Return</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.fieldLabel, { color: dark ? COLORS.white : COLORS.black }]}>Order</Text>
          <View style={[styles.card, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]}>
            <Text style={[styles.cardTitle, { color: dark ? COLORS.white : COLORS.black }]}>
              {params.orderNumber || buildOrderLabel(order)}
            </Text>
            <Text style={[styles.cardSubtitle, { color: dark ? COLORS.grayscale400 : COLORS.gray }]}>
              Delivered {deliveredAt ? new Date(deliveredAt).toLocaleDateString() : '—'}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { color: dark ? COLORS.white : COLORS.black }]}>
            Select items that you want to return
          </Text>
          {eligibleItems.length ? (
            <>
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search products in this order"
                placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
                style={[
                  styles.searchInput,
                  {
                    borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                    backgroundColor: dark ? COLORS.dark3 : COLORS.white,
                    color: dark ? COLORS.white : COLORS.black,
                  },
                ]}
              />
              <View style={styles.searchResults}>
                {filteredResults.length ? (
                  filteredResults.map((item, index) => {
                    const itemId = String(item._id || index);
                    const isSelected = selectedItemIds.includes(itemId);
                    const availableQty = Math.max(0, Number(item.returnableQuantity ?? item.quantity ?? 0));
                    return (
                      <TouchableOpacity
                        key={itemId}
                        onPress={() => handleSelectItem(item)}
                        style={[
                          styles.resultItem,
                          isSelected && styles.resultItemSelected,
                          {
                            borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                            backgroundColor: dark
                              ? isSelected
                                ? COLORS.dark3
                                : COLORS.dark2
                              : isSelected
                                ? COLORS.grayscale200
                                : COLORS.white,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.resultImageWrapper,
                            {
                              backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                              borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                            },
                          ]}
                        >
                          {(() => {
                            const primary = getItemPrimaryImage(item);
                            if (primary) {
                              return (
                                <Image
                                  source={{ uri: primary }}
                                  contentFit="cover"
                                  style={styles.resultImage}
                                />
                              );
                            }
                            return <View style={[styles.imagePlaceholder, { backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]} />;
                          })()}
                        </View>
                        <View style={styles.resultContent}>
                          <Text style={[styles.resultTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                            {getItemLabel(item)}
                          </Text>
                          <Text style={[styles.resultMeta, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                            Return window {getItemReturnWindow(item)} days
                          </Text>
                          <Text style={[styles.resultMetaSmall, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                            {availableQty} item{availableQty === 1 ? '' : 's'} remaining
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>Selected</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={[styles.helper, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                    No products match your search.
                  </Text>
                )}
              </View>
            </>
          ) : (
            <Text style={[styles.helper, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
              This order does not have any returnable items.
            </Text>
          )}

          {selectedItems.length ? (
            selectedItems.map((item, index) => {
              const itemId = String(item._id || index);
              const availableQty = Math.max(1, Number(item.returnableQuantity ?? item.quantity ?? 1));
              const quantityValue = itemQuantities[itemId] ?? String(availableQty);
              const maxQty = availableQty;
              const photos = itemImages[itemId] || [];
              return (
                <View
                  key={itemId}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                      borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                    },
                  ]}
                >
                  <View style={styles.selectedItemHeader}>
                    <Text
                      style={[
                        styles.itemTitle,
                        styles.selectedItemTitle,
                        { color: dark ? COLORS.white : COLORS.black },
                      ]}
                    >
                      {getItemLabel(item)}
                    </Text>
                    <Text style={[styles.sectionMeta, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                      {getReturnDeadlineLabel(item)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.fieldLabel,
                      styles.quantityLabelSpacing,
                      { color: dark ? COLORS.white : COLORS.black },
                    ]}
                  >
                    Quantity
                  </Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={quantityValue}
                    onChangeText={val => handleQuantityChange(itemId, val, maxQty)}
                    style={[
                      styles.input,
                      {
                        borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                        color: dark ? COLORS.white : COLORS.black,
                      },
                    ]}
                    placeholder={`Up to ${maxQty}`}
                    placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
                  />
                  {itemErrors[itemId] ? (
                    <Text style={styles.quantityError}>{itemErrors[itemId]}</Text>
                  ) : null}
                  <Text style={[styles.fieldLabel, { marginTop: 12, color: dark ? COLORS.white : COLORS.black }]}>
                    Add Pictures of the item so that seller can check the condition of the item
                  </Text>
                  <View style={styles.imageRow}>
                    {photos.map((uri, idx) => (
                      <ImagePickerBox
                        key={`${uri}-${idx}`}
                        uri={uri}
                        onPick={() => handleAddImageForItem(itemId)}
                        onDelete={() => handleRemoveImageForItem(itemId, idx)}
                      />
                    ))}
                    {photos.length < MAX_IMAGES_PER_ITEM && (
                      <ImagePickerBox uri="" onPick={() => handleAddImageForItem(itemId)} onDelete={() => {}} />
                    )}
                  </View>
                </View>
              );
            })
          ) : eligibleItems.length ? (
            <Text style={[styles.helper, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
              Choose at least one item above to continue.
            </Text>
          ) : null}

          {selectedItems.length ? (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 8, color: dark ? COLORS.white : COLORS.black }]}>Reason</Text>
              {REASONS.map(reason => (
                <ReasonItem
                  key={reason}
                  checked={selectedReason === reason}
                  onPress={() => setSelectedReason(reason)}
                  title={reason}
                />
              ))}
              <Text style={[styles.fieldLabel, { color: dark ? COLORS.white : COLORS.black }]}>Notes (optional)</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                style={[
                  styles.textArea,
                  {
                    borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                    color: dark ? COLORS.white : COLORS.black,
                    marginBottom: 12,
                  },
                ]}
                multiline
                numberOfLines={4}
                placeholder="Add a note for the seller"
                placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
              />
            </>
          ) : null}
        </ScrollView>
        <View style={styles.submitArea}>
          {eligibleItems.length ? (
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: (submitting || !selectedItems.length) ? COLORS.gray : COLORS.primary }]}
              onPress={handleSubmit}
              disabled={submitting || !selectedItems.length}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitText}>Submit return request</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.viewReturnsBtn, { backgroundColor: COLORS.black }]}
              onPress={() => router.push('/returns')}
            >
              <Text style={styles.viewReturnsText}>View returns</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const buildOrderLabel = (order: OrderItem | null) => {
  if (!order) return 'Order'
  if (order.orderNumber) return `#${order.orderNumber}`
  const id = order._id || order.id
  return id ? `#${String(id).slice(-6).toUpperCase()}` : 'Order'
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'bold',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  scroll: {
    padding: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'bold',
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: 'regular',
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 6,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontFamily: 'bold',
  },
  itemMeta: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  helper: {
    fontSize: 13,
    fontFamily: 'regular',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    fontFamily: 'regular',
    marginBottom: 12,
  },
  searchResults: {
    marginBottom: 12,
  },
  resultItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultItemSelected: {
    borderWidth: 2,
  },
  resultImageWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  resultContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  resultTitle: {
    fontSize: 15,
    fontFamily: 'bold',
  },
  resultMeta: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  resultMetaSmall: {
    fontSize: 11,
    fontFamily: 'regular',
    marginTop: 2,
  },
  selectedBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selectedBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: 'semiBold',
  },
  selectedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
  },
  sectionMeta: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  selectedItemTitle: {
    fontSize: 17,
  },
  quantityLabelSpacing: {
    marginTop: 8,
  },
  quantityError: {
    color: 'red',
    fontSize: 12,
    fontFamily: 'regular',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontFamily: 'regular',
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: 'regular',
  },
  imageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 12,
  },
  submitArea: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: COLORS.white,
    fontFamily: 'bold',
    fontSize: 16,
  },
  viewReturnsBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewReturnsText: {
    color: COLORS.white,
    fontFamily: 'semiBold',
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ReturnRequestScreen;
