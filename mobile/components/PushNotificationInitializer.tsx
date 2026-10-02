import React, { useEffect } from 'react'
import { DeviceEventEmitter } from 'react-native'
import * as Notifications from 'expo-notifications'
import { useAuth } from '@/app/context/AuthContext'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushNotificationInitializer() {
  const { token, isLoggedIn } = useAuth()

  usePushNotifications({
    authToken: isLoggedIn ? token : null,
    autoRegister: isLoggedIn
  })

  useEffect(() => {
    const notify = (notification: Notifications.Notification) => {
      const data = notification?.request?.content?.data as any;
      const type = data?.type || data?.eventType;
      if (type === 'order') {
        DeviceEventEmitter.emit('orders:updated', data || {});
      }
    };
    const receivedSub = Notifications.addNotificationReceivedListener(({ notification }) => notify(notification))
    const responseSub = Notifications.addNotificationResponseReceivedListener(({ notification }) => notify(notification))
    return () => {
      receivedSub.remove()
      responseSub.remove()
    }
  }, [])

  return null
}
