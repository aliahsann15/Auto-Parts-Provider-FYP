// screens/ChatScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons, SIZES } from '@/constants';
import { conversation } from '@/data';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import HeaderWithSearch from '@/components/HeaderWithSearch';
// import { Colors } from 'react-native/Libraries/NewAppScreen';

type Message = {
  id: string;
  text?: string;
  timestamp: string;
  sender: string;
  avatar?: string;
  imageUri?: string;
};

type ParamList = {
  ChatScreen: { chatId: string };
};

const Colors = {
  background: '#fff',
  text: '#000',
  primary: '#1e90ff',
  secondary: '#ccc',
};

export default function ChatScreen() {
  const { dark } = useTheme();
  const route = useRoute<RouteProp<ParamList, 'ChatScreen'>>();
  const [messages, setMessages] = useState<Message[]>([]);
  const navigation = useNavigation();
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
      setSelectedImage(uri);
    }
  };

  useEffect(() => {
    setMessages(conversation);
  }, []);

  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (!input.trim() && !selectedImage) return;

    const now = new Date();
    const hh = now.getHours();
    const mm = now.getMinutes();
    const timestamp = `${hh % 12 || 12}:${mm.toString().padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;

    const newMsg: Message = {
      id: Date.now().toString(),
      timestamp,
      sender: 'me',
      ...(input.trim() && { text: input }),
      ...(selectedImage && { imageUri: selectedImage }),
    };

    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setSelectedImage(null);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.sender === 'me';
    return (
      <View style={[styles.bubbleContainer, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
        {!isMe && item.avatar && (
          <Image
            source={typeof item.avatar === 'string' ? { uri: item.avatar } : item.avatar}
            style={styles.avatar}
          />
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {item.imageUri && (
            <Image
              source={{ uri: item.imageUri }}
              style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 12 }}
            />
          )}
          {item.text && (
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.text}</Text>
          )}
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <HeaderWithSearch
      title="Ahmed Auto Parts"
      icon={icons.moreCircle}
      onPress={() => navigation.goBack()}
    />
  );

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: Colors.background }]}>
      <View style={[styles.container, { backgroundColor: Colors.background }]}>
        {renderHeader()}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderItem}
            contentContainerStyle={styles.chatList}
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
                <Image source={{ uri: selectedImage }} style={styles.imageThumbnail} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  area: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, padding: 16 },
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
    marginBottom: -20,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 14,
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
});
