import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  DeviceEventEmitter,
} from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { NavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, icons, SIZES } from '@/constants'
import HeaderWithSearch from '@/components/HeaderWithSearch'
import { useAuth } from '@/app/context/AuthContext'
import { fetchBuyerQuotes, deleteOffer, Offer } from '@/utils/api/offers'
import { API_BASE_URL } from '@/utils/api/client'

const toAbsolute = (uri?: string) => {
  if (!uri) return undefined
  if (uri.startsWith('http')) return uri
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${uri.startsWith('/') ? uri : `/${uri}`}`
}

export default function RequestsTab() {
  const navigation = useNavigation<NavigationProp<any>>()
  const { colors, dark } = useTheme()
  const { isLoggedIn, token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [offers, setOffers] = useState<Offer[]>([])
  const [hiddenRequestIds, setHiddenRequestIds] = useState<string[]>([])
  // deprecated toggle kept for type completeness (no expand UI now)

  const load = async (opts?: { silent?: boolean }) => {
    if (!token) return
    if (!opts?.silent) setLoading(true)
    try {
      const res = await fetchBuyerQuotes(token)
      setOffers(res.offers || [])
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load requests')
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [token])

  const handleDeleteAccepted = useCallback(
    async (requestId?: string, offerId?: string | number | null) => {
      if (!token) {
        Alert.alert('Login required', 'Please login to delete this offer')
        return
      }
      const resolvedOfferId = typeof offerId === 'string' ? offerId : offerId ? String(offerId) : ''
      if (!requestId || !resolvedOfferId) {
        Alert.alert('Missing data', 'Cannot delete this request')
        return
      }
      Alert.alert('Delete request?', 'This will remove the accepted offer.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOffer(resolvedOfferId, token)
            } catch {
              // ignore
            } finally {
              setOffers(prev =>
                prev.filter(
                  o => (o.request as any)?._id !== requestId && (o.request as any)?.id !== requestId
                )
              )
              setHiddenRequestIds(prev => {
                if (prev.includes(requestId)) return prev
                return [...prev, requestId]
              })
            }
          }
        }
      ])
    },
    [token]
  )

  useFocusEffect(
    useCallback(() => {
      load()
      const interval = setInterval(() => load({ silent: true }), 4000)
      return () => clearInterval(interval)
    }, [token])
  )

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('offerAccepted', (payload: any) => {
      const reqId = payload?.requestId
      if (reqId) {
        setOffers(prev => {
          const next = [...prev]
          next.forEach(o => {
            if ((o.request as any)?._id === reqId || (o.request as any)?.id === reqId) {
              ; (o as any).requestClosed = true
            }
          })
          return next
        })
      }
    })
    return () => sub.remove()
  }, [])

  const renderHeader = () => (
    <HeaderWithSearch
      title="Your Requests"
    />
  )

  // group offers by request
  const grouped = useMemo(() => {
    const hiddenRequestSet = new Set(hiddenRequestIds)
    const map = new Map<string, { request: any; offers: Offer[]; unread: number; acceptedOfferId?: string; requestClosed?: boolean; offerCount: number }>()
    offers.forEach(o => {
      const req = o.request as any
      const reqId = req?._id || req?.id || ''
      if (!reqId || hiddenRequestSet.has(reqId)) return
      const entry =
        map.get(reqId) ||
        {
          request: req,
          offers: [] as Offer[],
          unread: 0,
          acceptedOfferId: (o as any)?.acceptedOfferId,
          requestClosed: (o as any)?.requestClosed,
          offerCount: 0
        }
      entry.offers.push(o)
      entry.unread += Number((o as any)?.unreadMessages || 0)
      if ((o as any)?.acceptedOfferId) entry.acceptedOfferId = (o as any).acceptedOfferId
      if ((o as any)?.requestClosed) entry.requestClosed = true
      map.set(reqId, entry)
    })
    // compute real offer counts (price provided)
    map.forEach(entry => {
      entry.offerCount = entry.offers.filter(o => typeof (o as any)?.price === 'number').length
    })
    return Array.from(map.values()).sort((a, b) => {
      const aTime = new Date(a.request?.createdAt || a.request?.updatedAt || 0).getTime()
      const bTime = new Date(b.request?.createdAt || b.request?.updatedAt || 0).getTime()
      return bTime - aTime
    })
  }, [offers, hiddenRequestIds])

  const renderItem = ({ item }: { item: { request: any; offers: Offer[]; unread: number; acceptedOfferId?: string; requestClosed?: boolean; offerCount: number } }) => {
    const request = item.request
    const imageUri = toAbsolute(request?.images?.[0]?.path)
    const requestStatus = (request as any)?.status
    const isClosed =
      requestStatus === 'Completed' ||
      item.requestClosed ||
      !!item.acceptedOfferId ||
      item.offers.some(o => (o as any)?.accepted)
    const acceptedOffer =
      item.offers.find(o => (o as any)?.accepted) ||
      item.offers.find(o => (o as any)?._id === item.acceptedOfferId)
    const acceptedSeller =
      (acceptedOffer as any)?.acceptedSeller ||
      item.offers.find(o => (o as any)?.acceptedSeller)?.acceptedSeller
    const acceptedOfferId =
      (acceptedOffer as any)?._id || item.acceptedOfferId || (acceptedOffer as any)?.acceptedOfferId
    const offerCount = item.offerCount || 0
    const acceptedPrice =
      (acceptedOffer as any)?.price ??
      (acceptedOffer as any)?.acceptedPrice ??
      (item as any)?.acceptedPrice
    const reqNumber = (request as any)?.requestNumber || ''
    const vehicleLabel = [
      request?.companyName,
      request?.carName,
      request?.variant,
      request?.year,
    ]
      .filter(Boolean)
      .join(' ')

    const priceLine = isClosed
      ? (typeof acceptedPrice === 'number' ? `Accepted Price: PKR ${acceptedPrice}` : 'Offer accepted')
      : '';
    const totalInterested = item.offers.filter(o => {
      const seller = (o as any)?.seller;
      const sellerId = seller?._id || seller;
      return Boolean(sellerId);
    }).length;
    const interestOnlyCount = Math.max(0, totalInterested - offerCount);

    return (
      <View style={[styles.cardContainer, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
        <View style={styles.cardRow}>
          <Image
            source={imageUri ? { uri: imageUri } : icons.image}
            style={styles.thumbnail}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
              {`#${reqNumber || '-----'} · ${vehicleLabel ? `${vehicleLabel} ` : ''}${request?.partName || 'Requested Part'}`}
            </Text>
            <View style={styles.statusRow}>
              <Text style={[styles.subtitle, { color: dark ? COLORS.gray3 : COLORS.gray }]} numberOfLines={1}>
                {isClosed && acceptedOffer
                  ? `${acceptedSeller?.storeName || acceptedSeller?.name || (acceptedOffer as any)?.seller?.storeName || (acceptedOffer as any)?.seller?.name || 'Seller'} · offer accepted`
                  : request?.companyName || request?.carName || 'Request'}
              </Text>
            </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 2 }}>
                {isClosed ? (
                  <Text style={[styles.price, { color: COLORS.primary }]} numberOfLines={2}>
                    {priceLine}
                  </Text>
                ) : (
                  <View style={styles.metricsWrapper}>
                    <View style={styles.metricBlock}>
                      <Text style={[styles.metricLabel, { color: dark ? COLORS.gray3 : COLORS.gray }]}>Offers</Text>
                      <Text style={[styles.metricValue, { color: COLORS.primary }]}>{offerCount}</Text>
                    </View>
                    <View style={styles.metricBlock}>
                      <Text style={[styles.metricLabel, { color: dark ? COLORS.gray3 : COLORS.gray }]}>Interested</Text>
                      <Text style={[styles.metricValue, { color: COLORS.primary }]}>{interestOnlyCount}</Text>
                    </View>
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {!isClosed && (
                    <View style={[styles.rightActions, { justifyContent: 'flex-end', flexDirection: 'row', alignItems: 'center' }]}>
                      <Text style={styles.badgeLabel}>Unread messages:</Text>
                      <View style={[styles.badge, { marginRight: 6 }]}>
                        <Text style={styles.badgeText}>{item.unread}</Text>
                      </View>
                    </View>
                  )}
                  {isClosed && (
                    <TouchableOpacity
                      onPress={() => handleDeleteAccepted(request?._id || request?.id, acceptedOfferId)}
                      style={[styles.statusTrash, { marginRight: 4 }]}
                    >
                      <Image source={icons.trash} style={styles.statusTrashIcon} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {!isClosed && offerCount === 0 && interestOnlyCount === 0 && (
                <Text style={[styles.noInterestText, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                  No sellers have engaged yet.
                </Text>
              )}
            </View>
          </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: COLORS.primary, flex: 1, opacity: isClosed ? 0.5 : 1 }]}
            onPress={() =>
              navigation.navigate('requestoffers', {
                requestId: request?._id || request?.id,
                requestPartName: request?.partName,
              } as never)
            }
            disabled={isClosed}
          >
            <Text style={styles.primaryBtnText}>{isClosed ? 'Offer Accepted' : 'Show Offers'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.center}>
          <TouchableOpacity style={styles.submitBtn} onPress={() => navigation.navigate('login' as never)}>
            <Text style={styles.submitText}>Login to View</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={grouped}
            keyExtractor={item => item.request?._id || item.request?.id || Math.random().toString()}
            renderItem={renderItem}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                No quotes yet.
              </Text>
            }
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  area: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, padding: 16 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtn: {
    height: 58,
    width: '70%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: COLORS.black,
    flexDirection: 'row',
    marginBottom: 60,
    marginTop: 16,
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  cardContainer: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  thumbnail: { width: 80, height: 80, borderRadius: 12, backgroundColor: COLORS.grayscale200 },
  title: { fontSize: 16, fontFamily: 'bold' },
  subtitle: { fontSize: 14, fontFamily: 'medium', marginTop: 4 },
  price: { fontSize: 15, fontFamily: 'bold', maxWidth: "50%" },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
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
    fontSize: 12,
    fontFamily: 'bold',
  },
  badgeLabel: {
    fontSize: 11,
    fontFamily: 'regular',
    color: COLORS.gray,
    marginRight: 4,
  },
  metricsWrapper: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  metricBlock: {
    flexDirection: 'column',
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'bold',
  },
  noInterestText: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'regular',
  },
  trashBtn: {
    padding: 0,
  },
  trashIcon: {
    width: 20,
    height: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTrash: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  statusTrashIcon: {
    width: 18,
    height: 18,
    tintColor: COLORS.greyscale900,
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
    marginLeft: 8,
  },
  outlineBtnText: { fontFamily: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 32, fontSize: 14, fontFamily: 'regular' },
  offerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
})
