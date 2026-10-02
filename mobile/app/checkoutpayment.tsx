import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, SIZES } from '@/constants';
import Header from '@/components/Header';
import Input from '@/components/Input';
import ButtonFilled from '@/components/ButtonFilled';
import { useAuth } from '@/app/context/AuthContext';
import { createOrder } from '@/utils/api/orders';
import { createPaymentIntent } from '@/utils/api/payments';
import { useStripe } from '@stripe/stripe-react-native';

type PaymentOption = 'cod' | 'online';

const CheckoutPaymentScreen = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation();
  const { token, user, updateUserProfile } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const params = useLocalSearchParams<{
    address?: string;
    shippingFee?: string;
    inspectionFee?: string;
    promoDiscount?: string;
    total?: string;
    shippingMethod?: string;
    arrivalText?: string;
  }>();

  const addressObj = useMemo(() => {
    try {
      return params.address ? JSON.parse(params.address as string) : {};
    } catch {
      return {};
    }
  }, [params.address]);

  const fullName = addressObj.name || user?.name || '';
  const nameParts = fullName.trim().split(' ').filter(Boolean);
  const defaultFirstName = addressObj.firstName || nameParts[0] || '';
  const defaultLastName =
    addressObj.lastName || user?.lastName || nameParts.slice(1).join(' ') || '';
  const defaultEmail = addressObj.email || user?.email || '';
  const defaultPhoneNumber = addressObj.phoneNumber || user?.phoneNumber || '';

  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [email, setEmail] = useState(defaultEmail);
  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('cod');
  const [loading, setLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const shippingFee = Number(params.shippingFee || 0);
  const inspectionFee = Number(params.inspectionFee || 0);
  const promoDiscount = Number(params.promoDiscount || 0);
  const total = Number(params.total || 0);
  const shippingMethod = params.shippingMethod as string | undefined;
  const arrivalText = params.arrivalText as string | undefined;
  const STRIPE_API_VERSION = '2024-06-20';
  const [paymentIntentId, setPaymentIntentId] = useState<string | undefined>(undefined);

  const buildShippingAddress = () => ({
    street: addressObj.street || addressObj.fullAddress || 'N/A',
    city: addressObj.city || 'N/A',
    state: addressObj.state || addressObj.province || '',
    country: addressObj.country || 'Pakistan',
    zipCode: addressObj.zipCode || addressObj.postalCode || '00000',
    email: addressObj.email,
    phoneNumber: addressObj.phoneNumber,
  });

  const handlePlaceOrder = async () => {
    if (!token) {
      Alert.alert('Login required', 'Please sign in to place an order.');
      return;
    }
    const digitsOnlyPhone = phoneNumber.replace(/\D/g, '');
    const normalizedLastName = lastName.trim();
    if (!firstName || !normalizedLastName || !email || !digitsOnlyPhone) {
      Alert.alert('Missing info', 'Please fill in your contact details.');
      return;
    }
    if (digitsOnlyPhone.length !== 11) {
      setPhoneError('Please enter an 11-digit phone number.');
      Alert.alert('Invalid phone', 'Phone number must be 11 digits.');
      return;
    }
    setPhoneError(null);

    try {
      setLoading(true);
      setPayError(null);
      if (paymentOption === 'online') {
        const intent = await createPaymentIntent(token, {
          amountPkr: total,
          currency: 'usd',
          metadata: { source: 'mobile_checkout' }
        });
        if (!intent?.clientSecret || !intent?.paymentIntentId) {
          throw new Error('Payment initialization failed');
        }
        const initSheet = await initPaymentSheet({
          merchantDisplayName: 'Auto Parts Providers',
          paymentIntentClientSecret: intent.clientSecret,
        });
        if (initSheet.error) {
          throw new Error(initSheet.error.message);
        }
        const presentSheet = await presentPaymentSheet();
        if (presentSheet.error) {
          throw new Error(presentSheet.error.message);
        }
        setPaymentIntentId(intent.paymentIntentId);
      }

      await createOrder(token, {
        shippingAddress: buildShippingAddress(),
        paymentMethod: paymentOption === 'cod' ? 'Cash on Delivery' : 'Online',
        paymentStatus: paymentOption === 'online' ? 'completed' : 'pending',
        stripePaymentIntentId: paymentIntentId,
        shippingFee,
        shippingMethod,
        arrivalText,
        inspectionFee,
        promoDiscount,
        autoPartsInspection: inspectionFee > 0,
        customer: {
          firstName,
          lastName: normalizedLastName,
          email,
          phoneNumber,
        },
      });
      if (user && normalizedLastName) {
        await updateUserProfile({ ...user, lastName: normalizedLastName });
      }
      Alert.alert('Order placed', paymentOption === 'cod' ? 'Your order has been placed with Cash on Delivery.' : 'Payment successful and order placed.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: any) {
      setPayError(err?.message || 'Could not place order.');
      Alert.alert('Payment failed', err?.message || 'Could not place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Payment" />
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Contact details</Text>
          <View style={styles.row}>
            <View style={[styles.half, { marginRight: 8 }]}>
              <Input
                id="firstName"
                onInputChanged={(_, v) => setFirstName(v)}
                value={firstName}
                placeholder="First name"
                placeholderTextColor={COLORS.greyscale600}
              />
            </View>
            <View style={[styles.half, { marginLeft: 8 }]}>
              <Input
                id="lastName"
                onInputChanged={(_, v) => setLastName(v)}
                value={lastName}
                placeholder="Last name"
                placeholderTextColor={COLORS.greyscale600}
              />
            </View>
          </View>
          <Input
            id="email"
            onInputChanged={(_, v) => setEmail(v)}
            value={email}
            placeholder="Email"
            placeholderTextColor={COLORS.greyscale600}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            id="phone"
            onInputChanged={(_, v) => {
              const digits = v.replace(/\D/g, '').slice(0, 11);
              setPhoneNumber(digits);
              if (phoneTouched) {
                setPhoneError(digits.length === 11 ? null : 'Phone number must be 11 digits.');
              }
            }}
            value={phoneNumber}
            placeholder="Phone number"
            placeholderTextColor={COLORS.greyscale600}
            keyboardType="number-pad"
            maxLength={11}
            onBlur={() => {
              setPhoneTouched(true);
              const digits = phoneNumber.replace(/\D/g, '');
              setPhoneError(digits.length === 11 ? null : 'Phone number must be 11 digits.');
            }}
          />
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

          <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.greyscale900, marginTop: 20 }]}>Payment method</Text>
          {(['cod', 'online'] as PaymentOption[]).map(opt => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.payOption,
                {
                  borderColor: paymentOption === opt ? COLORS.primary : (dark ? COLORS.grayscale400 : COLORS.greyscale300),
                  backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                },
              ]}
              onPress={() => setPaymentOption(opt)}
            >
              <Text style={[styles.payLabel, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                {opt === 'cod' ? 'Cash on Delivery' : 'Pay online'}
              </Text>
              <View style={[styles.radioOuter, { borderColor: paymentOption === opt ? COLORS.primary : COLORS.greyscale500 }]}>
                {paymentOption === opt && <View style={[styles.radioInner, { backgroundColor: COLORS.primary }]} />}
              </View>
            </TouchableOpacity>
          ))}

          <View style={[styles.summaryCard, { backgroundColor: dark ? COLORS.dark1 : COLORS.white, borderColor: dark ? COLORS.grayscale400 : COLORS.grayscale200 }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Shipping</Text>
              <Text style={[styles.summaryValue, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>PKR {shippingFee.toFixed(2)}</Text>
            </View>
            {inspectionFee > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Inspection</Text>
                <Text style={[styles.summaryValue, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>PKR {inspectionFee.toFixed(2)}</Text>
              </View>
            )}
            {promoDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Promo</Text>
                <Text style={[styles.summaryValue, { color: COLORS.primary }]}>- PKR {promoDiscount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Total</Text>
              <Text style={[styles.totalValue, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>PKR {total.toFixed(2)}</Text>
            </View>
          </View>

          <ButtonFilled
            title={loading ? 'Placing order...' : 'Place Order'}
            onPress={handlePlaceOrder}
            disabled={loading}
            style={{ marginTop: 16, backgroundColor: COLORS.black, borderColor: COLORS.black }}
            textColor={COLORS.white}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  sectionTitle: { fontFamily: 'bold', fontSize: 16, marginBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 8 },
  half: { flex: 1 },
  payOption: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  payLabel: { fontFamily: 'semiBold', fontSize: 15 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  summaryLabel: { fontFamily: 'medium', fontSize: 14 },
  summaryValue: { fontFamily: 'semiBold', fontSize: 14 },
  totalValue: { fontFamily: 'bold', fontSize: 16 },
  divider: { height: 1, backgroundColor: COLORS.greyscale300, marginVertical: 6 },
  errorText: {
    fontSize: 12,
    fontFamily: 'regular',
    color: COLORS.red,
    marginTop: 4,
    marginBottom: 8,
  },
});

export default CheckoutPaymentScreen;
