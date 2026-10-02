import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Platform, DeviceEventEmitter } from 'react-native';
import { Image } from 'expo-image';
import { router, Tabs } from 'expo-router';
import { COLORS, icons, FONTS, SIZES } from '../../constants';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/app/context/AuthContext';
import { fetchBuyerQuotes } from '@/utils/api/offers';
import { fetchNotificationCount } from '@/utils/api/notifications';


export default function TabLayout() {
  const { dark } = useTheme();
  const { isLoggedIn, user, token } = useAuth();
  const [unreadRequests, setUnreadRequests] = useState<number>(0);
  const [currentRoute, setCurrentRoute] = useState<string>('');

  const loadCounts = useCallback(async () => {
    if (!token || user?.role?.toLowerCase() === 'seller') {
      setUnreadRequests(0);
      return;
    }
    try {
      const res = await fetchBuyerQuotes(token);
      const total = (res?.offers || []).reduce((sum, o: any) => {
        const c = Number(o?.unreadMessages || 0);
        return sum + (Number.isFinite(c) ? c : 0);
      }, 0);
      setUnreadRequests(total);
    } catch {
      // ignore
    }
    try {
      const notifRes = await fetchNotificationCount(token);
      const unread = Number(notifRes?.unreadCount || 0);
      DeviceEventEmitter.emit('notifications:badge', { unreadCount: unread });
    } catch {
      // ignore
    }
  }, [token, user?.role]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    loadCounts();
    timer = setInterval(loadCounts, 10000);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loadCounts]);

  useEffect(() => {
    const cartSub = DeviceEventEmitter.addListener('cart:navigate', () => {
      if (!currentRoute.includes('cart')) {
        router.replace('/(tabs)/cart');
      }
    });
    const wishlistSub = DeviceEventEmitter.addListener('wishlist:navigate', () => {
      if (!currentRoute.includes('wishlist')) {
        router.push('/mywishlist');
      }
    });
    const chatSub = DeviceEventEmitter.addListener('chat:new', () => {
      loadCounts();
    });
    const chatReadSub = DeviceEventEmitter.addListener('chatRead', () => {
      loadCounts();
    });
    return () => {
      cartSub.remove();
      wishlistSub.remove();
      chatSub.remove();
      chatReadSub.remove();
    };
  }, [currentRoute, loadCounts]);


  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS !== 'ios',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          right: 0,
          left: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 80 : 60,
          backgroundColor: dark ? COLORS.dark1 : COLORS.white,
        },
      }}
      screenListeners={{
        state: (e: any) => {
          const routeName = e?.data?.state?.routeNames?.[e?.data?.state?.index || 0] || '';
          setCurrentRoute(routeName || '');
          const role = user?.role?.toLowerCase?.() || '';
          if (role === 'seller' || role === 'storemanager') {
            router.replace('/seller');
          }
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          tabBarIcon: ({ focused }: { focused: boolean }) => {
            return (
              <View style={{
                alignItems: "center",
                paddingTop: 16,
                width: SIZES.width / 5
              }}>
                <Image
                  source={focused ? icons.home : icons.home2Outline}
                  contentFit="contain"
                  style={{
                    width: 24,
                    height: 24,
                    tintColor: focused ? dark ? COLORS.white : COLORS.primary : dark ? COLORS.gray3 : COLORS.gray3,
                  }}
                />
                <Text style={{
                  ...FONTS.body4,
                  color: focused ? dark ? COLORS.white : COLORS.primary : dark ? COLORS.gray3 : COLORS.gray3,
                }}>Home</Text>
              </View>
            )
          },
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: "",
          tabBarIcon: ({ focused }: { focused: boolean }) => {
            return (
              <View style={{
                alignItems: "center",
                paddingTop: 16,
                marginLeft: -25,
                width: SIZES.width / 5
              }}>
                <Image
                  source={focused ? icons.bags : icons.bag3Outline}
                  contentFit="contain"
                  style={{
                    width: 24,
                    height: 24,
                    tintColor: focused ? dark ? COLORS.white : COLORS.primary : dark ? COLORS.gray3 : COLORS.gray3,
                  }}
                />
                <Text style={{
                  ...FONTS.body4,
                  color: focused ? dark ? COLORS.white : COLORS.primary : dark ? COLORS.gray3 : COLORS.gray3,
                }}>Cart</Text>
              </View>
            )
          },
        }}
      />

      <Tabs.Screen
        name="request-a-part"
        options={{
          title: "",
          tabBarIcon: ({ focused }: { focused: boolean }) => {
            return (
              <View style={{
                alignItems: "center",
                paddingTop: 16,
                width: SIZES.width / 5
              }}>
                <Image
                  source={focused ? icons.addFile : icons.addFileOutline}
                  contentFit="contain"
                  style={{
                    width: 24,
                    height: 24,
                    tintColor: focused ? dark ? COLORS.white : COLORS.primary : dark ? COLORS.gray3 : COLORS.gray3,
                  }}
                />
                <Text style={{
                  ...FONTS.body4,
                  color: focused ? dark ? COLORS.white : COLORS.primary : dark ? COLORS.gray3 : COLORS.gray3,
                }}>Request Part</Text>
              </View>
            )
          },
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "",
          tabBarBadge: unreadRequests > 0 ? unreadRequests : undefined,
          tabBarBadgeStyle: { right: -12 },
          tabBarIcon: ({ focused }: { focused: boolean }) => {
            return (
              <View style={{
                alignItems: "center",
                paddingTop: 16,
                marginRight: -20,
                width: SIZES.width / 5
              }}>
                <Image
                  source={focused ? icons.chatBubble2 : icons.chatBubble2Outline}
                  contentFit="contain"
                  style={{
                    width: 24,
                    height: 24,
                    tintColor: focused ? dark ? COLORS.white : COLORS.primary : dark ? COLORS.gray3 : COLORS.gray3,
                  }}
                />
                <Text style={{
                  ...FONTS.body4,
                  color: focused ? dark ? COLORS.white : COLORS.primary : dark ? COLORS.gray3 : COLORS.gray3,
                }}>Your Requests</Text>
              </View>
            )
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: "center", paddingTop: 16, width: SIZES.width / 5 }}>
              <Image
                source={focused ? icons.user : icons.userOutline}
                contentFit="contain"
                style={{
                  width: 24,
                  height: 24,
                  tintColor: focused
                    ? dark ? COLORS.white : COLORS.primary
                    : COLORS.gray3,
                }}
              />
              <Text style={{
                ...FONTS.body4,
                color: focused
                  ? dark ? COLORS.white : COLORS.primary
                  : COLORS.gray3,
              }}>
                Profile
              </Text>
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (!isLoggedIn) {
              e.preventDefault();
              router.push("/login");
            }
          },
        }}
      />
    </Tabs>
  );
}
