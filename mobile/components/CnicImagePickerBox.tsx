import React from 'react'
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  ImageSourcePropType,
} from 'react-native'
import { COLORS, SIZES } from '@/constants'



export interface CnicImagePickerBoxProps {
  // allow either a URI string or a bundled asset module
  uri: string | number
  onPick: () => void
  onDelete: () => void
  label: string; // "Front" or "Back"
}

export default function CnicImagePickerBox({
  uri,
  onPick,
  onDelete,
  label,
}: CnicImagePickerBoxProps) {
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
          
          <View style={styles.placeholder}>
          <Text style={styles.plus}>+</Text>
          <Text style={styles.labelText}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginRight: 8,
    marginBottom: 16,
    position: 'relative',
    overflow: 'visible',
  },
  box: {
    width: '100%',
    height: 200,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center'
  },
  image: {
    width: '100%',
    height: '100%',
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
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  
})
