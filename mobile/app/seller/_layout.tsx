import { Tabs } from "expo-router"
import { View, Text, Platform, DeviceEventEmitter } from "react-native"
import { Image } from "expo-image"
import { COLORS, icons, FONTS, SIZES } from "../../constants"
import { useTheme } from "@/theme/ThemeProvider"
import { useCallback, useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { fetchNotificationCount } from "@/utils/api/notifications"
import { fetchSellerPartsRequests } from "@/utils/api/partsRequests"

const SellerTabLayout = () => {
  const { dark } = useTheme()
  const { token } = useAuth()
  const [unreadRequests, setUnreadRequests] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadByRequest, setUnreadByRequest] = useState<Record<string, number>>({})

  const updateCountsFromItems = useCallback((items: any[] = []) => {
    const map: Record<string, number> = {}
    items.forEach(item => {
      const id =
        (item?.request?._id || item?._id || item?.id || item?.requestId)?.toString?.()
      if (!id) return
      const unread = Number(item?.unreadMessages || 0)
      map[id] = Math.max(0, unread)
    })
    setUnreadByRequest(map)
    const total = Object.values(map).reduce((sum, count) => sum + count, 0)
    setUnreadRequests(total)
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const loadCounts = async () => {
      if (!token) {
        setUnreadRequests(0)
        setUnreadNotifications(0)
        return
      }
      try {
        const res = await fetchSellerPartsRequests(token)
        updateCountsFromItems(res?.items || [])
      } catch {
        setUnreadRequests(0)
        setUnreadByRequest({})
      }
      try {
        const res2 = await fetchNotificationCount(token)
        const count = Number(res2?.unreadCount || 0)
        setUnreadNotifications(count)
        DeviceEventEmitter.emit('notifications:badge', { unreadCount: count })
      } catch { setUnreadNotifications(0) }
    }
    loadCounts()
    timer = setInterval(loadCounts, 10000)
    const handleChatRead = (payload: any) => {
      if (payload?.requestId) {
        setUnreadByRequest(prev => {
          const requestId = String(payload.requestId)
          if (!prev[requestId]) return prev
          const next = { ...prev, [requestId]: 0 }
          const total = Object.values(next).reduce((sum, count) => sum + count, 0)
          setUnreadRequests(total)
          return next
        })
      }
      loadCounts()
    }
    const chatSub = DeviceEventEmitter.addListener('chatRead', (payload: any) => handleChatRead(payload))
    const chatNewSub = DeviceEventEmitter.addListener('chat:new', loadCounts)
    const notifSub = DeviceEventEmitter.addListener('notifications:updated', (p: any) => {
      if (typeof p?.unreadCount === 'number') {
        setUnreadNotifications(p.unreadCount)
        DeviceEventEmitter.emit('notifications:badge', { unreadCount: p.unreadCount })
      } else {
        loadCounts()
      }
    })
    return () => {
      if (timer) clearInterval(timer)
      chatSub.remove()
      chatNewSub.remove()
      notifSub.remove()
    }
  }, [token, updateCountsFromItems])

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS !== "ios",
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          height: Platform.OS === "ios" ? 80 : 60,
          backgroundColor: dark ? COLORS.dark1 : COLORS.white,
          paddingLeft: 15
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={{ alignItems: "center", paddingTop: 16, width: SIZES.width / 5 }}>
              <Image
                source={focused ? icons.home2 : icons.home2Outline}
                contentFit="contain"
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused
                    ? dark
                      ? COLORS.white
                      : COLORS.primary
                    : dark
                    ? COLORS.gray3
                    : COLORS.gray3,
                }}
              />
              <Text
                style={{
                  ...FONTS.body4,
                  color: focused
                    ? dark
                      ? COLORS.white
                      : COLORS.primary
                    : dark
                    ? COLORS.gray3
                    : COLORS.gray3,
                }}
              >
                Dashboard
              </Text>
            </View>
          ),
        }}
      />

      {/* Products Tab */}
      <Tabs.Screen
        name="products"
        options={{
          title: "",
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={{ alignItems: "center", paddingTop: 16, width: SIZES.width / 5}}>
              <Image
                source={focused ? icons.cart : icons.cartOutline}
                contentFit="contain"
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused
                    ? dark
                      ? COLORS.white
                      : COLORS.primary
                    : dark
                    ? COLORS.gray3
                    : COLORS.gray3,
                }}
              />
              <Text
                style={{
                  ...FONTS.body4,
                  color: focused
                    ? dark
                      ? COLORS.white
                      : COLORS.primary
                    : dark
                    ? COLORS.gray3
                    : COLORS.gray3,
                }}
              >
                Products
              </Text>
            </View>
          ),
        }}
      />

      {/* Orders Tab */}
      <Tabs.Screen
        name="orders"
        options={{
          title: "",
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={{ alignItems: "center", paddingTop: 16, width: SIZES.width / 5}}>
              <Image
                source={focused ? icons.bag3 : icons.bag3Outline}
                contentFit="contain"
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused
                    ? dark
                      ? COLORS.white
                      : COLORS.primary
                    : dark
                    ? COLORS.gray3
                    : COLORS.gray3,
                }}
              />
              <Text
                style={{
                  ...FONTS.body4,
                  color: focused
                    ? dark
                      ? COLORS.white
                      : COLORS.primary
                    : dark
                    ? COLORS.gray3
                    : COLORS.gray3,
                }}
              >
                Orders
              </Text>
            </View>
          ),
        }}
      />

      {/* Order Request Tab */}
      <Tabs.Screen
        name="orderrequest"
        options={{
          title: "",
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={{ alignItems: "center", paddingTop: 16, width: SIZES.width / 5}}>
              <Image
                source={focused ? icons.chat : icons.chatOutline}
                contentFit="contain"
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused
                    ? dark
                      ? COLORS.white
                      : COLORS.primary
                    : dark
                    ? COLORS.gray3
                    : COLORS.gray3,
                }}
              />
              {unreadRequests > 0 && (
                <View style={{ position: 'absolute', top: 10, right: 14, backgroundColor: COLORS.primary, borderRadius: "50%", paddingHorizontal: 5, paddingVertical: 2, minWidth: 18, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.white, fontSize: 12, fontFamily: 'bold' }}>
                    {unreadRequests > 99 ? '99+' : unreadRequests}
                  </Text>
                </View>
              )}
              <Text
                style={{
                  ...FONTS.body4,
                  color: focused
                    ? dark
                      ? COLORS.white
                      : COLORS.primary
                    : dark
                    ? COLORS.gray3
                    : COLORS.gray3,
                }}
              >
                Quotes
              </Text>
            </View>
          ),
        }}
      />

      {/* More Tab */}
      <Tabs.Screen
        name="more"
        options={{
          title: "",
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={{ alignItems: "center", paddingTop: 16, width: SIZES.width / 5 }}>
              <Image
                source={focused ? icons.user : icons.userOutline}
                contentFit="contain"
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused
                    ? dark
                      ? COLORS.white
                      : COLORS.primary
                    : dark
                    ? COLORS.gray3
                    : COLORS.gray3,
                }}
              />
              <Text
                style={{
                  ...FONTS.body4,
                  color: focused
                    ? dark
                      ? COLORS.white
                      : COLORS.primary
                    : dark
                    ? COLORS.gray3
                    : COLORS.gray3,
                }}
              >
                More
              </Text>
            </View>
          ),
        }}
      />
    
     
    </Tabs>
  )
}

export default SellerTabLayout
