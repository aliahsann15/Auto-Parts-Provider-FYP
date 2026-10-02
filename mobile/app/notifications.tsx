import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, Alert, DeviceEventEmitter } from 'react-native';
import React, { useEffect } from 'react';
import { COLORS, icons } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-virtualized-view';
import { useTheme } from '../theme/ThemeProvider';
import NotificationCard from '@/components/NotificationCard';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { fetchNotifications, markAllNotificationsRead, NotificationItem } from '@/utils/api/notifications';
import { notifications as fallbackNotifications } from '../data';
import { engagePartsRequest, fetchRequestById } from '@/utils/api/partsRequests';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { fetchOrder } from '@/utils/api/orders';
import { fetchReturn } from '@/utils/api/returns';
import { fetchWarrantyClaim } from '@/utils/api/warranty';

type NotificationLinkKind = 'order' | 'request' | 'return' | 'withdrawal' | 'route' | 'warranty';
type NotificationLink = {
    route: string;
    kind?: NotificationLinkKind;
    id?: string;
};

const Notifications = () => {
    const { colors, dark } = useTheme();
    const navigation = useNavigation<NavigationProp<any>>();
    const { token, isLoggedIn, user } = useAuth();
    const {
      expoPushToken,
      isRegistering,
      isSendingTest,
      registerAsync,
      triggerTestNotification
    } = usePushNotifications({ authToken: token, autoRegister: false });
    const [items, setItems] = React.useState<NotificationItem[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isClearing, setIsClearing] = React.useState(false);
    const router = useRouter();
    const [disabledNotifications, setDisabledNotifications] = React.useState<Record<string, boolean>>({});

    const disableNotification = (key: string) => {
        if (!key) return;
        setDisabledNotifications(prev => ({ ...prev, [key]: true }));
    };

    const resolveNotificationLink = React.useCallback(
        (item: NotificationItem): NotificationLink | null => {
            const metadata = (item as any).metadata || (item as any).meta || {};
            const ensureRoute = (value?: string) => {
                if (!value) return null;
                return value.startsWith('/') ? value : `/${value}`;
            };
            const lowerRole = (user?.role || '').toLowerCase();
            const isSeller = lowerRole === 'seller' || lowerRole === 'storemanager';
            if (metadata.route) {
                const route = ensureRoute(metadata.route);
                if (!route) return null;
            let kind: NotificationLinkKind | undefined;
            if (route.includes('warrantyclaims') || metadata.type === 'warranty') {
              kind = 'warranty';
            } else if (metadata.returnId) kind = 'return';
            else if (metadata.requestId) kind = 'request';
            else if (metadata.orderId) kind = 'order';
            else if (metadata.type === 'return-deduction') kind = 'withdrawal';
            else kind = 'route';
            return {
              route,
              kind,
              id:
                kind === 'warranty'
                  ? metadata.claimId || metadata.route?.split('/').pop()
                  : metadata.returnId || metadata.requestId || metadata.orderId,
            };
          }
          if (metadata.returnId) {
            const route = isSeller ? `/sellerreturns/${metadata.returnId}` : `/returns/${metadata.returnId}`;
            return { route, kind: 'return', id: metadata.returnId };
          }
          if (metadata.type === 'warranty' && metadata.claimId) {
            const route = isSeller
              ? `/warrantyclaims/seller/${metadata.claimId}`
              : `/warrantyclaims/${metadata.claimId}`;
            return { route, kind: 'warranty', id: metadata.claimId };
          }
          if (!metadata.route && metadata.claimId) {
            const route = isSeller
              ? `/warrantyclaims/seller/${metadata.claimId}`
              : `/warrantyclaims/${metadata.claimId}`;
            return { route, kind: 'warranty', id: metadata.claimId };
          }
            if (metadata.requestId) {
                const baseRoute = isSeller ? '/seller/orderrequest' : '/requestdetails';
                const route = `${baseRoute}?requestId=${metadata.requestId}`;
                return { route, kind: 'request', id: metadata.requestId };
            }
            if (metadata.orderId) {
                const orderRoute = isSeller
                    ? `/sellerorderdetails?orderId=${metadata.orderId}`
                    : `/orders?orderId=${metadata.orderId}`;
                return { route: orderRoute, kind: 'order', id: metadata.orderId };
            }
            if ((item as any).type === 'order') {
                const fallbackRoute = isSeller ? '/sellerorderdetails' : '/orders';
                return { route: fallbackRoute, kind: 'order' };
            }
            if (metadata?.type === 'return-deduction') {
                return { route: '/withdrawalhistory', kind: 'withdrawal' };
            }
            return null;
        },
        [user?.role]
    );

    const validateNotificationLink = React.useCallback(
        async (link: NotificationLink | null) => {
            if (!link) return false;
            if (!token) return true;
            try {
        if (link.kind === 'order' && link.id) {
            await fetchOrder(token, link.id);
        } else if (link.kind === 'return' && link.id) {
            await fetchReturn(link.id, token);
        } else if (link.kind === 'request' && link.id) {
            await fetchRequestById(link.id, token);
        } else if (link.kind === 'warranty' && link.id) {
            await fetchWarrantyClaim(token, link.id);
        }
                return true;
            } catch {
                return false;
            }
        },
        [token]
    );

    const handleNotificationNavigation = React.useCallback(
        async (item: NotificationItem) => {
            const key = (item as any).id || (item as any)._id || '';
            if (!key || disabledNotifications[key]) return;
            const link = resolveNotificationLink(item);
            if (!link) return;
            const isValid = await validateNotificationLink(link);
            if (!isValid) {
                disableNotification(key);
                Alert.alert('Unavailable', 'The data linked to this notification is no longer available.');
                return;
            }
            router.push(link.route);
        },
        [disabledNotifications, resolveNotificationLink, validateNotificationLink, router]
    );

    const iconForType = (type?: string) => {
        switch (type) {
            case 'order': return icons.box;
            case 'promo': return icons.discount;
            case 'message': return icons.chat;
            case 'request': return icons.analytics;
            default: return icons.bell3;
        }
    };

    const load = React.useCallback(async () => {
        if (!token) {
            setItems([]);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetchNotifications(token);
            const data = (res.items || (res as any).data || [])
              .filter((n: any) => !n.isRead) // only unread
              .map((n: NotificationItem, idx: number) => {
                const type = (n as any).type || n.iconType;
                return {
                  ...n,
                  id: n._id || n.id || String(idx + 1),
                  resolvedIcon: iconForType(type),
                    date: (n as any).date || n.createdAt || new Date().toISOString(),
                    type,
                };
            }) as any[];
            setItems(data);
            const unread = data.filter((n: any) => !(n as any).isRead).length;
            DeviceEventEmitter.emit('notifications:updated', { unreadCount: unread, source: 'notifications-screen' });
        } catch (err) {
            // fallback to demo data if endpoint missing
            setItems(fallbackNotifications);
            DeviceEventEmitter.emit('notifications:updated', { unreadCount: fallbackNotifications.length, source: 'notifications-screen' });
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    React.useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
      const notifSub = DeviceEventEmitter.addListener('notifications:updated', (payload: any) => {
        if (payload?.source === 'notifications-screen') return;
        load();
      });
      const interval = setInterval(() => {
        load();
      }, 10000);
      return () => {
        notifSub.remove();
        clearInterval(interval);
      };
    }, [load]);

    const handleClearAll = async () => {
        if (!isLoggedIn || !token) {
            Alert.alert('Login required', 'Please sign in to manage notifications.');
            return;
        }
        Alert.alert(
          'Mark all as read?',
          'This will mark all notifications as read. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Yes, mark all',
              style: 'destructive',
              onPress: async () => {
                try {
                    setIsClearing(true);
                    await markAllNotificationsRead(token);
                    setItems([]);
                    DeviceEventEmitter.emit('notifications:updated', { unreadCount: 0 });
                } catch (err: any) {
                    Alert.alert('Failed', err?.message || 'Could not clear notifications.');
                } finally {
                    setIsClearing(false);
                }
              }
            }
          ]
        );
    };

    const handleSendTest = async () => {
        if (!isLoggedIn || !token) {
            Alert.alert('Login required', 'Sign in to send a test push notification.');
            return;
        }
        try {
            // Ensure we have a token on file
            if (!expoPushToken) {
                await registerAsync();
            }
            const res = await triggerTestNotification({
                title: 'Hello from Auto Parts Providers',
                body: 'If you see this, push notifications are wired up!'
            });
            const tokenCount = (res as any)?.tokenCount;
            const sent = Array.isArray((res as any)?.sent) ? (res as any)?.sent : [];
            const skipped = Array.isArray((res as any)?.skipped) ? (res as any)?.skipped : [];
            const sentTokens = sent.map((s: any) => s.token).filter(Boolean);
            Alert.alert(
              'Sent',
              tokenCount
                ? `Test push requested to ${tokenCount} device(s).\nSent: ${sentTokens.join(', ') || '—'}\nSkipped: ${skipped.join(', ') || '—'}`
                : 'Test notification sent. Check your device.'
            );
        } catch (err: any) {
            Alert.alert('Failed', err?.message || 'Could not send a test notification.');
        }
    };
    /**
     * Render header
     */
    const renderHeader = () => {
        return (
            <View style={styles.headerContainer}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.headerIconContainer, {
                        borderColor: dark ? COLORS.dark3 : COLORS.grayscale200
                    }]}>
                    <Image
                        source={icons.back}
                        resizeMode='contain'
                        style={[styles.arrowBackIcon, {
                            tintColor: dark ? COLORS.white : COLORS.greyscale900
                        }]}
                    />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, {
                    color: dark ? COLORS.white : COLORS.greyscale900
                }]}>Notifications</Text>
                <Text>{"  "}</Text>
            </View>
        )
    }

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {renderHeader()}
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.headerNoti}>
                        <View style={styles.headerNotiLeft}>
                            <Text style={[styles.notiTitle, {
                                color: dark ? COLORS.white : COLORS.greyscale900
                            }]}>Recent</Text>
                            <View style={styles.headerNotiView}>
                                <Text style={styles.headerNotiTitle}>{items.length}</Text>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {/* <TouchableOpacity
                                onPress={handleSendTest}
                                disabled={isSendingTest || isRegistering}
                                style={[
                                    styles.testButton,
                                    { backgroundColor: dark ? COLORS.dark3 : COLORS.primary },
                                    (isSendingTest || isRegistering) && { opacity: 0.65 }
                                ]}
                            >
                                <Text style={[styles.testButtonText, { color: COLORS.white }]}>
                                    {isSendingTest ? 'Sending...' : isRegistering ? 'Registering...' : 'Send test'}
                                </Text>
                            </TouchableOpacity> */}
                            <TouchableOpacity
                                onPress={handleClearAll}
                                disabled={isClearing}
                                style={[
                                    styles.markReadButton,
                                    { backgroundColor: dark ? COLORS.dark3 : COLORS.primary },
                                    isClearing && { opacity: 0.6 }
                                ]}
                            >
                                <Text style={[styles.markReadText, { color: COLORS.white }]}>
                                    {isClearing ? 'Marking...' : 'Mark all as read'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    {items.length === 0 && !isLoading ? (
                        <Text style={[styles.emptyText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                            No new notifications
                        </Text>
                    ) : (
                        <FlatList
                            data={items}
                            keyExtractor={item => (item as any).id}
                            renderItem={({ item }) => {
                                const type = (item as any).type;
                                const reqId = (item as any)?.meta?.requestId || (item as any)?.metadata?.requestId;
                                const rawSkip = (item as any)?.meta?.skipAction ?? (item as any)?.metadata?.skipAction;
                                const skipActions =
                                  rawSkip === true || String(rawSkip || '').toLowerCase() === 'true';
                                const showActions = type === 'request' && reqId && !skipActions;
                                const notificationKey = (item as any).id || (item as any)._id || '';
                                const isDisabled = notificationKey ? !!disabledNotifications[notificationKey] : false;
                                return (
                                    <NotificationCard
                                        title={item.title}
                                        description={item.description}
                                        icon={(item as any).resolvedIcon || iconForType(type || (item as any).iconType)}
                                        date={(item as any).date || (item as any).createdAt || new Date().toISOString()}
                                        onPress={async () => {
                                            if (showActions && token) {
                                                try {
                                                    await engagePartsRequest(reqId, token);
                                                    Alert.alert('Added', 'Request added to your quotes.', [
                                                      { text: 'OK', onPress: () => router.replace('/seller/orderrequest') }
                                                    ]);
                                                    setItems(prev => prev.filter(n => ((n as any).metadata?.requestId || (n as any).meta?.requestId) !== reqId));
                                                } catch (err: any) {
                                                    Alert.alert('Error', err?.message || 'Could not mark interest.');
                                                }
                                                return;
                                            }
                                            await handleNotificationNavigation(item);
                                        }}
                                        footer={undefined}
                                        disabled={isDisabled}
                                    />
                                );
                            }}
                        />
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    )
};

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 16
    },
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: 'center'
    },
    headerIconContainer: {
        height: 46,
        width: 46,
        
        alignItems: "center",
        justifyContent: "center",
   
    },
    arrowBackIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.black
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: "bold",
        color: COLORS.black
    },
    headerNoti: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginVertical: 12
    },
    headerNotiLeft: {
        flexDirection: "row",
        alignItems: "center"
    },
    notiTitle: {
        fontSize: 16,
        fontFamily: "bold",
        color: COLORS.black
    },
    headerNotiView: {
        height: 16,
        width: 16,
        backgroundColor: COLORS.primary,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4
    },
    headerNotiTitle: {
        fontSize: 10,
        fontFamily: "bold",
        color: COLORS.white
    },
    markReadButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        marginLeft: 4
    },
    markReadText: {
        fontSize: 14,
        fontFamily: "medium"
    },
    emptyText: {
        fontSize: 14,
        fontFamily: "medium",
        paddingVertical: 12
    },
    testButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginRight: 8
    },
    testButtonText: {
        fontSize: 14,
        fontFamily: 'medium'
    }
})

export default Notifications
