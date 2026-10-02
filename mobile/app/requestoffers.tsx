import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, ActivityIndicator, Alert, TouchableOpacity, DeviceEventEmitter, Image } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons } from '@/constants';
import HeaderWithSearch from '@/components/HeaderWithSearch';
import { useAuth } from './context/AuthContext';
import { fetchOffersByRequest, acceptOffer, deleteOffer, Offer } from '@/utils/api/offers';
import { markChatRead } from '@/utils/api/chat';
import { fetchStoreBySellerId } from '@/utils/api/store';

export default function RequestOffers() {
  const params = useLocalSearchParams<{ requestId?: string; requestPartName?: string }>();
  const requestId = params?.requestId as string | undefined;
  const navigation = useNavigation<NavigationProp<any>>();
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [acceptedOfferId, setAcceptedOfferId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [requestNumber, setRequestNumber] = useState<string>('');
  const [storeImages, setStoreImages] = useState<Record<string, string>>({});

  const load = async (opts?: { silent?: boolean }) => {
    if (!token || !requestId) return;
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetchOffersByRequest(requestId, token);
      const sorted = (res.offers || []).sort((a, b) => {
        const at = new Date(a.createdAt || 0).getTime();
        const bt = new Date(b.createdAt || 0).getTime();
        return bt - at;
      });
      const latestPerSeller = new Map<string, Offer>();
      sorted.forEach(o => {
        const sellerId = (o as any)?.seller?._id || (o as any)?.seller || '';
        if (sellerId && !latestPerSeller.has(String(sellerId))) {
          latestPerSeller.set(String(sellerId), o);
        }
      });
      const latest = Array.from(latestPerSeller.values());
      setOffers(latest);
      const sellerIds = latest
        .map(o => (o as any)?.seller?._id || (o as any)?.seller || '')
        .filter(Boolean);
      if (sellerIds.length) {
        const unique = Array.from(new Set(sellerIds));
        await Promise.all(
          unique
            .filter(id => !storeImages[id])
            .map(async id => {
              try {
                const storeRes = await fetchStoreBySellerId(id, token);
                const img = (storeRes as any)?.store?.storeProfileImage;
                if (img) {
                  setStoreImages(prev => ({ ...prev, [id]: img }));
                }
              } catch {
                // ignore
              }
            })
        );
      }
      const acceptedId = (res as any)?.acceptedOfferId as string | undefined
      if ((res as any)?.isClosed || acceptedId) {
        setAccepted(true);
      }
      if (acceptedId) {
        setAcceptedOfferId(acceptedId as any);
      }
      if ((res as any)?.requestNumber) {
        setRequestNumber((res as any).requestNumber as string);
      }
      if ((res as any)?.isClosed || acceptedId) {
        // mark closed in buyer list
        DeviceEventEmitter.emit('offerAccepted', { requestId, acceptedOfferId: acceptedId });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load offers');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const subNew = DeviceEventEmitter.addListener('chat:new', (payload: any) => {
      if (!payload?.requestId || payload.requestId !== requestId) return;
      setOffers(prev =>
        prev.map(o => {
          const sellerId = (o as any)?.seller?._id || (o as any)?.seller;
          if (payload?.sellerId && payload.sellerId !== sellerId) return o;
          const current = Number((o as any)?.unreadMessages || 0);
          return { ...o, unreadMessages: current + 1 } as any;
        })
      );
    });
    const subRead = DeviceEventEmitter.addListener('chatRead', (payload: any) => {
      if (!payload?.requestId || payload.requestId !== requestId) return;
      setOffers(prev =>
        prev.map(o => {
          const sellerId = (o as any)?.seller?._id || (o as any)?.seller;
          if (payload?.sellerId && payload.sellerId !== sellerId) return o;
          return { ...o, unreadMessages: 0 } as any;
        })
      );
    });
    return () => {
      subNew.remove();
      subRead.remove();
    };
  }, [token, requestId]);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(() => load({ silent: true }), 4000);
      return () => clearInterval(interval);
    }, [token, requestId])
  );

  const handleAddToCart = async (offer: Offer) => {
    Alert.alert('Accept Offer', 'Are you sure you want to accept this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        style: 'default',
        onPress: async () => {
          if (!token) {
            Alert.alert('Login required', 'Please login to continue');
            navigation.navigate('login' as never);
            return;
          }
          if (!offer.price) {
            Alert.alert('No offer yet', 'Seller has not shared a price yet.');
            return;
          }
          try {
            const res = await acceptOffer(offer._id, token);
            setAccepted(true);
            setAcceptedOfferId(res.acceptedOfferId || offer._id);
            DeviceEventEmitter.emit('offerAccepted', { requestId, acceptedOfferId: res.acceptedOfferId || offer._id });
            DeviceEventEmitter.emit('cart:navigate');
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not accept offer');
          }
        },
      },
    ]);
  };
  const renderItem = ({ item }: { item: Offer }) => {
    const seller = item.seller as any;
    const hasPrice = typeof item.price === 'number';
    const priceText = hasPrice ? `PKR ${item.price}` : 'No offer yet';
    const unread = (item as any)?.unreadMessages ?? 0;
    const storeName = seller?.storeName || seller?.businessName || seller?.name || 'Store';
    const sellerId = (seller?._id || seller) ? String(seller?._id || seller) : '';
    const storeImage = sellerId ? (storeImages[sellerId] || '') : '';
    const warranty = (item as any)?.warranty;
    const returnWindow = (item as any)?.returnDays;
    const isAccepted = acceptedOfferId ? (item as any)._id === acceptedOfferId : accepted && hasPrice;
    // const isClosed = accepted || isAccepted || (item as any)?.accepted || (item as any)?.requestClosed;
    const isClosed = accepted || isAccepted || (item as any)?.accepted || (item as any)?.requestClosed;

    // const offerNo = (item as any)?.offerNumber || String((item as any)?._id || '').slice(-5);
    const avatarLetter = (storeName || 'S').charAt(0).toUpperCase();
    // const titleText = `#${requestNumber || '-----'} · ${params?.requestPartName || 'Requested Part'}`;
    const subtitleText = isAccepted ? `${storeName} · Offer Accepted` : storeName;
    const handleDeleteOffer = async () => {
      Alert.alert(
        'Delete offer?',
        'This will remove the offer from the list.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteOffer(item._id, token!);
              } catch {
                // ignore server errors, still remove locally
              } finally {
                setOffers(prev => prev.filter(o => o._id !== item._id));
              }
            }
          }
        ]
      );
    };
    const handleDeleteRequest = async () => {
      // Delete the accepted offer and remove this request locally
      const targetOfferId = acceptedOfferId || item._id;
      Alert.alert('Delete request?', 'This will remove the accepted offer from your list.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOffer(targetOfferId, token!);
            } catch {
              // ignore errors, still remove locally
            } finally {
              setOffers(prev => prev.filter(o => o._id !== item._id));
              DeviceEventEmitter.emit('offerDeleted', { requestId });
              navigation.goBack();
            }
          }
        }
      ]);
    };

    return (
      <View style={[styles.cardContainer, { backgroundColor: dark ? COLORS.dark1 : COLORS.white, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}>
        <View style={styles.cardRow}>
           <View style={styles.thumbnail}>
            {storeImage ? (
              <Image source={{ uri: storeImage }} style={[styles.storeAvatar, storeImage ? styles.storeImage: {}]} />
            ) : (
              <View style={[styles.storeAvatar, styles.storeAvatarFallback]}>
                <Text style={styles.storeAvatarText}>{avatarLetter}</Text>
              </View>
            )}
          </View>
          <View style={{flex: 1, marginLeft: 12, justifyContent: 'center'}}>
            {/* <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]} numberOfLines={2}>
              {titleText}
            </Text> */}
            <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]} numberOfLines={1}>
              {subtitleText}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Text style={[styles.price, { color: hasPrice ? COLORS.primary : COLORS.black, fontFamily: 'bold'}]}>
                  {priceText}
                </Text>
                {(isClosed || isAccepted) && (
                  <TouchableOpacity onPress={handleDeleteRequest} style={[styles.trashBtn]}>
                    <Image source={icons.trash} style={{ width: 20, height: 20, tintColor: COLORS.greyscale900 }} />
                  </TouchableOpacity>
                )}
              </View>
               {!isClosed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 , marginLeft: '-50%'}}>
               
                  <View style={[styles.rightActions, { flexDirection: 'row', alignItems: 'center' }]}>
                    <Text style={[styles.price, {fontSize: 12}]}>Unread messages:</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unread}</Text>
                    </View>
                  </View>
               
              </View> )}
            </View>
            {(warranty || returnWindow) && (
              <Text style={[styles.subtitle, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                {warranty ? `Warranty: ${warranty}` : ''}{warranty && returnWindow ? ' • ' : ''}{returnWindow ? `Returns: ${returnWindow} days` : ''}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.actionsRow}>
          {isClosed ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <TouchableOpacity
                disabled
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: isAccepted ? COLORS.primary : COLORS.grayscale200,
                    opacity: 0.8,
                    flex: 1
                  },
                ]}
              >
                <Text style={[styles.primaryBtnText, { color: isAccepted ? COLORS.white : COLORS.greyscale900 }]}>
                  {isAccepted ? 'Accepted Offer' : 'Request Closed'}
                </Text>
              </TouchableOpacity>
            
            </View>
          ) : (
            <>
              {hasPrice && (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: COLORS.primary }]}
                  onPress={() => handleAddToCart(item)}
                >
                  <Text style={styles.primaryBtnText}>Accept Offer</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.outlineBtn,
                  {
                    borderColor: dark ? COLORS.white : COLORS.primary,
                    flex: hasPrice ? 1 : 1,
                  },
                ]}
                onPress={async () => {
                  // mark as read will occur inside chat; avoid zeroing counts prematurely
                  navigation.navigate('sellerchatbox', {
                    requestId,
                    customerName: storeName,
                    sellerId: (item as any)?.seller?._id || (item as any)?.seller,
                    requestNumber: (item as any)?.requestNumber,
                    partName: (item as any)?.partName || params?.requestPartName
                  } as never)
                }}
              >
                <Text style={[styles.outlineBtnText, { color: dark ? COLORS.white : COLORS.primary }]}>
                  Chat
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <HeaderWithSearch
          title={params?.requestPartName ? `Offers for ${params.requestPartName}` : 'Offers'}
          icon={icons.moreCircle}
          onPress={() => navigation.goBack()}
        />
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={offers}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                No offers yet.
              </Text>
            }
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, padding: 16 },
  emptyText: { textAlign: 'center', marginTop: 32, fontSize: 14, fontFamily: 'regular' },
  cardContainer: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  thumbnail: { width: 80, height: 80, borderRadius: 12, backgroundColor: COLORS.grayscale200, alignItems: 'center', justifyContent: 'center' },
  storeImage: { width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontFamily: 'bold' },
  price: { color: COLORS.gray, fontSize: 15, fontFamily: 'regular' },
  subtitle: { fontSize: 14, fontFamily: 'medium', marginTop: 4 },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  rightActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 8,
    gap: 8,
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: 'bold',
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  primaryBtnText: { color: COLORS.white, fontFamily: 'bold' },
  outlineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 12,
  },
  outlineBtnText: { fontFamily: 'bold' },
  storeAvatarWrapper: { marginLeft: 12, alignItems: 'center', justifyContent: 'center' },
  storeAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.grayscale200 },
  storeAvatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.greyscale300 },
  storeAvatarText: { fontFamily: 'bold', fontSize: 16, color: COLORS.black },
  trashBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white
  }
});
