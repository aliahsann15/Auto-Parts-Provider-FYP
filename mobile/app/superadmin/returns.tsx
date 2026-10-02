import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Header from '@/components/Header';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/app/context/AuthContext';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { fetchAdminReturns, ReturnRecord } from '@/utils/api/returns';
import { COLORS, icons } from '@/constants';
import { router } from 'expo-router';
import { useTabBadge } from '@/contexts/tabBadgeContext';

const getStatusBadge = (status?: string) => {
  const normalized = (status || '').toLowerCase();
  if (normalized === 'requested') return { label: 'Requested', color: COLORS.warning };
  if (normalized === 'approved') return { label: 'Approved', color: COLORS.primary };
  if (normalized === 'shipped') return { label: 'Shipped', color: COLORS.info };
  if (normalized === 'received' || normalized === 'refunded') return { label: 'Completed', color: COLORS.success };
  if (normalized === 'rejected' || normalized === 'cancelled') return { label: 'Blocked', color: COLORS.red };
  return { label: normalized.charAt(0).toUpperCase() + normalized.slice(1), color: COLORS.gray };
};

const ReturnsRequestScreen = () => {
  const { colors, dark } = useTheme();
  const { token, user } = useAuth();
  const isSuperAdmin = (user?.role || '').toLowerCase() === 'superadmin';
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const { setReturnBadge } = useTabBadge();
  const isFocused = useIsFocused();
  const lastSeenReturns = useRef(0);

  const syncBadgeCount = useCallback(
    (total: number) => {
      if (isFocused) {
        lastSeenReturns.current = total;
        setReturnBadge(0);
      } else {
        setReturnBadge(Math.max(0, total - lastSeenReturns.current));
      }
    },
    [isFocused, setReturnBadge]
  );

  useEffect(() => {
    if (isFocused) {
      lastSeenReturns.current = returns.length;
      setReturnBadge(0);
    }
  }, [isFocused, returns.length, setReturnBadge]);

  const loadReturns = useCallback(
    async (opts?: { refreshing?: boolean }) => {
      if (!token || !isSuperAdmin) {
        setReturns([]);
        setReturnBadge(0);
        return;
      }
      if (opts?.refreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const data = await fetchAdminReturns(token);
        setReturns(data);
        syncBadgeCount(data.length);
      } catch (err) {
        console.error('Failed to load returns', err);
        setReturns([]);
        syncBadgeCount(0);
      } finally {
        if (opts?.refreshing) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
  },
    [token, isSuperAdmin, syncBadgeCount]
  );

  useFocusEffect(
    useCallback(() => {
      loadReturns();
    }, [loadReturns])
  );

  useEffect(() => {
    if (!token || !isSuperAdmin) return;
    const interval = setInterval(() => {
      loadReturns({ refreshing: true });
    }, 10000);
    return () => clearInterval(interval);
  }, [loadReturns, token, isSuperAdmin]);

  const filteredReturns = useMemo(() => {
    if (!searchTerm.trim()) return returns;
    const normalized = searchTerm.trim().toLowerCase();
    return returns.filter(item => {
      const orderNumber = item.order?.orderNumber || '';
      const values = [item.returnNumber, orderNumber, item.status];
      return values.some(value => value?.toLowerCase().includes(normalized));
    });
  }, [returns, searchTerm]);

  const handleViewDetails = (returnId: string) => {
    router.push(`/superadminReturnDetail?returnId=${returnId}`);
  };

  const renderItem = ({ item }: { item: ReturnRecord }) => {
    const badge = getStatusBadge(item.status);
    const orderLabel = item.order?.orderNumber
      ? `#${item.order.orderNumber}`
      : `#${String(item.order?._id || '').slice(-6).toUpperCase()}`;
    const requestDate = item.requestedAt ? new Date(item.requestedAt).toLocaleDateString() : '';
    return (
      <View style={[styles.card, { backgroundColor: dark ? COLORS.dark3 : COLORS.white }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardText}>
            <Text style={[styles.returnNumber, { color: colors.primary }]}>
              Return {item.returnNumber || '—'}
            </Text>
            <Text style={[styles.orderLabel, { color: colors.text }]}>{`Order ${orderLabel}`}</Text>
            <Text style={[styles.dateLabel, { color: colors.gray }]}>{requestDate}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
            <Text style={styles.statusText}>{badge.label || 'Status'}</Text>
          </View>
        </View>
        <View style={styles.divider} />
        <TouchableOpacity
          style={[styles.viewButton, { backgroundColor: COLORS.black }]}
          onPress={() => handleViewDetails(item._id)}
        >
          <Text style={styles.viewButtonText}>View Return Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.headerArea}>
        <Header title="Returns Request" />
      </View>
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200 }]}>
          <Image source={icons.search} style={[styles.searchIcon, { tintColor: colors.text }]} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search return requests..."
            placeholderTextColor={colors.gray}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>
      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={filteredReturns}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadReturns({ refreshing: true })} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.gray }]}>
              No return requests found.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardText: {
    flex: 1,
    paddingRight: 12,
  },
  returnNumber: {
    fontSize: 18,
    fontFamily: 'bold',
  },
  orderLabel: {
    fontSize: 14,
    fontFamily: 'semiBold',
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  viewButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontFamily: 'semiBold',
    color: COLORS.white,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  searchIcon: {
    width: 18,
    height: 18,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: 'regular',
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    textAlign: 'center',
    marginTop: 24,
  },
});

export default ReturnsRequestScreen;
