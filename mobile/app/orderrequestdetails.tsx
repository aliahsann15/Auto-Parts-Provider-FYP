import React from 'react';
import { SafeAreaView, View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { COLORS, FONTS, icons, SIZES } from '@/constants';
import HeaderWithSearch from '@/components/HeaderWithSearch';
import { OrderRequest, Request } from '@/data/sellerDashboardData';
import { router } from 'expo-router';
import Header from '@/components/Header';

// navigation/types.ts (recommended for large apps)
type RootStackParamList = {
    OrderRequestDetails: { requestId: string };
    makeoffer: undefined; // Clearly add this line
 // if needed later
    chatbox: undefined; // Add this line to define the chatbox route
    // Add more screens as needed
  };

const OrderRequestDetailsScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'OrderRequestDetails'>>();
  const navigation = useNavigation();
  const { dark } = useTheme();

  const { requestId } = route.params;

  const request: Request | undefined = OrderRequest.find(req => req.id === requestId);

  if (!request) {
    return (
      <View style={styles.notFound}>
        <Text style={{ color: COLORS.black }}>Request not found!</Text>
      </View>
    );
  }
   //Render header

    const renderHeader = () => {
      return (
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}>
              <Image
                source={icons.back}
                resizeMode='contain'
                style={[styles.backIcon, {
                  tintColor: dark ? COLORS.white : COLORS.greyscale900
                }]}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {
              color: dark ? COLORS.white : COLORS.greyscale900
            }]}>
              Order Requests
            </Text>
          </View>
         
        </View>
      )
    }
  

  return (
    <SafeAreaView style={styles.area}>
      <View style={styles.container}>
      {renderHeader()}

        <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.label, { marginTop: 20, color: dark ? COLORS.white : COLORS.black }]}>
            Part Images
          </Text>
          <View style={styles.imageContainer}>
            {request.images.length > 0 ? (
              request.images.map((img, i) => (
                <Image
                  key={i}
                  source={img.uri ? { uri: img.uri } : img.source}
                  style={styles.image}
                  resizeMode="cover"
                />
              ))
            ) : (
              <Text style={{ color: COLORS.gray }}>No images uploaded.</Text>
            )}
          </View>
          {[
            { label: 'Request ID', value: request.id },
            { label: 'Customer Name', value: request.customerName },
            { label: 'Company Name', value: request.companyName },
            { label: 'Car Model', value: request.carModel },
            { label: 'Car Variant', value: request.carVariant },
            { label: 'Year', value: request.year },
            { label: 'Part Name', value: request.partName },
            { label: 'Quantity', value: request.quantity.toString() },
            { label: 'Date', value: request.date },
            { label: 'Status', value: request.status },
            { label: 'Description', value: request.description || 'N/A' },
          ].map(({ label, value }) => (
            <View key={label} style={styles.field}>
              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black }]}>
                {label}
              </Text>
              <Text style={[styles.value, { color: COLORS.black }]}>
                {value}
              </Text>
            </View>
          ))}

         
        </ScrollView>
         {/* Actions */}
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => router.push('/makeoffer')}
 style={[styles.cancelBtn, {
                      borderColor: dark ? COLORS.white : COLORS.primary
                    }]}>
                      <Text style={[styles.cancelBtnText, {
                        color: dark ? COLORS.white : COLORS.primary,
                      }]}>Make an Offer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity  style={styles.saveBtn} onPress={() => router.push('/chatbox')}>
                      <Text style={[styles.saveBtnText, { color: COLORS.white }]}>Chat with Customer</Text>
                    </TouchableOpacity>
                  </View>
      </View>
    </SafeAreaView>
  );
};

export default OrderRequestDetailsScreen;

// Keep existing styles unchanged
const styles = StyleSheet.create({
  area: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, padding: 16 },
  headerContainer: {
    flexDirection: "row",
    width: SIZES.width - 32,
    justifyContent: "space-between",
    paddingBottom: 32
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    color: COLORS.black,
    marginLeft: 16
  },
  scroll: { paddingBottom: 10 },
  field: { marginBottom: 12 },
  label: { ...FONTS.body4, fontFamily: 'semiBold', marginBottom: 4 },
  value: { ...FONTS.body4, fontFamily: 'regular', padding: 12, backgroundColor: COLORS.greyscale500, borderRadius: 8 },
  imageContainer: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 12 },
  image: { width: 90, height: 90, borderRadius: 10, marginRight: 10, marginBottom: 10 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 24,
    marginBottom: -16

  },
  cancelBtn: {
    width: '50%',
    height: 58,
    borderRadius: 32,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",

    borderColor: COLORS.primary,
    borderWidth: 1.4,
  },

  cancelBtnText: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.primary,

  },
  saveBtn: {
    width: '50%',
    height: 58,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",

    borderColor: COLORS.primary,
    borderWidth: 1.4,

  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.white,
  },
});
