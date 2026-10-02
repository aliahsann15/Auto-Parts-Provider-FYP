import React from 'react'
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native'
import { COLORS } from '@/constants'

const BOX = 80

export interface ImagePickerBoxProps {
  // allow either a URI string or a bundled asset module
  uri: string | number
  onPick: () => void
  onDelete: () => void
}

export default function ImagePickerBox({
  uri,
  onPick,
  onDelete,
}: ImagePickerBoxProps) {
  // determine source: number = require(...) asset, object = { uri: string }
  const source: ImageSourcePropType =
    typeof uri === 'number' ? (uri as number) : ({ uri } as { uri: string })

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.box}
        onPress={onPick}
        activeOpacity={0.8}
      >
        {uri ? (
          <>
            <Image
              source={source}
              style={styles.image}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onDelete}
            >
              <Text style={styles.deleteText}>×</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.plus}>+</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: BOX,
    height: BOX,
    marginRight: 8,
    marginBottom: 8,
    position: 'relative',
    overflow: 'visible',
  },
  box: {
    width: BOX,
    height: BOX,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: BOX,
    height: BOX,
    borderRadius: 10,
  },
  plus: {
    fontSize: 32,
    color: COLORS.primary,
  },
  deleteButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.red,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    elevation: 5,
  },
  deleteText: {
    color: COLORS.white,
    fontSize: 14,
    lineHeight: 14,
    fontWeight: 'bold',
  },
})
