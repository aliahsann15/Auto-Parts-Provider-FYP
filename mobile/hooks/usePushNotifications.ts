import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import * as Application from 'expo-application'
import Constants from 'expo-constants'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { listMyPushTokens, registerPushToken, sendTestNotification } from '@/utils/api/notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
})

const LAST_EXPO_TOKEN_KEY = 'last_expo_push_token'
const LAST_FCM_TOKEN_KEY = 'last_fcm_push_token'

type UsePushOptions = {
  authToken: string | null
  autoRegister?: boolean
}

export function usePushNotifications({ authToken, autoRegister = true }: UsePushOptions) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const [devicePushToken, setDevicePushToken] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus>(
    Notifications.PermissionStatus.UNDETERMINED
  )
  const [isRegistering, setIsRegistering] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const attemptedRef = useRef(false)

  useEffect(() => {
    attemptedRef.current = false
  }, [authToken])

  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C'
      }).catch(() => undefined)
    }
  }, [])

  const getProjectId = useCallback(() => {
    return (
      (Constants.expoConfig as any)?.extra?.eas?.projectId ||
      (Constants.easConfig as any)?.projectId ||
      null
    )
  }, [])

  const getDeviceId = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        return Application.getAndroidId() || null
      } catch {
        return null
      }
    }
    if (Platform.OS === 'ios') {
      try {
        const vendorId = await Application.getIosIdForVendorAsync()
        return vendorId || null
      } catch {
        return null
      }
    }
    return null
  }, [])

  const registerAsync = useCallback(async () => {
    if (!authToken) throw new Error('Login required before registering for push notifications')
    if (!Device.isDevice) throw new Error('Push notifications require a physical device')

    setIsRegistering(true)
    setError(null)

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus
      if (existingStatus !== 'granted') {
        const req = await Notifications.requestPermissionsAsync()
        finalStatus = req.status
      }
      setPermissionStatus(finalStatus)
      if (finalStatus !== 'granted') {
        throw new Error('Permission not granted for notifications')
      }

      const projectId = getProjectId()
      if (!projectId) {
        throw new Error('EAS projectId missing in app config (needed for Expo push tokens)')
      }

      const expoTokenResponse = await Notifications.getExpoPushTokenAsync({ projectId })
      const nextExpoToken = expoTokenResponse.data
      setExpoPushToken(nextExpoToken)

      const deviceId = await getDeviceId()
      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown'

      await registerPushToken(
        { token: nextExpoToken, provider: 'expo', platform, deviceId },
        authToken
      )
      await AsyncStorage.setItem(LAST_EXPO_TOKEN_KEY, nextExpoToken)

      if (Platform.OS === 'android') {
        try {
          const fcm = await Notifications.getDevicePushTokenAsync()
          const fcmToken = (fcm as any)?.data || (fcm as any)?.token
          if (typeof fcmToken === 'string' && fcmToken.length > 10) {
            setDevicePushToken(fcmToken)
            await registerPushToken(
              { token: fcmToken, provider: 'fcm', platform: 'android', deviceId },
              authToken
            )
            await AsyncStorage.setItem(LAST_FCM_TOKEN_KEY, fcmToken)
          }
        } catch (err: any) {
          // FCM token is optional for Expo Go; log but don't block Expo push registration
          setError(prev => prev || err?.message || 'Could not fetch FCM token')
        }
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to register for push notifications'
      setError(message)
      throw err
    } finally {
      setIsRegistering(false)
    }
  }, [authToken, getDeviceId, getProjectId])

  const ensureDevicePushToken = useCallback(async () => {
    if (!authToken) throw new Error('Login required before checking push notifications')
    setIsRegistering(true)
    setError(null)

    let needsRegistration = true

    try {
      const deviceId = await getDeviceId()
      const res = await listMyPushTokens(authToken)
      const tokens = (res as any)?.tokens || []
      const alreadyRegistered =
        !!deviceId && tokens.some((t: any) => t?.deviceId && t.deviceId === deviceId)
      if (alreadyRegistered) {
        needsRegistration = false
      }
    } catch (err: any) {
      // If we can't verify, fall back to attempting registration
      setError(prev => prev || err?.message || 'Failed to verify push token for this device')
    }

    try {
      if (needsRegistration) {
        await registerAsync()
      }
    } finally {
      setIsRegistering(false)
    }
  }, [authToken, getDeviceId, registerAsync])

  useEffect(() => {
    if (!autoRegister || !authToken) return
    if (attemptedRef.current) return
    attemptedRef.current = true
    ensureDevicePushToken().catch(() => undefined)
  }, [authToken, autoRegister, ensureDevicePushToken])

  const triggerTestNotification = useCallback(
    async (opts?: { title?: string; body?: string }) => {
      if (!authToken) throw new Error('Login required to send a test notification')
      setIsSendingTest(true)
      try {
        await sendTestNotification(authToken, opts)
      } catch (err: any) {
        setError(err?.message || 'Failed to send test notification')
        throw err
      } finally {
        setIsSendingTest(false)
      }
    },
    [authToken]
  )

  return {
    expoPushToken,
    devicePushToken,
    permissionStatus,
    isRegistering,
    isSendingTest,
    error,
    ensureDevicePushToken,
    registerAsync,
    triggerTestNotification
  }
}
