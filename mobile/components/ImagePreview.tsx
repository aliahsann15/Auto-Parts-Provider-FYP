import React from 'react'
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import { COLORS, icons } from '@/constants'

type ImagePreviewProps = {
  visible: boolean
  imageUri?: string | null
  onClose: () => void
}

export default function ImagePreview({ visible, imageUri, onClose }: ImagePreviewProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Image source={icons.cancelSquare2} style={styles.closeIcon} />
        </TouchableOpacity>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          maximumZoomScale={3}
          minimumZoomScale={1}
          pinchGestureEnabled
        >
          {imageUri ? (
            <ExpoImage source={{ uri: imageUri }} contentFit="contain" style={styles.image} />
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    paddingTop: 40,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    zIndex: 2,
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.white,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  image: {
    width: '100%',
    height: '100%',
    maxHeight: 600,
  },
})
