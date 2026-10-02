import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-virtualized-view';
import { useTheme } from '../theme/ThemeProvider';
import { COLORS, SIZES, icons } from '../constants';
import HeaderWithSearch from '../components/HeaderWithSearch';
import ButtonFilled from '../components/ButtonFilled';
import { NavigationProp } from '@react-navigation/native';
import OrderListItem from '@/components/OrderListItem';
import { useNavigation, useLocalSearchParams } from 'expo-router';
import { getCart } from '@/utils/api/cart';
import { fetchAddresses } from '@/utils/api/addresses';
import { useAuth } from './context/AuthContext';
import { API_BASE_URL } from '@/utils/api/client';
import { applyPromoCode as applyPromoCodeApi } from '@/utils/api/promocodes';
import { createEphemeralKey, createPaymentIntent } from '@/utils/api/payments';
import { fetchStoreBySellerId } from '@/utils/api/store';
// import { useStripe } from '@stripe/stripe-react-native';

const PARCELS = [
  { code: 'S' as const, maxVolume: 280 },
  { code: 'M' as const, maxVolume: 840 },
  { code: 'L' as const, maxVolume: 2160 },
  { code: 'XL' as const, maxVolume: 24000 },
];

const SHIPPING_TIERS: Record<'eco' | 'regular' | 'express', { eta: string; minDays: number; maxDays: number; prices: Record<'S' | 'M' | 'L' | 'XL', number> }> = {
  eco: { eta: '3-5 business days', minDays: 3, maxDays: 5, prices: { S: 250, M: 350, L: 550, XL: 1800 } },
  regular: { eta: '2-3 business days', minDays: 2, maxDays: 3, prices: { S: 350, M: 500, L: 750, XL: 2600 } },
  express: { eta: '1-2 business days', minDays: 1, maxDays: 2, prices: { S: 550, M: 750, L: 1100, XL: 3800 } },
};

const addBusinessDays = (start: Date, days: number) => {
  const date = new Date(start);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }
  return date;
};

const formatRange = (start: Date, end: Date) => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = monthNames[start.getMonth()];
  const endMonth = monthNames[end.getMonth()];
  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
};

const Checkout = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { colors, dark } = useTheme();
  const { token, isLoggedIn } = useAuth();
  const params = useLocalSearchParams<{ selectedAddress?: string; shippingMethod?: string }>();
  const promoInputRef = React.useRef<TextInput>(null);
  const [items, setItems] = React.useState<Array<any>>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedAddress, setSelectedAddress] = React.useState<any>(null);
  const [shippingMethod, setShippingMethod] = React.useState<'eco' | 'regular' | 'express'>('regular');
  const [inspectionSelected, setInspectionSelected] = React.useState(false);
  const [promoInput, setPromoInput] = React.useState('');
  const [promoDiscount, setPromoDiscount] = React.useState(0);
  const [appliedPromo, setAppliedPromo] = React.useState<string | null>(null);
  const [promoMessage, setPromoMessage] = React.useState<string | null>(null);
  const [payLoading, setPayLoading] = React.useState(false);
  const [storeNames, setStoreNames] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    const input = promoInputRef.current;
    if (!input) return;
    if (typeof input.isFocused === 'function' && input.isFocused()) {
      return;
    }
    const handle = setTimeout(() => {
      input.focus();
    }, 50);
    return () => clearTimeout(handle);
  }, [promoInput]);
  // const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const apiBase = API_BASE_URL.replace(/\/api$/, '');

  const loadStoreNames = React.useCallback(
    async (sellerIds: string[]) => {
      const unique = Array.from(new Set(sellerIds.filter(Boolean)));
      const missing = unique.filter(id => !storeNames[id]);
      if (!missing.length) return;
      const updates: Record<string, string> = {};
      await Promise.all(
        missing.map(async id => {
          try {
            const res = await fetchStoreBySellerId(id, token || undefined);
            const name = (res as any)?.store?.storeName;
            if (name) updates[id] = name;
          } catch {
            // ignore
          }
        })
      );
      if (Object.keys(updates).length) {
        setStoreNames(prev => ({ ...prev, ...updates }));
      }
    },
    [storeNames, token]
  );

  React.useEffect(() => {
    const loadCart = async () => {
      if (!token) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const res = await getCart(token);
        const mapped = (res.items || []).map((entry: any, idx: number) => {
          const prod = entry.product || {};
          const firstImage = Array.isArray(prod.images) ? prod.images[0] : undefined;
          const resolvedImage =
            firstImage && typeof firstImage === 'string'
              ? (firstImage.startsWith('http') ? firstImage : `${apiBase}${firstImage}`)
              : icons.box;
          const price = prod.price ?? 0;
          const salePrice = typeof prod.salePrice === 'number' ? prod.salePrice : undefined;
          const rating = Number(prod.averageRating ?? prod.rating ?? 0);
          const numReviews = Number(prod.totalReviews ?? prod.reviewsCount ?? prod.reviews?.length ?? 0);
          const dim = prod.dimensions || {};
          const volume = Number(dim.length ?? 0) * Number(dim.width ?? 0) * Number(dim.height ?? 0);
          const vehicleLabel = [prod.make, prod.carModel, prod.variant].filter(Boolean).join(' ').trim();
          const displayName = vehicleLabel ? `${vehicleLabel} ${prod.name || ''}`.trim() : (prod.name || 'Product');
          const sellerId = (prod.seller && (prod.seller._id || prod.seller)) || 'unknown';
          const storeName = prod.sellerName || prod.storeName || '';
          const categories = (Array.isArray(prod.categories) ? prod.categories : [])
            .map((cat: any) => {
              if (!cat) return null;
              if (typeof cat === 'string') return cat;
              return (
                cat.name ||
                cat.title ||
                cat.slug ||
                cat._id ||
                cat.id ||
                cat.toString?.() ||
                null
              );
            })
            .filter(Boolean);
          return {
            id: prod._id || String(idx),
            name: displayName,
            image: resolvedImage,
            price,
            salePrice,
            rating,
            numReviews,
            quantity: entry.quantity || 1,
            color: COLORS.primary,
            volume,
            sellerId,
            storeName,
            categories,
          };
        });
        const sellerIds = mapped.map(m => m.sellerId).filter(Boolean);
        loadStoreNames(sellerIds);
        setItems(mapped);
      } catch (err) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    loadCart();
  }, [token, isLoggedIn, loadStoreNames]);

  React.useEffect(() => {
    const loadDefaultAddress = async () => {
      if (!token || selectedAddress) return;
      try {
        const res = await fetchAddresses(token);
        const list = res.addresses || [];
        const def = list.find((a: any) => a.isDefault) || list[0];
        if (def) setSelectedAddress(def);
      } catch {
        // ignore
      }
    };
    loadDefaultAddress();
  }, [token, isLoggedIn, selectedAddress]);

  React.useEffect(() => {
    if (params.selectedAddress) {
      try {
        setSelectedAddress(JSON.parse(params.selectedAddress as string));
      } catch { }
    }
    const sm = (params.shippingMethod as string)?.toLowerCase();
    if (sm === 'eco' || sm === 'regular' || sm === 'express') {
      setShippingMethod(sm);
    }
  }, [params.selectedAddress, params.shippingMethod]);

  const sellerVolumes = React.useMemo(() => {
    const bySeller: Record<string, number> = {};
    items.forEach((item: any) => {
      const sellerId = item.sellerId || 'unknown';
      const volume = Number(item.volume || 0) * Number(item.quantity || 1);
      bySeller[sellerId] = (bySeller[sellerId] || 0) + volume;
    });
    return bySeller;
  }, [items]);

  const totalVolume = items.reduce((sum, item) => sum + Number(item.volume || 0) * Number(item.quantity || 1), 0);
  const effectivePrice = (item: any) => Number(item.salePrice ?? item.price ?? 0);
  const subtotal = items.reduce((sum, item) => sum + effectivePrice(item) * Number(item.quantity || 1), 0);

  const inspectionFee = inspectionSelected ? 10000 : 0;

  const shippingCalc = React.useMemo(() => {
    const tier = SHIPPING_TIERS[shippingMethod];
    // Group volumes by seller so each seller's items get one parcel charge
    const volumeBySeller: Record<string, number> = {};
    items.forEach((item: any) => {
      const sellerId = item.sellerId || 'unknown';
      const volume = Number(item.volume || 0) * Number(item.quantity || 1);
      volumeBySeller[sellerId] = (volumeBySeller[sellerId] || 0) + volume;
    });

    let deliveryFee = 0;
    Object.values(volumeBySeller).forEach(volume => {
      const parcel = PARCELS.find(p => volume <= p.maxVolume) || PARCELS[PARCELS.length - 1];
      deliveryFee += tier?.prices?.[parcel.code] ?? 0;
    });

    // If no sellers/items, fall back to zero
    const today = new Date();
    const start = tier ? addBusinessDays(today, tier.minDays) : today;
    const end = tier ? addBusinessDays(today, tier.maxDays) : today;
    return { deliveryFee, eta: tier?.eta, range: formatRange(start, end) };
  }, [items, shippingMethod, totalVolume]);

  const deliveryFee = shippingCalc.deliveryFee;
  const promo = promoDiscount;
  const total = subtotal + deliveryFee + inspectionFee - promo;

  const handleApplyPromo = async () => {
    setPromoMessage(null);
    const normalized = promoInput.trim().toUpperCase();
    if (!normalized) {
      setPromoMessage('Enter a promo code');
      return;
    }
    if (!items.length) {
      setPromoMessage('Cart is empty');
      return;
    }
    const payloadItems = items
      .map((i: any) => ({
        productId: i.id,
        quantity: i.quantity || 1,
        sellerId: i.sellerId,
        price: Number(i.salePrice ?? i.price ?? 0),
        categories: Array.isArray(i.categories) ? i.categories : [],
      }))
      .filter(i => !!i.productId);
    if (!payloadItems.length) {
      setPromoMessage('No valid items for promo');
      return;
    }
    try {
      const res = await applyPromoCodeApi(normalized, payloadItems);
      setPromoDiscount(res.discount || 0);
      setAppliedPromo(res.promo?.code || normalized);
      setPromoMessage('Promo applied!');
    } catch (err: any) {
      setPromoDiscount(0);
      setAppliedPromo(null);
      setPromoMessage(err?.message || 'Failed to apply promo');
    }
  };

  const clearPromo = () => {
    setPromoDiscount(0);
    setAppliedPromo(null);
    setPromoInput('');
    setPromoMessage(null);
  };

  const goToPayment = () => {
    if (!token) {
      Alert.alert('Login required', 'Please sign in to place an order.');
      return;
    }
    if (!items.length) {
      Alert.alert('Cart is empty', 'Add items before checking out.');
      return;
    }
    if (!selectedAddress) {
      Alert.alert('Address required', 'Please select a shipping address.');
      return;
    }

    navigation.navigate('checkoutpayment', {
      address: JSON.stringify(selectedAddress),
      shippingFee: String(deliveryFee),
      inspectionFee: String(inspectionFee),
      promoDiscount: String(promo),
      total: String(total),
      shippingMethod,
      arrivalText: shippingCalc.range || '',
    } as any);
  };

  // const handleStripePay = async () => {
  //   if (!token) {
  //     Alert.alert('Login required', 'Please sign in to pay.');
  //     return;
  //   }
  //   if (total <= 0) {
  //     Alert.alert('Invalid total', 'Total amount must be greater than zero.');
  //     return;
  //   }
  //   try {
  //     setPayLoading(true);
  //     // create payment intent on backend
  //     const pi = await createPaymentIntent(token, {
  //       amount: total,
  //       currency: 'usd',
  //       metadata: { source: 'mobile_checkout' },
  //     });
  //     if (!pi?.clientSecret) {
  //       throw new Error('Payment intent not created.');
  //     }
  //     // create ephemeral key for the customer
  //     const ek = await createEphemeralKey(token, '2024-06-20');
  //     if (!ek?.ephemeralKey || !ek?.customer) {
  //       throw new Error('Failed to create ephemeral key.');
  //     }

  //     const init = await initPaymentSheet({
  //       merchantDisplayName: 'Auto Parts Provider',
  //       customerId: ek.customer,
  //       customerEphemeralKeySecret: ek.ephemeralKey,
  //       paymentIntentClientSecret: pi.clientSecret,
  //       defaultBillingDetails: {
  //         name: selectedAddress?.fullAddress || '',
  //         address: {
  //           city: selectedAddress?.city || '',
  //         },
  //       },
  //       style: dark ? 'dark' : 'automatic',
  //     });
  //     if (init.error) {
  //       Alert.alert('Payment setup failed', init.error.message || 'Could not initialize payment.');
  //       return;
  //     }
  //     const present = await presentPaymentSheet();
  //     if (present.error) {
  //       if (present.error.code !== 'Canceled') {
  //         Alert.alert('Payment failed', present.error.message || 'Please try again.');
  //       }
  //       return;
  //     }
  //     Alert.alert('Payment successful', 'Your payment was completed.');
  //   } catch (err: any) {
  //     Alert.alert('Payment error', err?.message || 'Could not process payment.');
  //   } finally {
  //     setPayLoading(false);
  //   }
  // };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderWithSearch
          title="Checkout"
          icon={icons.moreCircle}
          onPress={() => null}
        />
        <ScrollView
          contentContainerStyle={{
            backgroundColor: dark ? COLORS.dark1 : COLORS.white,
            marginTop: 12,
            paddingBottom: 50,
          }}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.summaryTitle, {
            color: dark ? COLORS.white : COLORS.greyscale900
          }]}>Shipping Address</Text>
          <View style={[styles.summaryContainer, {
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
          }]}>

            <TouchableOpacity
              onPress={() => navigation.navigate("selectshippingaddress")}
              style={styles.addressContainer}>
              <View style={styles.addressLeftContainer}>

                <View style={styles.view2}>
                  <Image
                    source={icons.location2}
                    resizeMode='contain'
                    style={styles.locationIcon}
                  />

                </View>
                <View style={styles.viewAddress}>
                  <View style={styles.viewView}>
                    <Text style={[styles.homeTitle, {
                      color: dark ? COLORS.white : COLORS.greyscale900
                    }]}>{selectedAddress?.fullAddress || 'No address selected'}</Text>
                    {selectedAddress?.isDefault ? (
                      <View style={styles.defaultView}>
                        <Text style={styles.defaultTitle}>Default</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.addressTitle, {
                    color: dark ? COLORS.grayscale200 : COLORS.grayscale700
                  }]}>
                    {[selectedAddress?.street, selectedAddress?.city, selectedAddress?.postalCode].filter(Boolean).join(', ') || 'Tap to select address'}
                  </Text>
                </View>
              </View>
              <Image
                source={icons.arrowRight}
                resizeMode='contain'
                style={[styles.arrowRightIcon, {
                  tintColor: dark ? COLORS.white : COLORS.greyscale900
                }]}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.summaryTitle, {
            color: dark ? COLORS.white : COLORS.greyscale900
          }]}>Order List</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
          ) : items.length === 0 ? (
            <Text style={{ color: dark ? COLORS.white : COLORS.greyscale900, paddingVertical: 12 }}>
              Your cart is empty.
            </Text>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 12 }}
              style={{ marginTop: 12 }}
              renderItem={({ item }) => (
                <OrderListItem
                  name={item.name}
                  subtitleName={item.storeName || undefined}
                  image={typeof item.image === 'string' ? { uri: item.image } : item.image}
                  price={item.price}
                  salePrice={item.salePrice}
                  rating={item.rating}
                  numReviews={item.numReviews}
                  color={item.color}
                  quantity={item.quantity}
                  storeName={storeNames[item.sellerId] || item.storeName}
                />
              )}
            />
          )}
          <View style={[styles.separateLine, {
            backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200
          }]} />

          {/* Order Bump / Inspection */}
          <TouchableOpacity
            onPress={() => setInspectionSelected(!inspectionSelected)}
            style={[
              styles.shippingCardSelected,
              {
                backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                borderColor: inspectionSelected ? COLORS.black : (dark ? COLORS.grayscale200 : COLORS.grayscale200),
              }
            ]}
          >
            <View style={styles.shippingLeft}>
              <View style={styles.iconBadge}>
                <Image source={icons.security} resizeMode="contain" style={styles.iconBadgeImg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.routeName, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  Add Auto Parts Provider Inspection
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('autopartproviderinspection')}>
                  <Text style={[styles.routeAddress, styles.link, { color: dark ? COLORS.white : COLORS.primary }]}>
                    See what includes in our inspection
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.price, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  + PKR 10,000
                </Text>
              </View>
            </View>
            <View style={[styles.checkWrap, { alignSelf: 'center', marginTop: 0 }]}>
              <View style={[styles.roundedChecked, { borderColor: inspectionSelected ? COLORS.black : (dark ? COLORS.white : COLORS.primary) }]}>
                {inspectionSelected && <View style={[styles.roundedCheckedCheck, { backgroundColor: COLORS.black }]} />}
              </View>
            </View>
          </TouchableOpacity>
          <View style={[styles.separateLine, {
            backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
            marginTop: 4,
            marginBottom: 12
          }]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.summaryTitle, {
              color: dark ? COLORS.white : COLORS.greyscale900
            }]}>Choose Shipping</Text>
            <TouchableOpacity onPress={() => navigation.navigate("chooseshippingmethods", {
              volume: String(totalVolume),
              sellerVolumes: JSON.stringify(sellerVolumes),
              shippingMethod,
            })}>
              <Text style={[styles.changeLink, { color: dark ? COLORS.white : COLORS.primary }]}>Change</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("chooseshippingmethods", {
              volume: String(totalVolume),
              sellerVolumes: JSON.stringify(sellerVolumes),
              shippingMethod,
            })}
            style={[styles.shippingCardSelected, {
              backgroundColor: dark ? COLORS.dark1 : COLORS.white,
              borderColor: shippingMethod ? COLORS.black : (dark ? COLORS.grayscale200 : COLORS.grayscale200),
            }]}>
            <View style={styles.shippingLeft}>
              <View style={styles.iconBadge}>
                <Image
                  source={shippingMethod === 'express' ? icons.cargo2 : shippingMethod === 'regular' ? icons.motorcycle : icons.box2}
                  resizeMode='contain'
                  style={styles.iconBadgeImg}
                />
              </View>
              <View>
                <Text style={[styles.routeName, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  {shippingMethod === 'eco' ? 'Economy' : shippingMethod === 'regular' ? 'Regular' : 'Express'}
                </Text>
                <Text style={[styles.routeAddress, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
                  Estimated Arrival, {shippingCalc.range || '--'}
                </Text>
                <Text style={[styles.price, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                  PKR {deliveryFee.toFixed(0)}
                </Text>
              </View>
            </View>
            <View style={styles.checkWrap}>
              <View style={[styles.roundedChecked, { borderColor: shippingMethod ? COLORS.black : (dark ? COLORS.white : COLORS.primary) }]}>
                <View style={[styles.roundedCheckedCheck, { backgroundColor: shippingMethod ? COLORS.black : 'transparent' }]} />
              </View>
            </View>
          </TouchableOpacity>
          <View style={[styles.separateLine, {
            backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
            marginTop: 4,
            marginBottom: 16
          }]} />

          <Text style={[styles.summaryTitle, {
            color: dark ? COLORS.white : COLORS.greyscale900
          }]}>Promo Code</Text>
          <View style={[styles.promoCodeContainer, {
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
            borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
          }]}>
            <View style={styles.promoRow}>
            <TextInput
              placeholder='Enter Promo Code'
              placeholderTextColor={dark ? COLORS.white : COLORS.grayscale700}
              value={promoInput}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              ref={promoInputRef}
              onChangeText={v => {
                setPromoInput(v);
              }}
              blurOnSubmit={false}
              returnKeyType="done"
              onSubmitEditing={handleApplyPromo}
              style={[styles.codeInput, {
                color: dark ? COLORS.secondaryWhite : COLORS.greyscale900,
                backgroundColor: dark ? COLORS.dark3 : COLORS.white,
                borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
                textTransform: 'uppercase',
              }]}
            />
            <TouchableOpacity
              onPress={handleApplyPromo}
              style={[styles.addPromoBtn, {
                backgroundColor: dark ? COLORS.greyscale900 : COLORS.primary,
              }]}>
              <Text style={{ color: COLORS.white, fontFamily: 'medium', fontSize: 14 }}>Apply</Text>
            </TouchableOpacity>
            </View>
          <View style={styles.promoMetaRow}>
            {promoMessage ? (
              <Text style={{ color: dark ? COLORS.white : COLORS.greyscale900 }}>{promoMessage}</Text>
            ) : (
              <View />
            )}
            {appliedPromo ? (
              <View style={styles.appliedRow}>
              
                <TouchableOpacity onPress={clearPromo}>
                  <Text style={[styles.removeText, { color: COLORS.red }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View />
            )}
          </View>
          </View>
          
          <View style={[styles.separateLine, {
            backgroundColor: dark ? COLORS.grayscale700 : COLORS.grayscale200,
            marginTop: 4,
            marginBottom: 16
          }]} />

          <View style={[styles.summaryContainer, {
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
          }]}>
            <View style={styles.view}>
              <Text style={[styles.viewLeft, {
                color: dark ? COLORS.grayscale200 : COLORS.grayscale700
              }]}>Subtotal</Text>
              <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>PKR {subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.view}>
              <Text style={[styles.viewLeft, {
                color: dark ? COLORS.grayscale200 : COLORS.grayscale700
              }]}>Delivery Fee</Text>
              <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>PKR {deliveryFee.toFixed(2)}</Text>
            </View>
            {inspectionFee > 0 && inspectionSelected && (
              <View style={styles.view}>
                <Text style={[styles.viewLeft, {
                  color: dark ? COLORS.grayscale200 : COLORS.grayscale700
                }]}>Inspection</Text>
                <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>PKR {inspectionFee.toFixed(2)}</Text>
              </View>
            )}
            {promo > 0 && appliedPromo && (
              <View style={styles.view}>
                <Text style={[styles.viewLeft, {
                  color: dark ? COLORS.grayscale200 : COLORS.grayscale700
                }]}>{`Promo (${appliedPromo})`}</Text>
                <Text style={[styles.viewRight, { color: dark ? COLORS.primary : COLORS.primary }]}>- PKR {promo.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.separateLine, {
              backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200
            }]} />
            <View style={styles.view}>
              <Text style={[styles.viewLeft, {
                color: dark ? COLORS.grayscale200 : COLORS.grayscale700
              }]}>Total</Text>
              <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>PKR {total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
      <View style={[styles.buttonContainer, {
        backgroundColor: dark ? COLORS.dark2 : COLORS.white,
      }]}>
        {items.length > 0 && (
          <ButtonFilled
            title={payLoading ? "Processing..." : "Proceed to Payment"}
            disabled={payLoading}
            onPress={goToPayment}
            style={[styles.placeOrderButton, { backgroundColor: COLORS.black, borderColor: COLORS.black }]}
            textColor={COLORS.white}
          />
        )}
      </View>
    </SafeAreaView>
  )
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  summaryContainer: {
    width: SIZES.width - 32,
    borderWidth: 1,
    borderRadius: 16,
    borderColor: "#E5E7EB",  // example light-gray
    padding: 16,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 0
    },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 0,
    marginBottom: 12,
    marginTop: 12,
  },
  view: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12
  },
  viewLeft: {
    fontSize: 14,
    fontFamily: "medium",
    color: COLORS.grayscale700
  },
  viewRight: {
    fontSize: 14,
    fontFamily: "semiBold",
    color: COLORS.greyscale900
  },
  separateLine: {
    width: "100%",
    height: 1,
    backgroundColor: COLORS.grayscale200,
    marginVertical: 12
  },
  summaryTitle: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 20,
    fontFamily: "bold",
    color: COLORS.greyscale900
  },
  addressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addressLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  view1: {
    height: 52,
    width: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.tansparentPrimary,
  },
  view2: {
    height: 52,
    width: 52,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  locationIcon: {
    height: 20,
    width: 20,
    tintColor: COLORS.white
  },
  viewView: {
    flexDirection: "row",
    alignItems: "center",
  },
  homeTitle: {
    fontSize: 18,
    fontFamily: "bold",
    color: COLORS.greyscale900
  },
  defaultView: {
    width: 64,
    height: 26,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.tansparentPrimary,
    marginHorizontal: 12
  },
  defaultTitle: {
    fontSize: 12,
    fontFamily: "medium",
    color: COLORS.primary,
  },
  addressTitle: {
    fontSize: 14,
    fontFamily: "medium",
    color: COLORS.grayscale700,
    marginVertical: 4
  },
  viewAddress: {
    marginHorizontal: 16
  },
  arrowRightIcon: {
    height: 16,
    width: 16,
    tintColor: COLORS.greyscale900

  },
  orderSummaryView: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  addItemView: {
    width: 78,
    height: 26,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    borderColor: COLORS.primary,
    borderWidth: 1.4,
  },
  addItemText: {
    fontSize: 12,
    fontFamily: "medium",
    color: COLORS.primary,
  },
  viewItemTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  viewLeftItemTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.primary,
    marginRight: 16
  },
  viewItemTypeTitle: {
    fontSize: 14,
    fontFamily: "medium",
    color: COLORS.grayscale700,
    marginRight: 16
  },
  placeOrderButton: {
    marginBottom: 12,
    marginTop: 6
  },
  shippingMethods: {
    backgroundColor: COLORS.white,
    paddingVertical: 20,
    marginVertical: 16
  },
  shippingCardSelected: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 12,
    width: SIZES.width - 32,
    alignSelf: 'center',
  },
  shippingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    height: 52,
    width: 52,
    borderRadius: 999,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeImg: {
    height: 24,
    width: 24,
    tintColor: COLORS.white,
  },
  routeName: {
    fontSize: 18,
    color: COLORS.greyscale900,
    fontFamily: "bold",
    marginBottom: 6
  },
  routeAddress: {
    fontSize: 13,
    color: COLORS.grayscale700,
    fontFamily: "regular"
  },
  link: {
    textDecorationLine: 'underline',
  },
  roundedChecked: {
    width: 20,
    height: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundedCheckedCheck: {
    height: 10,
    width: 10,
    backgroundColor: COLORS.black,
    borderRadius: 999,
  },
  checkWrap: { paddingHorizontal: 0, marginLeft: 12 },
  price: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginTop: 8,
  },
  changeLink: {
    fontSize: 14,
    fontFamily: 'medium',
    textDecorationLine: 'underline',
  },
  promoCodeContainer: {
    width: '100%',
    flexDirection: "column",
    alignItems: 'stretch',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 12
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
  },
  promoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
   paddingHorizontal: 8
  
  },
  codeInput: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  addPromoBtn: {
    height: 52,
    minWidth: 100,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  appliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  appliedText: {
    fontFamily: 'medium',
    fontSize: 14,
  },
  removeText: {
    fontFamily: 'medium',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    position: "absolute",
    bottom: 12,
    width: SIZES.width,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
});

export default Checkout
