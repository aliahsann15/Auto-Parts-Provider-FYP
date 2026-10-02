import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Header from '@/components/Header'
import { useTheme } from '@/theme/ThemeProvider'
import { useAuth } from '@/app/context/AuthContext'
import {
  AdminWithdrawal,
  AdminWithdrawalSummary,
  downloadWithdrawalReceipt,
  fetchAdminWithdrawals,
  markWithdrawalCredited,
} from '@/utils/api/withdrawals'
import { COLORS, icons } from '@/constants'
import * as FileSystem from 'expo-file-system/legacy'
import { useTabBadge } from '@/contexts/tabBadgeContext'
import { useIsFocused } from '@react-navigation/native'

const formatCurrency = (value: number) => `PKR ${value.toLocaleString('en-US')}`

const WithdrawalRequestScreen = () => {
  const { colors, dark } = useTheme()
  const { token } = useAuth()
  const { setWithdrawalBadge } = useTabBadge()
  const isFocused = useIsFocused()
  const lastSeenWithdrawals = useRef(0)

  const syncBadgeCount = useCallback(
    (total: number) => {
      if (isFocused) {
        lastSeenWithdrawals.current = total
        setWithdrawalBadge(0)
      } else {
        setWithdrawalBadge(Math.max(0, total - lastSeenWithdrawals.current))
      }
    },
    [isFocused, setWithdrawalBadge]
  )
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [requests, setRequests] = useState<AdminWithdrawal[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [summary, setSummary] = useState<AdminWithdrawalSummary | null>(null)
  const [creditingId, setCreditingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    if (isFocused) {
      lastSeenWithdrawals.current = requests.length
      setWithdrawalBadge(0)
    }
  }, [isFocused, requests.length, setWithdrawalBadge])

  const loadRequests = useCallback(
    async (opts?: { refreshing?: boolean }) => {
      if (!token) {
        syncBadgeCount(0)
        return
      }
      if (opts?.refreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      try {
        const data = await fetchAdminWithdrawals(token)
        setRequests(data.withdrawals)
        setSummary({
          balance: data.balance,
          totalRevenue: data.totalRevenue,
          completedWithdrawals: data.completedWithdrawals,
        })
        syncBadgeCount(data.withdrawals.length)
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Unable to load withdrawals')
        syncBadgeCount(0)
      } finally {
        if (opts?.refreshing) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    },
    [token, syncBadgeCount],
  )

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  useEffect(() => {
    const interval = setInterval(() => {
      loadRequests()
    }, 10000)
    return () => clearInterval(interval)
  }, [loadRequests])

  const filteredRequests = useMemo(() => {
    if (!searchTerm.trim()) return requests
    const normalized = searchTerm.trim().toLowerCase()
    return requests.filter(item => {
      const values = [
        item.sellerName,
        item.reference,
        item.sellerEmail,
        item.status,
      ]
      return values.some(value => value?.toLowerCase().includes(normalized))
    })
  }, [requests, searchTerm])

  const handleCredit = useCallback(
    (item: AdminWithdrawal) => {
      Alert.alert(
        'Mark as Credited',
        `Are you sure you want to mark the withdrawal of ${formatCurrency(item.amount)} as credited?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed',
            onPress: async () => {
              if (!token) {
                Alert.alert('Unauthorized', 'Please log in again.')
                return
              }
              setCreditingId(item.id)
              try {
                await markWithdrawalCredited(token, item.id)
                await loadRequests()
              } catch (err: any) {
                Alert.alert('Error', err?.message || 'Failed to credit withdrawal')
              } finally {
                setCreditingId(null)
              }
            },
          },
        ],
      )
    },
    [token, loadRequests],
  )

  const handleDownload = useCallback(
    async (item: AdminWithdrawal) => {
      if (!token) {
        Alert.alert('Unauthorized', 'Please log in again.')
        return
      }
      setDownloadingId(item.id)
      try {
        const base64 = await downloadWithdrawalReceipt(token, item.id, true)
        const safeName = `Withdrawal-${item.id}.pdf`
        const fileUri = `${FileSystem.cacheDirectory}${safeName}`
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        })
        await Share.share({
          url: fileUri,
          title: 'Withdrawal E-Receipt',
        })
        await FileSystem.deleteAsync(fileUri, { idempotent: true })
      } catch (err: any) {
        Alert.alert('Download failed', err?.message || 'Unable to download receipt')
      } finally {
        setDownloadingId(null)
      }
    },
    [token],
  )

  const renderItem = ({ item }: { item: AdminWithdrawal }) => {
    const statusLabel = item.status?.charAt(0).toUpperCase() + (item.status?.slice(1) || '')
    const hasCredited = item.status === 'completed'
    return (
      <View style={[styles.card, { backgroundColor: dark ? COLORS.dark3 : COLORS.white }]}>
        <View style={styles.cardHeader}>
          <View style={styles.amountColumn}>
            <Text style={[styles.amountLabel, { color: COLORS.black }]}>{formatCurrency(item.amount)}</Text>
            {item.reference ? (
              <Text style={[styles.reference, { color: COLORS.black }]}>Reference #{item.reference}</Text>
            ) : null}
            <Text style={[styles.subLabel, { color: COLORS.black }]}>{item.sellerName || 'Seller'}</Text>
            <Text style={[styles.subLabel, { color: COLORS.black }]}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: hasCredited ? COLORS.success : COLORS.warning },
            ]}
          >
            <Text style={styles.statusText}>{statusLabel || 'Pending'}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: hasCredited ? COLORS.black : COLORS.primary }]}
          onPress={() => (hasCredited ? handleDownload(item) : handleCredit(item))}
          disabled={creditingId === item.id || downloadingId === item.id}
        >
          {hasCredited ? (
            downloadingId === item.id ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.actionText}>Download E-Receipt</Text>
            )
          ) : creditingId === item.id ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.actionText}>Mark it Credited</Text>
          )}
        </TouchableOpacity>
      </View>
    )
  }

  const balanceValue = summary?.balance ?? 0

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.headerArea}>
        <Header title="Withdrawal Request" />
      </View>
      <View style={[styles.balanceContainer, { backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200 }]}>
        <Text style={[styles.balanceLabel, { color: COLORS.black }]}>Balance</Text>
        <Text style={[styles.balanceValue, { color: COLORS.black }]}>{formatCurrency(balanceValue)}</Text>
        {summary && (
          <Text style={[styles.summaryLabel, { color: COLORS.black }]}>
            Total Revenue {formatCurrency(summary.totalRevenue)}
          </Text>
        )}
      </View>
      <View style={styles.searchWrapper}>
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
            placeholder="Search withdrawals..."
            placeholderTextColor={COLORS.gray}
            style={[styles.searchInput, { color: COLORS.black }]}
          />
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadRequests({ refreshing: true })} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: COLORS.black }]}>
              No withdrawal requests.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  headerArea: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  balanceContainer: {
    margin: 16,
    borderRadius: 14,
    padding: 16,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 28,
    fontFamily: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    marginBottom: 16,
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
    marginLeft: 8,
    fontFamily: 'regular',
  },
  searchIcon: {
    width: 18,
    height: 18,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  amountColumn: {
    flex: 1,
    paddingRight: 12,
  },
  amountLabel: {
    fontSize: 20,
    fontFamily: 'bold',
  },
  subLabel: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  reference: {
    fontSize: 12,
    fontFamily: 'semiBold',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'semiBold',
    color: COLORS.white,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.grayscale200,
    marginVertical: 12,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'semiBold',
    color: COLORS.white,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    textAlign: 'center',
    marginTop: 24,
  },
})

export default WithdrawalRequestScreen
