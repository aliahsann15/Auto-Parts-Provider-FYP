import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions, Modal, TouchableWithoutFeedback, FlatList, Alert, DeviceEventEmitter } from 'react-native';
import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons, images, SIZES } from '@/constants';
import { CancelledOrders, CompletedOrders } from '@/tabs';
import { router, useNavigation } from 'expo-router';
import ActiveProducts from '../sellerProductTabs/ActiveProducts';
import DraftProducts from '../sellerProductTabs/DraftProducts';
import DeletedProducts from '../sellerProductTabs/DeleteProducts';
import { FontAwesome } from '@expo/vector-icons';
import { PartsRequest, fetchPartsRequests, fetchSellerPartsRequests, engagePartsRequest, disengagePartsRequest } from '@/utils/api/partsRequests';
import { markChatRead } from '@/utils/api/chat';
import { deleteOffer } from '@/utils/api/offers';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '@/utils/api/client';


const renderScene = SceneMap({
  first: ActiveProducts,
  second: DraftProducts,
  third: DeletedProducts
});

const OrderRequests = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  
  const layout = useWindowDimensions();
  const { dark, colors } = useTheme();
  const { token, user } = useAuth();
  const [requests, setRequests] = useState<PartsRequest[]>([]);
  const [hiddenRequestIds, setHiddenRequestIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const baseUrl = (API_BASE_URL || '').replace(/\/api\/?$/, '');
  const toAbsolute = (p?: string) => {
    if (!p) return undefined;
    if (p.startsWith('http')) return p;
    return `${baseUrl}${p.startsWith('/') ? p : `/${p}`}`;
  };

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!token) return;
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetchSellerPartsRequests(token);
      const sorted = (res.items || []).slice().sort((a, b) => {
        const at = new Date((a as any)?.createdAt || 0).getTime();
        const bt = new Date((b as any)?.createdAt || 0).getTime();
        return bt - at;
      });
      setRequests(
        sorted
          .filter(r => !hiddenRequestIds.has(String(r._id)))
          .map(r => ({ ...r, unreadMessages: Number((r as any)?.unreadMessages || 0) } as any))
      );
    } catch (err) {
      setRequests([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [token, hiddenRequestIds]);

  React.useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(() => load({ silent: true }), 4000);
      return () => clearInterval(interval);
    }, [load])
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('chatRead', (payload: any) => {
      if (!payload?.requestId) return;
      setRequests(prev =>
        prev.map(r =>
          String(r._id) === String(payload.requestId) ? { ...r, unreadMessages: 0 } as any : r
        )
      );
    });
    const newMsg = DeviceEventEmitter.addListener('chat:new', (payload: any) => {
      if (!payload?.requestId) return;
      setRequests(prev =>
        prev.map(r => {
          if (String(r._id) !== String(payload.requestId)) return r;
          const sellerId = (user?.id || (user as any)?._id || '').toString();
          if (payload?.sender && String(payload.sender) === sellerId) return r; // ignore own messages
          const current = Number((r as any)?.unreadMessages || 0);
          return { ...r, unreadMessages: current + 1 } as any;
        })
      );
    });
    return () => {
      sub.remove();
      newMsg.remove();
    };
  }, [user?.id]);

  const [index, setIndex] = React.useState(0);



  /**
  * Render header
  */
  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}>
            <Image
              source={icons.back}
              resizeMode='contain'
              style={[styles.backIcon, {
                tintColor: dark ? COLORS.white : COLORS.greyscale900
              }]}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {
            color: dark ? COLORS.white : COLORS.greyscale900
          }]}>
            Your Quotes
          </Text>
        </View>
       
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <FlatList
          contentContainerStyle={{ paddingBottom: 32 }}
          data={requests}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <Text style={{ padding: 16, color: dark ? COLORS.white : COLORS.greyscale900 }}>No requests found.</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const sellerId = user?.id || (user as any)?._id;
            const role = (user?.role || '').toLowerCase();
            const sellerIdForRead = role === 'storemanager' ? (user as any)?.sellerId || sellerId : undefined;
            const isClosed = item.status === 'Completed';
            const isWinner = isClosed && sellerId && item.assignedSeller && String(item.assignedSeller) === String(sellerId);
            const acceptedPrice = (item as any)?.acceptedOfferPrice;
            const reqNumber = (item as any)?.requestNumber || '';
            const vehicleLabel = [item.companyName, item.carName, item.variant, item.year].filter(Boolean).join(' ');
            const imageUri = item.images && item.images[0]?.path ? toAbsolute(item.images[0].path) : '';
            const unread = (item as any)?.unreadMessages ?? 0;
            const acceptedOfferId = (item as any)?.acceptedOffer || (item as any)?.acceptedOfferId;

            const titleText = `#${reqNumber || '-----'} · ${vehicleLabel ? `${vehicleLabel} ` : ''}${item.partName}`;
            const subtitleText = item.userId?.name || item.companyName || 'Request';
            const priceText = isWinner && acceptedPrice
              ? `Accepted · PKR ${acceptedPrice}`
              : `Status: ${item.status || 'Pending'}`;

            const handleDelete = async () => {
              if (!acceptedOfferId) {
                Alert.alert('Cannot delete', 'Offer id missing for this request.');
                return;
              }
              Alert.alert('Delete offer?', 'This will remove the accepted offer.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteOffer(String(acceptedOfferId), token!);
                    } catch {
                      // ignore errors, still remove locally
                    } finally {
                      setRequests(prev => prev.filter(r => String(r._id) !== String(item._id)));
                      setHiddenRequestIds(prev => {
                        const next = new Set(Array.from(prev));
                        next.add(String(item._id));
                        return next;
                      });
                    }
                  }
                }
              ]);
            };

            return (
              <View style={[styles.cardContainer, { backgroundColor: dark ? COLORS.dark1 : COLORS.white, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}>
                <View style={styles.cardRow}>
                  <Image
                    source={imageUri ? { uri: imageUri } : icons.image}
                    style={styles.thumbnail}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]} numberOfLines={2}>
                      {titleText}
                    </Text>
                    <Text style={[styles.subtitle, { color: dark ? COLORS.gray3 : COLORS.gray }]} numberOfLines={1}>
                      {subtitleText}
                    </Text>
                    <TouchableOpacity
                      style={styles.detailsLink}
                      onPress={() => navigation.navigate('requestdetails', { requestId: item._id })}
                    >
                      <Text style={[styles.detailsLinkText, { color: dark ? COLORS.white : COLORS.primary }]}>
                        Request Details
                      </Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <View style={{ flexDirection: 'row',justifyContent: 'space-between', alignItems: 'center', width: '100%'}}>
                        <Text style={[styles.price, { color: COLORS.primary }]}>{priceText}</Text>
                        {isClosed && acceptedOfferId ? (
                          <TouchableOpacity onPress={handleDelete} style={[styles.trashBtnCompact]}>
                            <Image source={icons.trash} style={{ width: 18, height: 18, tintColor: COLORS.greyscale900 }} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      {!isClosed && (
                        <View style={[styles.rightActions, { flexDirection: 'row', alignItems: 'center', marginLeft: '-50%' }]}>
                          <Text style={styles.badgeLabel}>Unread Messages:</Text>
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unread}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.actionsRow}>
                  {isClosed ? (
                    <TouchableOpacity
                      disabled
                      style={[
                        styles.primaryBtn,
                        {
                          backgroundColor: isWinner ? COLORS.primary : COLORS.grayscale200,
                          opacity: 0.8,
                          flex: 1
                        },
                      ]}
                    >
                      <Text style={[styles.primaryBtnText, { color: isWinner ? COLORS.white : COLORS.greyscale900 }]}>
                        {isWinner ? 'Offer Accepted' : 'Request Closed'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: COLORS.primary, flex: 1 }]}
                onPress={async () => {
                          if (token) {
                            try {
                              await engagePartsRequest(item._id, token);
                            } catch {}
                          }
                          navigation.navigate('makeoffer', {
                            requestId: item._id,
                            productName: item.partName,
                            customerName: item.userId?.name,
                          });
                        }}
                      >
                        <Text style={styles.primaryBtnText}>Send a Quote</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.outlineBtn, { borderColor: dark ? COLORS.white : COLORS.primary, flex: 1 }]}
                        onPress={async () => {
                          if (token) {
                            try {
                              await engagePartsRequest(item._id, token);
                            } catch {}
                            try {
                              await markChatRead(item._id, token, sellerIdForRead);
                            } catch {}
                          }
                          // Optimistically clear unread when opening the chat
                          setRequests(prev =>
                            prev.map(r =>
                              String(r._id) === String(item._id) ? { ...r, unreadMessages: 0 } as any : r
                            )
                          );
                          DeviceEventEmitter.emit('chatRead', { requestId: item._id, sellerId });
                          navigation.navigate('sellerchatbox', {
                            requestId: item._id,
                            customerName: item.userId?.name,
                            requestNumber: (item as any)?.requestNumber,
                            partName: item.partName,
                            sellerId: sellerIdForRead || sellerId
                          });
                }}
              >
                <Text style={[styles.outlineBtnText, { color: dark ? COLORS.white : COLORS.primary }]}>Chat with Customer</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
            )
          }}
        />
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
    padding: 16
  },
  headerContainer: {
    flexDirection: "row",
    width: SIZES.width - 32,
    justifyContent: "space-between",
    marginBottom: 32
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    color: COLORS.black,
    marginLeft: 16
  },
  cardContainer: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.greyscale900
  },
  InventoryContainer: {
  padding: 5,

    alignItems: "center",
    justifyContent: "center",
  
    flexDirection: 'row',
   
        height: 24,
       
        borderRadius: 4,
        backgroundColor: COLORS.silver
   
  },
  InventoryText: {
  fontSize: 12,

 
    color: COLORS.primary,
    fontFamily: "medium",
  },
  separateLine: {
    width: "100%",
    height: .7,
    backgroundColor: COLORS.greyScale800,
    marginVertical: 12
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  thumbnail: { width: 80, height: 80, borderRadius: 12, backgroundColor: COLORS.grayscale200 },
  title: { fontSize: 16, fontFamily: 'bold', color: COLORS.greyscale900 },
  subtitle: { fontSize: 14, fontFamily: 'medium', marginTop: 4, color: COLORS.gray },
  price: { fontSize: 15, fontFamily: 'bold' },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  detailsLink: {
    marginTop: 6,
  },
  detailsLinkText: {
    fontSize: 14,
    fontFamily: 'semiBold',
    textDecorationLine: 'underline',
  },
  rightActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 8,
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontFamily: "bold",
    color: COLORS.greyscale900,
    marginBottom: 5
  },
  address: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    marginVertical: 6
  },
  serviceTitle: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
  },
  serviceText: {
    fontSize: 12,
    color: COLORS.primary,
    fontFamily: "medium",
    marginTop: 6
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: COLORS.primary,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.white,
  },
  outlineBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginLeft: 8,
  },
  outlineBtnText: {
    fontSize: 16,
    fontFamily: "semiBold",
  },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    marginLeft: 6
  },
  trashBtnCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
  },
  trashIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.red,
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginRight: 8
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'bold'
  },
  badgeLabel: {
    fontSize: 12,
    fontFamily: 'regular',
    color: COLORS.gray,
    marginRight: 0
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: 'wrap',
    gap: 8,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  remindMeText: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    marginVertical: 4
  },
  switch: {
    marginLeft: 8,
    transform: [{ scaleX: .8 }, { scaleY: .8 }], // Adjust the size of the switch
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingHorizontal: 16,
    width: "100%"
  },
  cancelButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.tansparentPrimary,
    borderRadius: 32
  },
  removeButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.primary,
    borderRadius: 32
  },
  bottomTitle: {
    fontSize: 24,
    fontFamily: "semiBold",
    color: "red",
    textAlign: "center",
  },
  bottomSubtitle: {
    fontSize: 22,
    fontFamily: "bold",

    textAlign: "center",
    marginTop: 12

  },
  selectedCancelContainer: {
    marginVertical: 12,
    paddingHorizontal: 36,
    width: "100%"
  },
  cancelTitle: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    textAlign: "center",
  },
  cancelSubtitle: {
    fontSize: 14,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    textAlign: "center",
    marginVertical: 8,
    marginTop: 16
  },
  priceContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8
  },
  totalPrice: {
    fontSize: 14,
    fontFamily: "semiBold",
    color: COLORS.primary,
    textAlign: "center",
  },
  duration: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    textAlign: "center",
  },
  priceItemContainer: {
    flexDirection: "row",
    alignItems: "center",
  gap: 10
  },

  ratingContainer: {
  
    


    alignItems: "center",
    justifyContent: "flex-start",
    
    flexDirection: 'row',
   
  },
  rating: {
    fontSize: 14,
    fontFamily: "semiBold",
    color: COLORS.primary,
    
  },
  rightSecondContainer: {
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'flex-start',
   gap: 10,
   marginVertical: 5
  },
  rating2: {
    fontSize: 12,
    fontFamily: "semiBold",
    color: COLORS.white,
    marginLeft: 4
  },

})

export default OrderRequests
