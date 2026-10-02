import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  TextInput,
  Image,
} from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/app/context/AuthContext'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import { fetchAdminOrders, OrderItem } from '@/utils/api/orders'
import { NavigationProp, useIsFocused, useNavigation } from '@react-navigation/native'
import { COLORS, icons } from '@/constants'
import Header from '@/components/Header'
import { router } from 'expo-router'
import { useTabBadge } from '@/contexts/tabBadgeContext'

const formatDate = (value?: string | Date) => {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString()
}

const getStatusColor = (status?: string) => {
  const val = (status || '').toLowerCase()
  if (val === 'delivered') return COLORS.success
  if (val === 'shipped' || val === 'processing') return COLORS.primary
  if (val === 'pending') return COLORS.warning
  if (val === 'cancelled') return COLORS.error
  return COLORS.gray
}

const SuperAdminOrders = () => {
  const { colors, dark } = useTheme()
  const { token } = useAuth()
  const navigation = useNavigation<NavigationProp<any>>()
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | '7' | '30' | 'custom'>('all')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null)

  const { setOrdersBadge } = useTabBadge()
  const isFocused = useIsFocused()
  const lastSeenOrders = useRef(0)

  const syncBadgeCount = useCallback(
    (total: number) => {
      if (isFocused) {
        lastSeenOrders.current = total
        setOrdersBadge(0)
      } else {
        setOrdersBadge(Math.max(0, total - lastSeenOrders.current))
      }
    },
    [isFocused, setOrdersBadge]
  )

  const loadOrders = useCallback(async () => {
    if (!token) {
      setOrders([])
      syncBadgeCount(0)
      return
    }
    setLoading(true)
    try {
      const res = await fetchAdminOrders(token)
      const items = res.orders || res.data || []
      setOrders(items)
      syncBadgeCount(items.length)
    } catch (err: any) {
      console.error('Unable to load admin orders', err)
      setOrders([])
      syncBadgeCount(0)
    } finally {
      setLoading(false)
    }
  }, [token, syncBadgeCount])

  useEffect(() => {
    if (isFocused) {
      lastSeenOrders.current = orders.length
      setOrdersBadge(0)
    }
  }, [isFocused, orders.length, setOrdersBadge])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    if (!token) return
    const interval = setInterval(() => {
      loadOrders()
    }, 10000)
    return () => clearInterval(interval)
  }, [loadOrders, token])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadOrders()
    } finally {
      setRefreshing(false)
    }
  }, [loadOrders])

  const renderOrder = ({ item }: { item: OrderItem }) => {
    const orderNumber = item.orderNumber || item._id || item.id || '—'
    const amount = item.totalAmount || 0
    return (
      <View style={[styles.orderCard, { backgroundColor: dark ? COLORS.dark3 : COLORS.white }]}>
        <View style={styles.orderHeader}>
          <Text style={[styles.orderNumber, { color: colors.text }]}>#{orderNumber}</Text>
          <Text style={[styles.orderDate, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <View style={styles.orderStatusRow}>
          <Text style={[styles.orderAmount, { color: colors.text }]}>
            PKR {amount.toLocaleString()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status || 'pending'}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.black }]}
            onPress={() =>
              navigation.navigate('sellerorderdetails', {
                orderId: item._id,
              })
            }
          >
            <Text style={[styles.actionText, { color: COLORS.white }]}>View details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.black }]}
            onPress={() =>
              router.push(
                `/productereceipt?data=${encodeURIComponent(JSON.stringify(item))}&orderNumber=${encodeURIComponent(
                  String(orderNumber)
                )}`
              )
            }
          >
            <Text style={[styles.actionText, { color: COLORS.white }]}>E-receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    return orders.filter(order => {
      if (order.createdAt) {
        const created = new Date(order.createdAt)
        if (dateFilter === '7' || dateFilter === '30') {
          const days = dateFilter === '7' ? 7 : 30
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - days)
          if (created < cutoff) {
            return false
          }
        } else if (dateFilter === 'custom') {
          if (startDate && created < startDate) return false
          if (endDate) {
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            if (created > end) return false
          }
        }
      }
      if (normalizedSearch) {
        const customerName = order.customer?.name || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim()
        const searchFields = [
          order.orderNumber,
          order._id,
          order.id,
          order.status,
          order.paymentStatus,
          order.paymentMethod,
          customerName,
        ]
        const matches = searchFields.some(field =>
          String(field || '').toLowerCase().includes(normalizedSearch)
        )
        if (!matches) {
          return false
        }
      }
      return true
    })
  }, [orders, dateFilter, startDate, endDate, searchTerm])

  const dateOptions = useMemo(
    () => [
      { key: 'all', label: 'All' },
      { key: '7', label: 'Last 7 days' },
      { key: '30', label: 'Last 30 days' },
      { key: 'custom', label: 'Custom' },
    ] as const,
    []
  )

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.headerArea}>
        <Header title="Orders" />
      </View>
      <View style={styles.searchArea}>
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
            placeholder="Search orders..."
            placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>
      <View style={styles.filterRow}>
        <View style={styles.filterGroup}>
          {dateOptions.map(option => {
            const active = dateFilter === option.key
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => {
                  setDateFilter(option.key)
                  if (option.key === 'custom') {
                    setShowDatePicker('start')
                  }
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active
                      ? dark
                        ? COLORS.dark3
                        : COLORS.tansparentPrimary
                      : dark
                        ? COLORS.dark2
                        : COLORS.tertiaryWhite,
                  },
                ]}
              >
                <Text style={{ color: dark ? COLORS.white : COLORS.black, fontFamily: 'semiBold', fontSize: 14 }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            )
          })}
          {dateFilter === 'custom' && (
            <View style={{ marginLeft: 8 }}>
              <View style={[styles.customRangeBox, { backgroundColor: dark ? COLORS.dark2 : COLORS.tansparentPrimary }]}>
                <Text style={[styles.filterLabel, { color: dark ? COLORS.white : COLORS.black }]}>
                  From: {startDate ? startDate.toLocaleDateString() : '--'}
                </Text>
                <Text style={[styles.filterLabel, { color: dark ? COLORS.white : COLORS.black, marginHorizontal: 6 }]}>-</Text>
                <Text style={[styles.filterLabel, { color: dark ? COLORS.white : COLORS.black }]}>
                  To: {endDate ? endDate.toLocaleDateString() : '--'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item._id || item.id || String(item?.orderNumber || Math.random())}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ color: colors.text }}>No orders yet.</Text>
            </View>
          }
          />
      )}
      <DateTimePickerModal
        isVisible={showDatePicker === 'start'}
        mode="date"
        maximumDate={endDate || undefined}
        onConfirm={(date) => {
          setStartDate(date)
          setShowDatePicker('end')
        }}
        onCancel={() => setShowDatePicker(null)}
      />
      <DateTimePickerModal
        isVisible={showDatePicker === 'end'}
        mode="date"
        minimumDate={startDate || undefined}
        onConfirm={(date) => {
          setEndDate(date)
          setShowDatePicker(null)
        }}
        onCancel={() => setShowDatePicker(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  headerArea: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchArea: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInputContainer: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'regular',
    borderRadius: 12,
    paddingHorizontal: 16,

  },
  searchIcon: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    marginRight: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 6,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  customRangeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  orderCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  orderDate: {
    fontSize: 12,
    fontFamily: 'regular',
    textTransform: 'capitalize',
  },
  orderStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'semiBold',
    textTransform: 'capitalize',
    color: COLORS.white,
  },
  orderAmount: {
    fontSize: 15,
    fontFamily: 'semiBold',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.grayscale200,
  
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
})

export default SuperAdminOrders
