import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
  ListRenderItemInfo,
  Image,
  ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { TabView } from 'react-native-tab-view'
import { NavigationProp, useNavigation, useIsFocused } from '@react-navigation/native'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/app/context/AuthContext'
import { fetchSupportThreads, SupportThread } from '@/utils/api/support'
import { COLORS, icons } from '@/constants'
import Header from '@/components/Header'
import { useSupportBadge } from '@/contexts/supportBadgeContext'

const TAB_DEFINITIONS = [
  { key: 'seller', title: 'Seller' },
  { key: 'buyer', title: 'Buyer' },
] as const

type TabKey = (typeof TAB_DEFINITIONS)[number]['key']
type SupportRole = 'Seller' | 'Buyer'

const formatTimestamp = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

const SupportThreadItem: React.FC<{
  item: SupportThread
  role: SupportRole
  dark: boolean
  colors: ReturnType<typeof useTheme>['colors']
  onPress: (item: SupportThread, role: SupportRole) => void
}> = ({ item, role, dark, colors, onPress }) => {
  const avatarLetter = (item.userName?.trim()?.[0] || 'U').toUpperCase()
  const hasImage = !!item.userImage
  const hasUnread = !!(item.unreadCount && item.unreadCount > 0)

  return (
    <TouchableOpacity
      onPress={() => onPress(item, role)}
      style={[
        styles.threadItem,
        { backgroundColor: dark ? COLORS.dark3 : COLORS.white },
      ]}
    >
      <View style={styles.threadAvatar}>
        {hasImage ? (
          <Image
            source={{ uri: item.userImage as string }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={[styles.avatarLetter, { color: colors.text }]}>
            {avatarLetter}
          </Text>
        )}
      </View>
      <View style={styles.threadContent}>
        <View style={styles.threadRow}>
          <Text
            style={[styles.threadName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.userName || 'Unknown'}
          </Text>
          <Text style={[styles.timestamp, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
            {formatTimestamp(item.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.messageRow}>
          <Text
            style={[
              styles.threadMessage,
              { color: dark ? COLORS.secondaryWhite : COLORS.gray2 },
              hasUnread && styles.threadMessageUnread,
            ]}
            numberOfLines={2}
          >
            {item.lastMessage || 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={[styles.messageBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.messageBadgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const filterThreads = (items: SupportThread[], term: string) => {
  if (!term.trim()) return items
  const normalized = term.trim().toLowerCase()
  return items.filter(item => {
    const values = [
      item.userName,
      item.lastMessage,
      item.userEmail,
    ]
    return values.some(value => value?.toLowerCase().includes(normalized))
  })
}

const SuperAdminQueries = () => {
  const layout = useWindowDimensions()
  const { colors, dark } = useTheme()
  const navigation = useNavigation<NavigationProp<any>>()
  const { token } = useAuth()
  const isFocused = useIsFocused()
  const { setBadgeCounts, sellerUnread, buyerUnread } = useSupportBadge()

  const [index, setIndex] = useState(0)
  const routes = useMemo(
    () => TAB_DEFINITIONS.map(def => ({ ...def })),
    []
  )
  const [sellerThreads, setSellerThreads] = useState<SupportThread[]>([])
  const [buyerThreads, setBuyerThreads] = useState<SupportThread[]>([])
  const [loading, setLoading] = useState(false)
  const [sellerSearch, setSellerSearch] = useState('')
  const [buyerSearch, setBuyerSearch] = useState('')

  const loadThreads = useCallback(async () => {
    if (!token) {
      setSellerThreads([])
      setBuyerThreads([])
      setBadgeCounts({ sellerUnread: 0, buyerUnread: 0 })
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [seller, buyer] = await Promise.all([
        fetchSupportThreads(token, 'Seller'),
        fetchSupportThreads(token, 'Buyer'),
      ])
      const sortThreads = (items: SupportThread[]) =>
        [...items].sort((a, b) => {
          const aTime = new Date(a.lastMessageAt || '').getTime() || 0
          const bTime = new Date(b.lastMessageAt || '').getTime() || 0
          return bTime - aTime
        })
      setSellerThreads(sortThreads(seller))
      setBuyerThreads(sortThreads(buyer))
      const sellerUnread = seller.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0)
      const buyerUnread = buyer.reduce((sum, thread) => sum + (thread.unreadCount || 0), 0)
      setBadgeCounts({ sellerUnread, buyerUnread })
    } catch (error) {
      console.error('Unable to load support threads', error)
    } finally {
      setLoading(false)
    }
  }, [token, setBadgeCounts])

  useEffect(() => {
    if (token) {
      loadThreads()
    }
  }, [token, loadThreads])

  useEffect(() => {
    if (isFocused) {
      loadThreads()
    }
  }, [isFocused, loadThreads])

  useEffect(() => {
    if (!token) return
    const interval = setInterval(() => {
      loadThreads()
    }, 10000)
    return () => clearInterval(interval)
  }, [token, loadThreads])

  const handleThreadPress = useCallback(
    (item: SupportThread, role: SupportRole) => {
      navigation.navigate('supportchat', {
        userId: item.userId,
        role,
        name: item.userName,
        userImage: item.userImage,
      })
    },
    [navigation],
  )

  const filteredSellerThreads = useMemo(
    () => filterThreads(sellerThreads, sellerSearch),
    [sellerThreads, sellerSearch],
  )
  const filteredBuyerThreads = useMemo(
    () => filterThreads(buyerThreads, buyerSearch),
    [buyerThreads, buyerSearch],
  )

  const activeSearchTerm = index === 0 ? sellerSearch : buyerSearch
  const handleSearchChange = useCallback(
    (value: string) => {
      if (index === 0) {
        setSellerSearch(value)
      } else {
        setBuyerSearch(value)
      }
    },
    [index],
  )

  const renderScene = useCallback(
    ({ route }: { route: { key: TabKey } }) => {
      const threads = route.key === 'seller' ? filteredSellerThreads : filteredBuyerThreads
      const tabRole: SupportRole = route.key === 'seller' ? 'Seller' : 'Buyer'

      if (loading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )
      }

      const listStyles: ViewStyle[] = [styles.listContent]
      if (!threads.length) {
        listStyles.push(styles.emptyList)
      }

      return (
        <FlatList
          data={threads}
          keyExtractor={item => item.userId}
          renderItem={({ item }: ListRenderItemInfo<SupportThread>) =>
            <SupportThreadItem
              item={item}
              role={tabRole}
              dark={dark}
              colors={colors}
              onPress={handleThreadPress}
            />
          }
          contentContainerStyle={listStyles}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No queries yet.
            </Text>
          }
        />
      )
    },
    [
      filteredSellerThreads,
      filteredBuyerThreads,
      loading,
      dark,
      colors,
      handleThreadPress,
    ],
  )

  const renderTabBar = () => (
    <View style={styles.tabBarContainer}>
      {routes.map((routeItem, idx) => {
        const focused = idx === index
        const badgeCount = routeItem.key === 'seller' ? sellerUnread : buyerUnread
        const displayTitle =
          badgeCount > 0 ? `${routeItem.title} (${badgeCount})` : routeItem.title
        return (
          <TouchableOpacity
            key={routeItem.key}
            style={[
              styles.tabButton,
              focused && {
                borderBottomColor: dark ? COLORS.white : COLORS.primary,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setIndex(idx)}
          >
            <View style={styles.tabButtonContent}>
              <Text
                style={{
                  color: focused ? (dark ? COLORS.white : COLORS.primary) : COLORS.gray,
                  fontSize: 16,
                  fontFamily: 'semiBold',
                }}
              >
                {displayTitle}
              </Text>
              {badgeCount > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: COLORS.primary }]}>
                  <Text style={styles.tabBadgeText}>{badgeCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerArea}>
          <Header title="Support Queries" />
        </View>
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchInputContainer,
              { backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200 },
            ]}
          >
            <Image source={icons.search} style={[styles.searchIcon, { tintColor: colors.text }]} />
            <TextInput
              value={activeSearchTerm}
              onChangeText={handleSearchChange}
              placeholder={`Search ${routes[index].title}`}
              placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
              style={[
                styles.searchInput,
                {
                  color: colors.text,
                },
              ]}
            />
          </View>
        </View>
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          renderTabBar={renderTabBar}
          style={styles.tabView}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1 },
  headerArea: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerDescription: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: 'regular',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputContainer: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  searchInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: 'regular',
    flex: 1,
    paddingLeft: 8,
  },
  searchIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  tabBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
  },
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadge: {
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  tabBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'semiBold',
  },
  threadItem: {
    borderBottomColor: COLORS.grayscale200,
    borderBottomWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadContent: {
    flex: 1,
    marginLeft: 12,
  },
  threadAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.grayscale200,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarLetter: {
    fontSize: 18,
    fontFamily: 'bold',
  },
  threadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  threadName: {
    fontSize: 16,
    fontFamily: 'bold',
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  threadMessage: {
    fontSize: 14,
    fontFamily: 'regular',
  },
  threadMessageUnread: {
    fontFamily: 'semiBold',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageBadge: {
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  messageBadgeText: {
    fontSize: 12,
    fontFamily: 'semiBold',
    color: COLORS.white,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
  },
})

export default SuperAdminQueries
