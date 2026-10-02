import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { COLORS, FONTS, icons, SIZES } from '@/constants';
import { recentOrders, RecentOrder } from '@/data/sellerDashboardData';
import { router, useNavigation } from 'expo-router';
import { OrderItem, fetchOrder } from '@/utils/api/orders';
import { useSellerContact } from '@/hooks/useSellerContact';
import { getPrimarySellerIdFromItems } from '@/utils/seller';
import { useAuth } from './context/AuthContext';

const getOrderItemDisplayName = (item: any) => {
  const snapshot = item.productSnapshot || {};
  const product = item.product || {};
  const make = snapshot.make || product.make;
  const model = snapshot.carModel || product.carModel || snapshot.carName || product.carName;
  const variant = snapshot.variant || product.variant;
  const year = snapshot.year || product.year;
  const partName =
    snapshot.partName ||
    snapshot.productName ||
    product.partName ||
    product.productName ||
    snapshot.name ||
    product.name;
  const detailSegments = [make, model, variant, year, partName].filter(Boolean);
  return detailSegments.join(' ').trim() || 'Product';
};

type RootStackParamList = {
  SellerOrderDetails: { requestId?: string; orderId?: string; order?: string };
};


const AutoPartsProviderContact = {
  name: 'Auto Parts Providers',
  email: 'info@autopartsprovider.com',
  phoneNumber: '03039245137',
  address: 'Office 9,10 Commercial Market, Eden Executive, 204 Chak Road , Canal Road Faisalabad',
  country: 'Pakistan',
  city: 'Faisalabad',
  postalCode: '38000',
};


const SellerOrderDetailsScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'SellerOrderDetails'>>();
  const { dark } = useTheme();
  const { order: orderParam, orderId, requestId } = route.params || {};
  const navigation = useNavigation<NavigationProp<any>>();
  const { token, user } = useAuth();

  const parsedOrder: OrderItem | null = useMemo(() => {
    if (orderParam) {
      try {
        return JSON.parse(orderParam);
      } catch { }
    }
    const fallback = recentOrders.find(o => o.id === requestId) as any;
    return fallback || null;
  }, [orderParam, requestId]);

  const [order, setOrder] = useState<OrderItem | null>(parsedOrder);
  const [loading, setLoading] = useState(false);
  const sellerId = getPrimarySellerIdFromItems(order?.items);
  const sellerContact = useSellerContact(sellerId, token || undefined);

  useEffect(() => {
    const load = async () => {
      if (!token || !orderId) return;
      setLoading(true);
      try {
        const res = await fetchOrder(token, orderId);
        setOrder(res);
      } catch (err: any) {
        Alert.alert('Order', err?.message || 'Could not load order');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId, token]);

  const isCompleted = (status?: string) => {
    const val = (status || '').toLowerCase();
    return val === 'delivered' || val === 'completed';
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => router.back()}>
          <Image
            source={icons.back}
            resizeMode="contain"
            style={[styles.backIcon, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
          Order Details
        </Text>
      </View>
    </View>
  );

  if (loading && !order) {
    return (
      <SafeAreaView style={styles.area}>
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <View style={styles.notFound}>
        <Text style={{ color: COLORS.black }}>Order not found!</Text>
      </View>
    );
  }

  const items = order.items || [];
  const itemsSubtotal = items.reduce((sum, item) => {
    const unit = Number(item.salePrice ?? item.price ?? 0);
    const quantity = Number(item.quantity ?? 1);
    return sum + unit * quantity;
  }, 0);
  const shippingFee = Number(order.shippingFee ?? 0);
  const inspectionFee = Number(order.inspectionFee ?? 0);
  const displayTotal = order.totalAmount ?? itemsSubtotal + shippingFee + inspectionFee;
  const created = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '';
  const address = order.shippingAddress?.street || order.shippingAddress?.city || order.shippingAddress?.country || '';
  const showAutoPartsCustomer = Boolean(order.autoPartsInspection);
  const customerDisplay = showAutoPartsCustomer
    ? AutoPartsProviderContact
    : {
        name: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || order.customer?.name || 'N/A',
        email: order.customer?.email || 'N/A',
        phoneNumber: order.customer?.phoneNumber || 'N/A',
        address: address || 'N/A',
      };
  const shippingDisplay = showAutoPartsCustomer
    ? AutoPartsProviderContact
    : {
        country: order.shippingAddress?.country || 'N/A',
        city: order.shippingAddress?.city || 'N/A',
        postalCode: order.shippingAddress?.zipCode || 'N/A',
        address: address || 'N/A',
      };
  const isSuperAdmin = (user?.role || '').toLowerCase() === 'superadmin';

  return (
    <SafeAreaView style={styles.area}>
      <View style={styles.container}>
        {renderHeader()}
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.field}>
            <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black }]}>Order Number</Text>
            <Text style={[styles.value, { color: COLORS.black }]}>
              {order.orderNumber || order._id || order.id || '—'}
            </Text>
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black }]}>Order Date</Text>
            <Text style={[styles.value, { color: COLORS.black }]}>{created || '—'}</Text>
          </View>
         

          <View style={styles.field}>
            <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black }]}>Order Status</Text>
            <Text style={[styles.value, { color: COLORS.black, textTransform: 'capitalize' }]}>{order.status || 'pending'}</Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black }]}>Order Amount</Text>
            <Text style={[styles.value, { color: COLORS.black }]}>PKR {displayTotal}</Text>
          </View>
          <Text style={[styles.label, { marginTop: 10, marginBottom: 10, color: dark ? COLORS.white : COLORS.black }]}>Ordered Items</Text>
          <View style={[styles.value, { padding: 0, marginBottom: 20 }]}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeader, { flex: 1 }]}>Product</Text>
              <Text style={[styles.tableHeader, { flex: 1 }]}>Qty</Text>
              <Text style={[styles.tableHeader, { flex: 1 }]}>Price</Text>
              <Text style={[styles.tableHeader, { flex: 1 }]}>Total</Text>
            </View>
            {items.map((item, index) => {
              const displayName = getOrderItemDisplayName(item);
              const unitPrice = item.salePrice || item.price || 0;
              const qty = item.quantity || 1;
              return (
                <View key={index} style={styles.tableRow}>
                  <Text style={{ flex: 1, fontFamily: 'regular' }}>{displayName}</Text>
                  <Text style={{ flex: 1, fontFamily: 'regular', textAlign: 'left' }}>{qty}</Text>
                  <Text style={{ flex: 1, fontFamily: 'regular' }}>PKR {unitPrice}</Text>
                  <Text style={{ flex: 1, fontFamily: 'regular' }}>PKR {unitPrice * qty}</Text>
                </View>
              );
            })}
          </View>

          {isSuperAdmin && (
            <View style={[styles.summarySection, { borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: dark ? COLORS.white : COLORS.black }]}>Subtotal</Text>
                <Text style={[styles.summaryValue, { color: dark ? COLORS.white : COLORS.black }]}>PKR {itemsSubtotal.toFixed(0)}</Text>
              </View>
              {shippingFee > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: dark ? COLORS.white : COLORS.black }]}>Shipping Fee</Text>
                  <Text style={[styles.summaryValue, { color: dark ? COLORS.white : COLORS.black }]}>PKR {shippingFee.toFixed(0)}</Text>
                </View>
              )}
              {inspectionFee > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: dark ? COLORS.white : COLORS.black }]}>Auto Inspection Fee</Text>
                  <Text style={[styles.summaryValue, { color: dark ? COLORS.white : COLORS.black }]}>PKR {inspectionFee.toFixed(0)}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: dark ? COLORS.white : COLORS.black }]}>Total</Text>
                <Text style={[styles.summaryValue, { color: dark ? COLORS.white : COLORS.black }]}>PKR {displayTotal.toFixed(0)}</Text>
              </View>
            </View>
          )}

          {isSuperAdmin && sellerContact && (
            <View style={styles.sectionGroup}>
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: 16,
                    marginTop: 16,
                    marginBottom:16,
                    color: dark ? COLORS.white : COLORS.black,
                  },
                ]}
              >
                Store Info
              </Text>
              {[
                { label: 'Store Name', value: sellerContact.storeName },
                { label: 'Store Gmail', value: sellerContact.email },
                { label: 'Store Phone', value: sellerContact.phone },
                { label: 'Store Address', value: sellerContact.address },
              ].map(({ label, value }) => (
                <View key={`seller-${label}`} style={styles.field}>
                  <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black }]}>{label}</Text>
                  <Text style={[styles.value, { color: COLORS.black }]}>{value}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.sectionGroup}>
            <Text
              style={[
                styles.label,
                {
                  fontSize: 16,
                  marginTop: 16,
                  marginBottom: 16,
                  color: dark ? COLORS.white : COLORS.black,
                },
              ]}
            >
              Customer Details
            </Text>
            {[
              { label: 'Customer Name', value: customerDisplay.name },
              { label: 'Email', value: customerDisplay.email },
              { label: 'Contact', value: customerDisplay.phoneNumber },
              { label: 'Country', value: shippingDisplay.country },
              { label: 'City', value: shippingDisplay.city },
              { label: 'Postalcode', value: shippingDisplay.postalCode },
              { label: 'Shipping Address', value: shippingDisplay.address },
            ].map(({ label, value }) => (
              <View key={label} style={styles.field}>
                <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black }]}>{label}</Text>
                <Text style={[styles.value, { color: COLORS.black }]}>{value}</Text>
              </View>
            ))}
          </View>

         
        </ScrollView>

        <View style={styles.actions}>
       
          <TouchableOpacity style={styles.saveBtn}
           onPress={() => {
            if (!isCompleted(order.status)) {
              Alert.alert('Complete order', 'Please complete the order to see the receipt.');
              return;
            }
            navigation.navigate("productereceipt", {
              data: JSON.stringify({ raw: order }),
            })
        }}>
            <Text style={[styles.saveBtnText, { color: COLORS.white }]}>View E-Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SellerOrderDetailsScreen;

const styles = StyleSheet.create({
  area: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, padding: 16 },
  headerContainer: {
    flexDirection: 'row',
    width: SIZES.width - 32,
    justifyContent: 'space-between',
    paddingBottom: 32,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    color: COLORS.black,
    marginLeft: 16,
  },
  scroll: { paddingBottom: 10 },
  field: { marginBottom: 12 },
  label: { ...FONTS.body4, fontFamily: 'semiBold', marginBottom: 4 },
  value: {
    ...FONTS.body4,
    fontFamily: 'regular',
    padding: 12,
    backgroundColor: COLORS.greyscale500,
    borderRadius: 8,
  },
  sectionGroup: {
    marginBottom: 16,
  },
  dropdownWrapper: {
    borderRadius: 8,
    backgroundColor: COLORS.greyscale500,
    paddingHorizontal: 6,
    paddingVertical: 2,

  },
  pickerInput: {
    fontSize: 14,
    fontFamily: 'regular',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    color: COLORS.primary,
 
 
   
  },
  tableHeaderRow: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.gray,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8
  },
  tableHeader: {
    ...FONTS.body4,
    fontFamily: 'bold',
    color: COLORS.white,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderColor: COLORS.gray,
  },
  summarySection: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'semiBold',
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  paddingTop: 16,
  marginBottom: -16
  },
  cancelBtn: {
    width: '50%',
    height: 58,
    borderRadius: 32,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: COLORS.primary,
    borderWidth: 1.4,
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: 'bold',
    color: COLORS.primary,
  },
  saveBtn: {
    width: '100%',
    height: 58,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: COLORS.primary,
    borderWidth: 1.4,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'bold',
    color: COLORS.white,
  },
});
