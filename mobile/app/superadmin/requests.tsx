import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native'
import { NavigationProp, useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native'
import { useTheme } from '@/theme/ThemeProvider'
import Header from '@/components/Header'
import { useAuth } from '@/app/context/AuthContext'
import { fetchPartsRequests, PartsRequest } from '@/utils/api/partsRequests'
import { COLORS, icons } from '@/constants'
import { router } from 'expo-router'
import { useTabBadge } from '@/contexts/tabBadgeContext'

const placeholderImage = require('@/assets/icons/placeholder.png')

const getRequestNumber = (request: PartsRequest) => {
  if (request.requestNumber) {
    return `#${request.requestNumber}`
  }
  if (request._id) {
    return `#${String(request._id).slice(-5).padStart(5, '0')}`
  }
  return '#-----'
}

const getStatusBadge = (status?: string) => {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'completed') {
    return { label: 'Completed', color: COLORS.success }
  }
  return { label: 'Processing', color: COLORS.primary }
}

export default function SuperAdminRequests() {
  const { colors, dark } = useTheme()
  const navigation = useNavigation<NavigationProp<any>>()
  const { token, user } = useAuth()
  const isSuperAdmin = (user?.role || '').toLowerCase() === 'superadmin'
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [requests, setRequests] = useState<PartsRequest[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredRequests = useMemo(() => {
    if (!normalizedSearch) return requests
    return requests.filter(request => {
      const fields = [
        request.requestNumber,
        request.companyName,
        request.carName,
        request.partName,
        request.acceptedSellerName,
        request.status,
      ]
      return fields.some(field =>
        String(field || '')
          .toLowerCase()
          .includes(normalizedSearch)
      )
    })
  }, [normalizedSearch, requests])

  const { setRequestBadge } = useTabBadge()
  const isFocused = useIsFocused()
  const lastSeenRequests = useRef(0)

  const syncBadgeCount = useCallback(
    (total: number) => {
      if (isFocused) {
        lastSeenRequests.current = total
        setRequestBadge(0)
      } else {
        setRequestBadge(Math.max(0, total - lastSeenRequests.current))
      }
    },
    [isFocused, setRequestBadge]
  )

  useEffect(() => {
    if (isFocused) {
      lastSeenRequests.current = requests.length
      setRequestBadge(0)
    }
  }, [isFocused, requests.length, setRequestBadge])

  const loadRequests = useCallback(
    async (opts?: { refreshing?: boolean; silent?: boolean }) => {
      if (!token || !isSuperAdmin) {
        setRequests([])
        syncBadgeCount(0)
        return
      }
      if (opts?.refreshing) {
        setRefreshing(true)
      } else if (!opts?.silent) {
        setLoading(true)
      }
      try {
        const res = await fetchPartsRequests(token)
        const items = res.items || []
        setRequests(items)
        syncBadgeCount(items.length)
      } catch (err) {
        console.error('Failed to load superadmin requests', err)
        setRequests([])
        syncBadgeCount(0)
      } finally {
        if (opts?.refreshing) {
          setRefreshing(false)
        } else if (!opts?.silent) {
          setLoading(false)
        }
      }
  },
    [token, isSuperAdmin, syncBadgeCount]
  )

  useFocusEffect(
    useCallback(() => {
      loadRequests()
    }, [loadRequests])
  )

  useEffect(() => {
    if (!token || !isSuperAdmin) return
    const interval = setInterval(() => {
      loadRequests({ silent: true })
    }, 10000)
    return () => clearInterval(interval)
  }, [token, isSuperAdmin, loadRequests])

  const renderRequest = ({ item }: { item: PartsRequest }) => {
    const imageUri = item.images?.[0]?.path
    const imageSource = imageUri ? { uri: imageUri } : placeholderImage
    const offers = item.offerCount ?? 0
    const interested = item.interestedCount ?? (item.sellerIds?.length || 0)
    const hasAccepted = typeof item.acceptedOfferPrice === 'number'
    const storeName = item.acceptedSellerName || 'Store'
    const priceLabel = item.acceptedOfferPrice
      ? Number(item.acceptedOfferPrice).toLocaleString()
      : '—'
    const cardBackground = dark ? COLORS.dark2 : COLORS.white
    const cardBorder = dark ? COLORS.grayscale700 : COLORS.grayscale200
    const statsLabelColor = dark ? COLORS.gray3 : COLORS.gray
    const badge = getStatusBadge(item.status)
    const chatUnreadCount = item.chatUnreadCount ?? 0
    return (
      <View style={[styles.card, { backgroundColor: cardBackground, borderColor: cardBorder }]}>
        <View style={styles.cardHeader}>
          <View style={styles.imageWrapper}>
            <Image source={imageSource} style={styles.image} resizeMode="cover" />
          </View>
          <View style={styles.details}>
            <Text style={[styles.requestNumber, { color: colors.primary }]}>
              Request {getRequestNumber(item)}
            </Text>
            {hasAccepted ? (
              <Text style={[styles.acceptedText, { color: colors.text }]}>
                {`${storeName} offers of PKR ${priceLabel} has been Accepted By the buyer`}
              </Text>
            ) : (
              <View style={styles.statsRow}>
                <View style={styles.statsItem}>
                  <Text style={[styles.statsNumber, { color: colors.text }]}>{offers}</Text>
                  <Text style={[styles.statsLabel, { color: statsLabelColor }]}>Offers</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={[styles.statsNumber, { color: colors.text }]}>{interested}</Text>
                  <Text style={[styles.statsLabel, { color: statsLabelColor }]}>Interested</Text>
                </View>
              </View>
            )}
          </View>
        <View style={styles.badgeWrapper}>
          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Text style={styles.badgeText}>{badge.label}</Text>
          </View>
        </View>
      </View>
        <View style={styles.divider} />
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.detailButton, { backgroundColor: COLORS.black }]}
            onPress={() =>
              navigation.navigate('requestdetails', { requestId: item._id })
            }
          >
            <Text style={[styles.detailButtonText, { color: COLORS.white }]}>View Request Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: COLORS.black }]}
            onPress={() =>
              router.push(`/superadminRequestChats?requestId=${encodeURIComponent(String(item._id))}`)
            }
          >
            <View style={styles.chatButtonLabel}>
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>View Chats</Text>
              <View style={[styles.buttonBadge, chatUnreadCount === 0 && styles.buttonBadgeMuted]}>
                <Text
                  style={[
                    styles.buttonBadgeText,
                    chatUnreadCount === 0 && styles.buttonBadgeTextMuted,
                  ]}
                >
                  {chatUnreadCount}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.headerArea}>
        <Header title="Requests" />
      </View>
      <View style={styles.listArea}>
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200 },
            ]}
          >
            <Image source={icons.search} style={[styles.searchIcon, { tintColor: colors.text }]} />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search requests..."
              placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
              style={[
                styles.searchInput,
                {
                  color: colors.text,
                  paddingVertical: 2,
                },
              ]}
            />
          </View>
        </View>
        {loading && !requests.length ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
        ) : (
          <FlatList
            data={filteredRequests}
            keyExtractor={item => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={() => loadRequests({ refreshing: true })}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              !loading ? (
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  {normalizedSearch ? 'No requests match your search.' : 'No requests found.'}
                </Text>
              ) : null
            }
            renderItem={renderRequest}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: 16,
  },
  listArea: {
    flex: 1,
    padding: 16,
  },
  searchInputContainer: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  searchContainer: {
    paddingBottom: 16,
  },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 0,
    fontFamily: 'regular',
    flex: 1,
    paddingLeft: 8,
  },
  searchIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  listContent: {
    paddingBottom: 32,
  },
  loading: {
    marginTop: 32,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imageWrapper: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: COLORS.grayscale200,
    overflow: 'hidden',
    marginRight: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  details: {
    flex: 1,
  },
  requestNumber: {
    fontSize: 18,
    fontFamily: 'bold',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  statsItem: {
    marginRight: 24,
  },
  statsNumber: {
    fontSize: 18,
    fontFamily: 'bold',
  },
  statsLabel: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  acceptedText: {
    fontSize: 13,
    fontFamily: 'regular',
    marginTop: 4,
  },
  badgeWrapper: {
    marginLeft: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'semiBold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
    marginVertical: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailButton: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  detailButtonText: {
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  chatButtonLabel: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexDirection: 'row',
  },
  buttonBadge: {
    position: 'absolute',
    top: -6,
    right: -40,
    backgroundColor: COLORS.black,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBadgeMuted: {
    backgroundColor: COLORS.grayscale200,
  },
  buttonBadgeText: {
    fontSize: 10,
    fontFamily: 'semiBold',
    color: COLORS.white,
  },
  buttonBadgeTextMuted: {
    color: COLORS.gray3,
  },
  separator: {
    height: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
})
