import React from 'react';
import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import { COLORS, icons, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { Image } from 'expo-image';
import { SupportBadgeProvider, useSupportBadge } from '@/contexts/supportBadgeContext';
import { TabBadgeProvider, useTabBadge } from '@/contexts/tabBadgeContext';

const SuperAdminTabs = () => {
  const { dark } = useTheme();
  const { totalUnread } = useSupportBadge();
  const { orders, withdrawals, requests, returnRequests } = useTabBadge();
  const badgeStyle = {
    backgroundColor: COLORS.red,
    color: COLORS.white,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS !== 'ios',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 80 : 60,
          backgroundColor: dark ? COLORS.dark1 : COLORS.white,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: dark ? COLORS.gray3 : COLORS.gray3,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarBadge: orders > 0 ? orders : undefined,
          tabBarBadgeStyle: badgeStyle,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 12, width: SIZES.width / 5 }}>
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
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="withdrawalrequest"
        options={{
          title: 'Withdrawal Request',
          tabBarBadge: withdrawals > 0 ? withdrawals : undefined,
          tabBarBadgeStyle: badgeStyle,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 12, width: SIZES.width / 5 }}>
              <Image
                source={focused ? icons.wallet2 : icons.wallet2Outline}
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
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="queries"
        options={{
          title: 'Queries',
          tabBarBadge: totalUnread || undefined,
          tabBarBadgeStyle: badgeStyle,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 12, width: SIZES.width / 5 }}>
              <Image
                source={focused ? icons.chatBubble2 : icons.chatBubble2Outline}
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
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
          tabBarBadge: requests > 0 ? requests : undefined,
          tabBarBadgeStyle: badgeStyle,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View
              style={{
                alignItems: 'center',
                paddingTop: 12,
                paddingBottom: 12,
                width: SIZES.width / 5,
              }}
            >
              <Image
                source={focused ? icons.document2 : icons.document2Outline}
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
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="returns"
        options={{
          title: 'Returns Request',
          tabBarBadge: returnRequests > 0 ? returnRequests : undefined,
          tabBarBadgeStyle: badgeStyle,
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View
              style={{
                alignItems: 'center',
                paddingTop: 12,
                paddingBottom: 12,
                width: SIZES.width / 5,
              }}
            >
              <Image
                source={focused ? icons.boxOpen1 : icons.box2}
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
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="logout"
        options={{
          title: 'Logout',
          tabBarIcon: ({ focused }: { focused: boolean }) => (
            <View
              style={{
                alignItems: 'center',
                paddingTop: 12,
                paddingBottom: 12,
                width: SIZES.width / 5,
              }}
            >
              <Image
                source={icons.logout}
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
            </View>
          ),
        }}
      />
    </Tabs>
  )
}

export default function SuperAdminLayout() {
  return (
    <SupportBadgeProvider>
      <TabBadgeProvider>
        <SuperAdminTabs />
      </TabBadgeProvider>
    </SupportBadgeProvider>
  )
}
