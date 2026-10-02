import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/app/context/AuthContext';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { COLORS } from '@/constants';
import HeaderWithSearch from '@/components/HeaderWithSearch';
import { fetchSupportMessages, postSupportMessage, SupportMessage } from '@/utils/api/support';

type SupportRouteParams = {
  supportchat: {
    userId?: string;
    role?: 'Seller' | 'Buyer';
    name?: string;
    userImage?: string;
  };
};

const SupportChatScreen = () => {
  const route = useRoute<RouteProp<SupportRouteParams, 'supportchat'>>();
  const { colors, dark } = useTheme();
  const { token, user } = useAuth();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const isSuperAdmin = (user?.role || '').toLowerCase() === 'superadmin';
  const targetUserId = route.params?.userId;
  const threadLabel = route.params?.name || 'Customer Service';

  const loadMessages = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) {
      setLoading(true);
    }
    try {
      const items = await fetchSupportMessages(token, targetUserId);
      setMessages(items);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [token, targetUserId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleSend = async () => {
    if (!token || !input.trim()) return;
    setSending(true);
    try {
      await postSupportMessage(
        token,
        input.trim(),
        isSuperAdmin ? targetUserId : undefined
      );
      setInput('');
      await loadMessages(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const renderMessage = ({ item }: { item: SupportMessage }) => {
    const isMine = item.senderRole === (isSuperAdmin ? 'SuperAdmin' : (user?.role === 'seller' ? 'Seller' : 'Buyer'));
    return (
      <View style={[styles.bubbleContainer, isMine ? styles.bubbleRight : styles.bubbleLeft]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMe : styles.bubbleTextOther]}>
            {item.text}
          </Text>
          <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerWrapper}>
          <HeaderWithSearch
            title={threadLabel}
            icon={undefined}
            onPress={() => navigation.goBack()}
            avatarUri={route.params?.userImage}
          />
        </View>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={item => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatList}
          />
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          <View style={styles.inputWrapper}>
            <View style={[styles.inputBar, { backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale100 }]}>
              <TextInput
                style={[styles.textInput, { color: dark ? COLORS.white : COLORS.black }]}
                placeholder="Type a message..."
                placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
                value={input}
                onChangeText={setInput}
              />
              <TouchableOpacity onPress={handleSend} disabled={sending || !input.trim()}>
                <Text style={{ color: COLORS.primary, fontFamily: 'semiBold', padding: 10 }}>
                  {sending ? 'Sending...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1 },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
  chatList: {
    paddingTop: 26,
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  bubbleContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  bubble: {
    padding: 12,
    borderRadius: 14,
    maxWidth: '80%',
  },
  bubbleMe: { backgroundColor: COLORS.primary },
  bubbleOther: { backgroundColor: COLORS.grayscale200 },
  bubbleText: { fontSize: 14 },
  bubbleTextMe: { color: COLORS.white },
  bubbleTextOther: { color: COLORS.black },
  timeText: { fontSize: 10, marginTop: 6, color: COLORS.gray },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
    borderRadius: 12,
    width: '100%',
  },
  inputWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: 'regular',
  },
});

export default SupportChatScreen;
