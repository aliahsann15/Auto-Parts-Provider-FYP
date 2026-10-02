// components/ChatItem.tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native';
import { COLORS, SIZES, FONTS } from '../constants';

export interface ChatItemProps {
  id: string;
  fullName: string;
  userImg: ImageSourcePropType;
  lastMessage: string;
  lastMessageTime: string;   // e.g. "09:20 AM"
  messageInQueue?: number;   // optional in data set
  isOnline?: boolean;        // optional in data set
  active?: boolean;          // if this chat is “selected”
  onPress: (id: any) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({
  id,
  fullName,
  userImg,
  lastMessage,
  lastMessageTime,
  messageInQueue = 0,
  isOnline = false,
  active = false,
  onPress,
}) => (
  <TouchableOpacity
    style={[
      styles.container,
  
    ]}
    onPress={() => onPress(id)}
  >
    <View>
      <Image source={userImg} style={styles.avatar} />
      <View
        style={[
          styles.statusDot,
          { backgroundColor: isOnline ? COLORS.success : COLORS.error }
        ]}
      />
    </View>

    <View style={styles.content}>
      <View style={styles.row}>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.time}>{lastMessageTime}</Text>
      </View>

      <View style={styles.row}>
        <Text
          style={styles.message}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {lastMessage}
        </Text>
        {messageInQueue > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{messageInQueue}</Text>
          </View>
        )}
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      paddingVertical: 16,
     
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderColor: '#E5E5EA', // light gray
    },
    
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    statusDot: {
      position: 'absolute',
      bottom: 1,
      right: 1,
      width: 15,
      height: 15,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#FFFFFF', // white border around the dot
      backgroundColor: '#34C759', // green
    },
    content: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    name: {
      fontSize: 17,
      fontFamily: "bold",
      color: COLORS.greyscale900, marginBottom: 8
    },
    nameActive: {
      color: '#FFFFFF', // when active
    },
    time: {
      fontSize: 13,
      color: '#8E8E93',
      marginBottom: 8, // medium gray
    },
    message: {
      flex: 1,
      fontSize: 14,
      color: '#8E8E93',
      marginRight: 8,
    },
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#000000', // orange
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '500',
    },
  });
  

export default ChatItem;
