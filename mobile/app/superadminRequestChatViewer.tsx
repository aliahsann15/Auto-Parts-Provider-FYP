import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import Header from '@/components/Header';
import { useAuth } from '@/app/context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { fetchChatMessages, fetchChatThreads, ChatMessage, markChatRead } from '@/utils/api/chat';
import { COLORS } from '@/constants';

export default function SuperAdminRequestChatViewer() {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams<{ requestId?: string; sellerId?: string; storeName?: string }>();
  const requestId = params.requestId;
  const sellerId = params.sellerId;
  const storeName = params.storeName || 'Store';
  const [resolvedStoreName, setResolvedStoreName] = useState(storeName);
  const [storeImageUri, setStoreImageUri] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const markMessagesRead = useCallback(async () => {
    if (!token || !requestId || !sellerId) return;
    try {
      await markChatRead(requestId, token, sellerId);
    } catch (err) {
      console.error('Failed to mark chat read', err);
    }
  }, [requestId, sellerId, token]);

  const loadMessages = useCallback(
    async (silent = false) => {
      if (!token || !requestId || !sellerId) {
        setMessages([]);
        return;
      }
      if (!silent) {
        setLoading(true);
      }
      try {
        const res = await fetchChatMessages(requestId, token, sellerId);
        setMessages(res.items || []);
        await markMessagesRead();
      } catch (err) {
        console.error('Failed to load chat messages', err);
        setMessages([]);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [token, requestId, sellerId, markMessagesRead]
  );

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    let cancelled = false;
    const loadStoreInfo = async () => {
      if (!token || !requestId || !sellerId) return;
      try {
        const res = await fetchChatThreads(token, requestId);
        const thread = (res.threads || []).find(t => t.sellerId === sellerId);
        if (!cancelled && thread) {
          const label = thread.storeName || thread.sellerName;
          if (label) setResolvedStoreName(label);
          setStoreImageUri(thread.storeImage || null);
        }
      } catch (err) {
        console.error('Failed to fetch thread details', err);
      }
    };
    loadStoreInfo();
    return () => {
      cancelled = true;
    };
  }, [storeName, token, requestId, sellerId]);

  useEffect(() => {
    markMessagesRead();
  }, [markMessagesRead]);

  useEffect(() => {
    const interval = setInterval(() => loadMessages(true), 10000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isSellerMessage = sellerId && item.sender === sellerId;
    const bubbleStyle = isSellerMessage ? styles.bubbleRight : styles.bubbleLeft;
    const bgColor = isSellerMessage ? COLORS.grayscale200 : COLORS.primary;
    const textColor = isSellerMessage ? COLORS.black : COLORS.white;
    const time = item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : '';

    return (
      <View style={[styles.bubbleContainer, bubbleStyle]}>
        <View style={[styles.bubble, { backgroundColor: bgColor }]}>
          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
          )}
          {item.text && (
            <Text style={[styles.bubbleText, { color: textColor }]}>{item.text}</Text>
          )}
          <Text style={[styles.timeText, { color: textColor }]}>{time}</Text>
        </View>
      </View>
    );
  };

  const storeInitial = resolvedStoreName ? resolvedStoreName.charAt(0).toUpperCase() : 'S';
  const renderTitleIcon = () => (
    <View style={styles.storeLogo}>
      {storeImageUri ? (
        <Image source={{ uri: storeImageUri }} style={styles.storeLogoImage} />
      ) : (
        <Text style={styles.storeLogoText}>{storeInitial}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.headerArea}>
        <Header
          title={resolvedStoreName}
          onBackPress={() => router.back()}
          titleIcon={renderTitleIcon()}
        />
      </View>
      <View style={styles.chatArea}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={item => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatList}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No chat messages yet.
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
  chatArea: {
    flex: 1,
    padding: 16,
  },
  chatList: {
    paddingBottom: 40,
  },
  bubbleContainer: {
    marginBottom: 14,
  },
  bubbleLeft: {
    alignItems: 'flex-start',
  },
  bubbleRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '85%',
  },
  bubbleText: {
    fontFamily: 'regular',
    fontSize: 14,
  },
  timeText: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'right',
  },
  messageImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  storeLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.grayscale200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  storeLogoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  storeLogoText: {
    fontFamily: 'semiBold',
    fontSize: 18,
    color: COLORS.gray3,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
});
