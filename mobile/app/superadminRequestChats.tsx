import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import Header from '@/components/Header';
import { useAuth } from '@/app/context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { fetchChatThreads, ChatThread } from '@/utils/api/chat';
import { COLORS } from '@/constants';
const placeholderImage = require('@/assets/icons/placeholder.png')

export default function SuperAdminRequestChats() {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = params.requestId;
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(false);

  const loadThreads = useCallback(async (opts?: { silent?: boolean }) => {
    if (!token || !requestId) {
      setThreads([]);
      return;
    }
    if (!opts?.silent) {
      setLoading(true);
    }
    try {
      const res = await fetchChatThreads(token, requestId);
      const sorted = (res.threads || []).slice().sort((a, b) => {
        const aTime = new Date(a.lastMessageTime || '').getTime() || 0;
        const bTime = new Date(b.lastMessageTime || '').getTime() || 0;
        return bTime - aTime;
      });
      setThreads(sorted);
    } catch (err) {
      console.error('Failed to load chat threads', err);
      setThreads([]);
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
    }
  }, [token, requestId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!token || !requestId) return;
    const interval = setInterval(() => {
      loadThreads({ silent: true });
    }, 10000);
    return () => clearInterval(interval);
  }, [token, requestId, loadThreads]);

  const handleThreadPress = (thread: ChatThread) => {
    if (!requestId || !thread.sellerId) return;
    router.push(
      `/superadminRequestChatViewer?requestId=${encodeURIComponent(
        requestId
      )}&sellerId=${encodeURIComponent(thread.sellerId)}&storeName=${encodeURIComponent(
        thread.storeName || thread.sellerName || ''
      )}`
    );
  };

  const renderThread = ({ item }: { item: ChatThread }) => {
    const hasStoreImage = !!item.storeImage
    const unread = typeof item.unreadCount === 'number' && item.unreadCount > 0
    return (
    <TouchableOpacity
      style={[
        styles.threadCard,
        { backgroundColor: dark ? COLORS.dark2 : COLORS.white },
      ]}
      onPress={() => handleThreadPress(item)}
    >
      <View style={styles.threadRow}>
        <View style={styles.threadImageWrapper}>
          <Image
            source={hasStoreImage ? { uri: item.storeImage as string } : placeholderImage}
            style={styles.threadImage}
          />
        </View>
        <View style={styles.threadText}>
          <Text style={[styles.threadTitle, { color: colors.text }]}>
            {item.storeName || item.sellerName || 'Seller'}
          </Text>
          <Text
            style={[
              styles.threadSub,
              {
                color: dark ? COLORS.gray3 : COLORS.gray,
                fontFamily: unread ? 'semiBold' : 'regular',
              },
            ]}
            numberOfLines={2}
          >
            {item.lastMessage || 'Latest chat'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.headerArea}>
        <Header title="Customer Chats" onBackPress={() => router.back()} />
      </View>
      <View style={styles.listArea}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={threads}
            keyExtractor={item => `${item.requestId}-${item.sellerId}`}
            renderItem={renderThread}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No chat threads found for this request.
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
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
  threadCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadText: {
    flex: 1,
    paddingRight: 12,
  },
  threadTitle: {
    fontSize: 16,
    fontFamily: 'semiBold',
    marginBottom: 4,
  },
  threadSub: {
    fontSize: 14,
    marginBottom: 4,
  },
  separator: {
    height: 12,
  },
  threadImageWrapper: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: COLORS.grayscale200,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  threadImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyText: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 16,
  },
});
