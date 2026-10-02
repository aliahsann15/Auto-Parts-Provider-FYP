import { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Alert,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  DeviceEventEmitter,
  Keyboard,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons, SIZES } from '@/constants';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from './context/AuthContext';
import { fetchChatMessages, sendChatMessage, markChatRead, fetchChatThreads } from '@/utils/api/chat';
import { uploadProfileImage } from '@/utils/api/user';
import { API_BASE_URL } from '@/utils/api/client';
import { io } from 'socket.io-client';
import { useCallback } from 'react';
import { fetchOffersByRequest, acceptOffer } from '@/utils/api/offers';
import { toAbsoluteImageUri } from '@/utils/images';

type Message = {
  id: string;
  text?: string;
  timestamp: string;
  sender: string;
  avatar?: string;
  imageUri?: string;
  type?: 'offer';
  offer?: {
    id: string;
    price?: number;
    warranty?: string;
    returnDays?: number;
    isLatest: boolean;
    accepted?: boolean;
  };
  createdAt?: number;
};

import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';
import HeaderWithSearch from '@/components/HeaderWithSearch';


type ParamList = {
  ChatScreen: { requestId: string; customerName?: string; sellerId?: string; requestNumber?: string; partName?: string };
};

const Colors = {
  background: '#fff',
  text: '#000',
  primary: '#1e90ff',
  secondary: '#ccc',
};

const getModerationMessage = (reason?: string) => {
  const messages: Record<string, string> = {
    phone_number: 'Phone numbers are not allowed in chat. Please keep communication inside the app.',
    email_address: 'Email addresses are not allowed. Please communicate through the app.',
    address_detected: 'Please avoid sharing physical addresses in chat.',
    roman_urdu_contact: 'Contact info sharing is blocked. Keep the conversation in the app.',
    name_sharing_detected: 'Please avoid sharing personal names for privacy.',
  };
  return messages[reason || ''] || 'Your message contains personal information. Please revise and try again.';
};

export default function ChatScreen() {
  const { dark } = useTheme();
  const route = useRoute<RouteProp<ParamList, 'ChatScreen'>>();
  const [messages, setMessages] = useState<Message[]>([]);
  const navigation = useNavigation<any>();
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { token, user } = useAuth();
  const userId = (user as any)?.id || (user as any)?._id;
  const role = (user as any)?.role;
  const isSeller = typeof role === 'string' && role.toLowerCase() === 'seller';
  const requestId = (route.params as any)?.requestId;
  const customerName = (route.params as any)?.customerName || 'Customer';
  const requestNumber = (route.params as any)?.requestNumber;
  const partNameParam = (route.params as any)?.partName;
  const sellerIdParam = (route.params as any)?.sellerId;
  const partRequestId = (route.params as any)?.requestId;
  const socketRef = useRef<any>(null);
  const [offerMessages, setOfferMessages] = useState<Message[]>([]);
  const [acceptedLive, setAcceptedLive] = useState(false);
  const [storeDisplayName, setStoreDisplayName] = useState(customerName);
  const [storeAvatarUri, setStoreAvatarUri] = useState<string | null>(null);
  useEffect(() => {
    setAcceptedLive(false);
  }, [requestId]);
  const isChatClosed = useMemo(() => {
    const accepted = offerMessages.some(m => m.offer?.accepted);
    return accepted || acceptedLive;
  }, [offerMessages, acceptedLive]);

  const latestAcceptableOffer = useMemo(() => {
    if (isSeller) return null;
    const latest = offerMessages.filter(m => m.offer?.isLatest && !m.offer?.accepted && Number.isFinite(m.offer?.price)).pop();
    return latest?.offer || null;
  }, [offerMessages, isSeller]);

  const handleImagePick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('We need permission to access your media library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    const uri = result.assets?.[0]?.uri;
    if (uri) {
      setSelectedImage(uri); // ✅ Safe
    }
  };

  const mapMessage = useCallback(
    (m: any): Message => ({
      id: m?._id || m?.id || `${m?.sender || 'tmp'}-${m?.createdAt || Date.now()}`,
      text: m?.text,
      imageUri: toAbsoluteImageUri(m?.imageUrl),
      timestamp: new Date(m?.createdAt || Date.now()).toLocaleTimeString(),
      sender:
        (m?.sender && m?.sender?.toString?.() === userId) || m?.sender === userId
          ? 'me'
          : 'them',
      createdAt: new Date(m?.createdAt || Date.now()).getTime(),
    }),
    [userId]
  );

  const loadHistory = useCallback(async () => {
    if (!token || !requestId) return;
    try {
      await markChatRead(requestId, token, sellerIdParam);
      DeviceEventEmitter.emit('chatRead', { requestId, sellerId: sellerIdParam });
      const res = await fetchChatMessages(requestId, token, sellerIdParam);
      const mapped = (res.items || []).map(mapMessage);
      setMessages(mapped);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 120);
    } catch (err) {
      console.error(err);
    }
  }, [token, requestId, mapMessage, sellerIdParam]);

  // load existing history once
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (isSeller) return;
    if (!token || !requestId || !sellerIdParam) return;
    let cancelled = false;
    const loadStoreInfo = async () => {
      try {
        const res = await fetchChatThreads(token, requestId);
        const thread = (res.threads || []).find(t => t.sellerId === sellerIdParam);
        if (!cancelled && thread) {
          const label = thread.storeName || thread.sellerName || customerName;
          setStoreDisplayName(label);
          if (thread.storeImage) {
            setStoreAvatarUri(thread.storeImage);
          } else {
            setStoreAvatarUri(null);
          }
        }
      } catch (err) {
        console.error('Failed to load store info', err);
      }
    };
    loadStoreInfo();
    return () => {
      cancelled = true;
    };
  }, [isSeller, token, requestId, sellerIdParam, customerName]);

  // fetch buyer-side offer for this seller/request
  const loadOffers = useCallback(async () => {
    if (!token || !requestId) return;
    try {
      const res = await fetchOffersByRequest(requestId, token);
      const offers = (res.offers || []).slice().sort((a, b) => new Date((a as any)?.createdAt || 0).getTime() - new Date((b as any)?.createdAt || 0).getTime());
      const acceptedId = (res as any)?.acceptedOfferId;
      const acceptedOfferRaw = (res as any)?.acceptedOffer || (offers || []).find(o => String((o as any)._id) === String(acceptedId));
      const relevant = offers.filter(o => {
        const sid = String((o as any)?.seller?._id || (o as any)?.seller || '');
        return isSeller ? sid === String(userId) : sellerIdParam ? sid === String(sellerIdParam) : false;
      });
      const priced = relevant.filter(o => Number.isFinite((o as any)?.price));
      const latestId = priced.length ? (priced[priced.length - 1] as any)._id : undefined;
      setOfferMessages(
        priced.map(o => ({
          id: `offer-${(o as any)._id}`,
          sender: isSeller ? 'me' : 'them',
          type: 'offer',
          createdAt: new Date((o as any)?.createdAt || Date.now()).getTime(),
          timestamp: '',
          offer: {
            id: (o as any)._id,
            price: (o as any).price,
            warranty: (o as any).warranty,
            returnDays: (o as any).returnDays,
            isLatest: latestId ? String(latestId) === String((o as any)._id) : false,
            accepted: Boolean(
              (o as any).accepted ||
              (acceptedId && String(acceptedId) === String((o as any)._id)) ||
              (acceptedOfferRaw && String((acceptedOfferRaw as any)._id) === String((o as any)._id))
            ),
          },
        }))
      );
    } catch {
      setOfferMessages([]);
    }
  }, [token, requestId, isSeller, sellerIdParam, userId]);

  // initial offer fetch
  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // fallback polling (helps when socket stub is used)
  useEffect(() => {
    const interval = setInterval(() => {
      loadHistory();
      loadOffers();
    }, 4000);
    return () => clearInterval(interval);
  }, [loadHistory, loadOffers]);

  // keep list pinned when keyboard opens
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 10);
    });
    return () => sub.remove();
  }, []);

  // websocket subscription for realtime updates
  useEffect(() => {
    if (!token || !requestId) return;
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    const socket = io(baseUrl, {
      transports: ['websocket'],
      auth: { token: `Bearer ${token}` },
      extraHeaders: { Authorization: `Bearer ${token}` },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-request', requestId);
    });

    // offers pushed in real-time (if server emits)
    socket.on('offer:new', () => {
      loadOffers();
    });
    socket.on('offer:accepted', (payload: any) => {
      if (payload?.offerId && payload?.requestId === requestId) {
        setAcceptedLive(true);
        setOfferMessages(prev =>
          prev.map(m =>
            m.offer ? { ...m, offer: { ...m.offer, accepted: true } } : m
          )
        );
        loadOffers();
      }
    });

    socket.on('chat:new', async (incoming: any) => {
      const mapped = mapMessage(incoming);
      setMessages(prev => (prev.some(p => p.id === mapped.id) ? prev : [...prev, mapped]));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
      if (mapped.sender === 'them') {
        DeviceEventEmitter.emit('chat:new', { requestId, sellerId: sellerIdParam, sender: incoming?.sender });
        try {
          await markChatRead(requestId, token, sellerIdParam);
          DeviceEventEmitter.emit('chatRead', { requestId, sellerId: sellerIdParam });
        } catch { }
      }
    });

    socket.on('connect_error', err => {
      console.error('socket connect error', err?.message || err);
    });

    return () => {
      socket.off('chat:new');
      socket.off('offer:new');
      socket.off('offer:accepted');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, requestId, userId, sellerIdParam, loadOffers]);

  // listen for local offer creation events (when seller submits from makeoffer screen)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('offer:created', (payload: any) => {
      if (!payload?.requestId || payload.requestId !== requestId) return;
      loadOffers();
    });
    return () => {
      sub.remove();
    };
  }, [requestId, loadOffers]);

  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;
    if (!token || !requestId) {
      alert('Login required');
      return;
    }

    let imageUrl: string | undefined;
    if (selectedImage) {
      try {
        imageUrl = await uploadProfileImage(selectedImage, token, 'chat');
      } catch (err: any) {
        alert(err?.message || 'Upload failed');
        return;
      }
    }

    const payload: any = {};
    if (input.trim()) payload.text = input.trim();
    if (imageUrl) payload.imageUrl = imageUrl;
    try {
      const res = await sendChatMessage(
        requestId,
        { ...payload, ...(sellerIdParam ? { sellerId: sellerIdParam } : {}) },
        token
      );
      const mapped = mapMessage(res?.item || { ...payload, createdAt: new Date(), sender: userId });
      setMessages(prev => (prev.some(p => p.id === mapped.id) ? prev : [...prev, mapped]));
      setInput('');
      setSelectedImage(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      const message = getModerationMessage(err?.reason);
      Alert.alert('Message blocked', message, [{ text: 'OK' }]);
    }
  };


  const renderItem = ({ item }: { item: Message }) => {
    if (item.type === 'offer') {
      const offerForBubble = item.offer;
      return (
        <View style={[styles.bubbleContainer, isSeller ? styles.bubbleRight : styles.bubbleLeft]}>
          <View style={[
            styles.offerMessageBubble,
            styles.offerFullWidth,
            isSeller ? styles.offerBubbleSeller : styles.offerBubbleBuyer
          ]}>
            <Text style={isSeller? styles.offerBannerTitle: styles.offerBannerTitleBuyer}>{isSeller ? 'Offer from you' : 'Offer from seller'}</Text>
            {offerForBubble?.price !== undefined && (
              <Text style={isSeller? styles.offerBannerText: styles.offerBannerTextBuyer}>Price For 1 Unit: PKR {offerForBubble.price?.toLocaleString()}</Text>
            )}
            {offerForBubble?.warranty ? (
              <Text style={isSeller? styles.offerBannerText: styles.offerBannerTextBuyer}>Warranty: {offerForBubble.warranty}</Text>
            ) : null}
            {offerForBubble?.returnDays !== undefined ? (
              <Text style={isSeller? styles.offerBannerText: styles.offerBannerTextBuyer}>Returns: {offerForBubble.returnDays} days</Text>
            ) : null}
            {offerForBubble?.accepted ? (
              <Text style={[isSeller? styles.offerBannerText: styles.offerBannerTextBuyer, { fontFamily: 'semiBold', color: COLORS.grayscale700 }]}>
                Offer accepted
              </Text>
            ) : null}
            {!isSeller && Number.isFinite(offerForBubble?.price) && (
              <TouchableOpacity
                disabled={!offerForBubble?.isLatest || offerForBubble?.accepted}
                style={[
                  styles.offerActionBtn,
                  { backgroundColor: offerForBubble?.isLatest && !offerForBubble?.accepted ? COLORS.primary : COLORS.greyscale300 },
                ]}
                onPress={async () => {
                  if (!token || !offerForBubble?.id) return;
                  try {
                    await acceptOffer(offerForBubble.id, token);
                    setOfferMessages(prev =>
                      prev.map(m =>
                        m.offer?.id === offerForBubble.id
                          ? { ...m, offer: { ...m.offer, accepted: true } }
                          : m
                      )
                    );
                    await loadOffers();
                    DeviceEventEmitter.emit('cart:navigate');
                    router.replace('/(tabs)/cart');
                  } catch (err: any) {
                    Alert.alert('Error', err?.message || 'Could not accept offer');
                  }
                }}
              >
                <Text style={[styles.offerActionText, { color: offerForBubble?.isLatest && !offerForBubble?.accepted ? COLORS.white : COLORS.greyscale900 }]}>
                  {offerForBubble?.accepted ? 'Offer accepted' : offerForBubble?.isLatest ? 'Accept Offer' : 'Offer superseded'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    const isMe = item.sender === 'me';

    return (
      <View
        style={[
          styles.bubbleContainer,
          isMe ? styles.bubbleRight : styles.bubbleLeft
        ]}
      >
        {!isMe && item.avatar && (
          <Image
            source={typeof item.avatar === 'string' ? { uri: item.avatar } : item.avatar}
            style={styles.avatar}
          />
        )}

        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>

          {/* ✅ Inject image preview if available */}
          {item.imageUri && (
            <Image
              source={{ uri: item.imageUri }}
              style={{
                width: 180,
                height: 180,
                borderRadius: 12,
                marginBottom: 12,
              }}
            />
          )}

          {/* ✅ Inject text message if available */}
          {item.text && (
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
              {item.text}
            </Text>
          )}

          {/* ✅ Timestamp */}
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };


  const renderHeader = () => (
    <HeaderWithSearch
      title={
        isSeller
          ? `${requestNumber ? `#${requestNumber} · ` : ''}${partNameParam || 'Chat'}`
          : storeDisplayName
      }
      icon={undefined}
      avatarUri={!isSeller ? storeAvatarUri || undefined : undefined}
      avatarFallbackText={!isSeller ? storeDisplayName : undefined}
      rightActionLabel={
        isSeller && !isChatClosed
          ? 'Make Offer'
          : !isSeller && latestAcceptableOffer
            ? `Accept Offer · PKR ${latestAcceptableOffer.price?.toLocaleString?.() || ''}`
            : undefined
      }
      onRightAction={
        isSeller
          ? () => navigation.navigate('makeoffer' as never, { requestId: partRequestId } as never)
            : latestAcceptableOffer && !isChatClosed
            ? async () => {
              if (!token || !latestAcceptableOffer?.id) return;
              try {
                const res = await acceptOffer(latestAcceptableOffer.id, token);
                setOfferMessages(prev =>
                  prev.map(m =>
                    m.offer?.id === latestAcceptableOffer.id
                      ? { ...m, offer: { ...m.offer, accepted: true } }
                      : m
                  )
                );
                await loadOffers();
                DeviceEventEmitter.emit('cart:navigate');
                router.replace('/(tabs)/cart');
              } catch (err: any) {
                Alert.alert('Error', err?.message || 'Could not accept offer');
              }
            }
            : undefined
      }
      onPress={() => navigation.goBack()}
    />
  );
  return (
    <SafeAreaView style={[styles.area, { backgroundColor: Colors.background }]}

    >
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        {renderHeader()}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={
              [...messages, ...offerMessages].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
            }
            keyExtractor={m => m.id}
            renderItem={renderItem}
            extraData={offerMessages}
            ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
            contentContainerStyle={[styles.chatList, { paddingBottom: 200 }]}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
          {selectedImage && (

            <View style={styles.imagePreviewRow}>
              <View style={styles.imagePreviewTextSection}>
                <Text style={styles.previewLabel}>You</Text>
                <View style={styles.previewRow}>
                  <Image source={icons.image} style={styles.previewIcon} />
                  <Text style={styles.previewText}>Photo</Text>
                </View>
              </View>
              <View style={styles.imageThumbnailWrapper}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imageThumbnail}
                />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}


          {isChatClosed ? (
          <View style={[styles.closedBar, { backgroundColor: dark ? '#111' : '#f2f2f2', borderColor: dark ? '#333' : '#ddd' }]}>
            <Text style={[styles.closedText, { color: dark ? COLORS.secondaryWhite : COLORS.grayscale700 }]}>
              Chat ended · Offer was accepted.
            </Text>
          </View>
          ) : (
            <View style={[styles.inputBar, { backgroundColor: dark ? '#111' : '#E1E1E10000' }]}>
              <TouchableOpacity style={styles.iconButton} onPress={handleImagePick}>
                <Feather name="paperclip" size={24} color={dark ? '#CCC' : '#555'} />
              </TouchableOpacity>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Type a message"
                placeholderTextColor={dark ? '#888' : '#999'}
                style={[styles.textInput, { color: dark ? '#FFF' : '#000' }]}
              />
              <TouchableOpacity style={styles.iconButton} onPress={sendMessage}>
                <MaterialIcons name="send" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  area: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  chatList: { paddingTop: 20, paddingBottom: 0 },
  bubbleContainer: {
    flexDirection: 'row',
    marginVertical: 15,
    alignItems: 'flex-end',
  },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  bubble: {
    maxWidth: SIZES.width * 0.7,
    padding: 15,
    borderRadius: 16,
  },
  bubbleOther: {
    backgroundColor: '#DDD',
    borderTopLeftRadius: 0,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 0,
  },
  bubbleText: {
    fontSize: 14,
    color: '#000',
  },
  bubbleTextMe: {
    color: '#FFF',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
  },
  timeTextOther: {
    color: '#555',
    textAlign: 'left',
  },
  timeTextMe: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
  },
  inputBar: {
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.silver,
    borderRadius: 30,
    paddingHorizontal: 12


  },
  iconButton: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 30,
    backgroundColor: '#FFF',
    fontFamily: 'regular',
    fontSize: 14

  },
  imagePreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginHorizontal: 12,
    padding: 10,
    backgroundColor: '#000000',
    borderRadius: 12,

  },

  imagePreviewTextSection: {
    flex: 1,
  },

  previewLabel: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 4,
  },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  previewIcon: {
    width: 16,
    height: 16,
    marginRight: 6,
    tintColor: '#fff',
  },

  previewText: {
    color: '#ffffff',
    fontSize: 14,
  },

  imageThumbnailWrapper: {
    position: 'relative',
  },

  imageThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },

  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff0000',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },

  removeImageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 14,
    fontWeight: 'bold',
  },

  offerMessageWrapper: { alignItems: 'flex-start', marginBottom: 12 },
  offerMessageBubble: {
    backgroundColor: '#f2f2f2',
    padding: 14,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  offerFullWidth: { width: '80%' },
  offerBubbleSeller: {
    backgroundColor: COLORS.black,
    borderColor: '#cdddf6',
    borderTopRightRadius: 0,
    borderTopLeftRadius: 16,
    alignSelf: 'flex-end',
  },
  offerBubbleBuyer: {
    alignSelf: 'flex-start',
    backgroundColor: "#DDD"
  },
  offerBannerTitle: { fontFamily: 'bold', fontSize: 18, color: COLORS.white, marginBottom: 10 },
  offerBannerTitleBuyer: { fontFamily: 'bold', fontSize: 18, color: COLORS.black, marginBottom: 10 },
  offerBannerText: { fontFamily: 'medium', fontSize: 15, color: COLORS.white, marginBottom: 4 },
  offerBannerTextBuyer: { fontFamily: 'medium', fontSize: 15, color: COLORS.black, marginBottom: 4 },
  offerActionBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  offerActionText: {
    fontFamily: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  closedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  closedText: { fontFamily: 'semiBold', fontSize: 15 },
});
