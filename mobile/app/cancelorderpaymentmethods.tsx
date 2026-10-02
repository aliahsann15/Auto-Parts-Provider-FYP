import { View, Text, StyleSheet, Image, BackHandler } from 'react-native'
import React, { useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, router } from 'expo-router'
import { NavigationProp, useRoute, CommonActions } from '@react-navigation/native'
import Header from '../components/Header'
import ButtonFilled from '../components/ButtonFilled'
import { useTheme } from '../theme/ThemeProvider'
import { COLORS, SIZES, illustrations, icons } from '../constants'

const CancelOrderPaymentMethods = () => {
  const navigation = useNavigation<NavigationProp<any>>()
  const route = useRoute()
  const { colors, dark } = useTheme()

  const orderTitle = (route.params as any)?.orderTitle as string | undefined
  const message =
    (route.params as any)?.message ||
    'Your order has been cancelled. Refunds are typically processed within 14 working days. Read our refund policy to learn more.'

  // Block hardware/back gestures on this screen
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true)
    const removeNav = (navigation as any)?.addListener?.('beforeRemove', (e: any) => {
      e.preventDefault()
    })
    ;(navigation as any)?.setOptions?.({ gestureEnabled: false })
    return () => {
      sub.remove()
      removeNav?.()
    }
  }, [navigation])

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Order Cancelled" onBackPress={() => {}} />
        <View style={[styles.content, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
          <View style={styles.illustrationWrap}>
            <Image
              source={illustrations.background}
              resizeMode="contain"
              style={[styles.bg, { tintColor: dark ? COLORS.white : COLORS.primary }]}
            />
            <Image
              source={icons.check}
              resizeMode="contain"
              style={[styles.checkIcon, { tintColor: dark ? COLORS.dark3 : COLORS.white }]}
            />
          </View>
          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            {orderTitle} has been cancelled at your request.
          </Text>
          {/* {orderTitle ? (
            <Text style={[styles.subtitle, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
              {orderTitle} has been cancelled at your request.
            </Text>
          ) : null} */}
          <Text style={[styles.subtitle, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
            {message}
          </Text>
          <ButtonFilled
            title="Back to Home"
            style={styles.button}
            onPress={() => {
              router.push('/(tabs)')
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  content: {
    flex: 1,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  illustrationWrap: {
    height: 140,
    width: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bg: {
    height: 160,
    width: 160,
  },
  checkIcon: {
    position: 'absolute',
    height: 56,
    width: 56,
  },
  title: {
    fontSize: 22,
    fontFamily: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'regular',
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    width: SIZES.width - 64,
    borderRadius: 32,
    marginTop: 24,
  },
})

export default CancelOrderPaymentMethods
