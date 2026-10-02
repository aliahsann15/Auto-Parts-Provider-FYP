import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import React from 'react';
import { SIZES, COLORS } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { OrderCardItem } from '@/types/orders';

type Props = {
  orders: OrderCardItem[];
  emptyText?: string;
};

const CancelledOrders: React.FC<Props> = ({ orders, emptyText = 'No cancelled orders' }) => {
  const { dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const sortedOrders = React.useMemo(() => {
    return [...orders].sort((a, b) => {
      const getTimestamp = (order: OrderCardItem) => {
        const raw = order.raw || {};
        const cancelledAt = raw.cancelledAt || raw.cancellationDate;
        const createdAt = raw.createdAt || raw.meta?.createdAt;
        return new Date(cancelledAt || createdAt || 0).getTime();
      };
      return getTimestamp(b) - getTimestamp(a);
    });
  }, [orders]);

  return (
    <View style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
      <FlatList
        data={sortedOrders}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            {emptyText}
          </Text>
        }
        renderItem={({ item }) => {
          const paymentMethod = (item.raw?.paymentMethod || '').toString().toLowerCase();
          const isCOD = paymentMethod.includes('cash');
          return (
            <View style={[styles.cardContainer, {
              backgroundColor: COLORS.white,
              borderColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
              borderWidth: 1,
            }]}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={[styles.name, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                    {item.title}
                  </Text>
                  {item.orderNumber ? (
                    <Text style={[styles.orderNumber, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                      Order #{item.orderNumber}
                    </Text>
                  ) : null}
                  <Text style={[styles.address, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                    Amount: PKR {Number(item.price || 0).toFixed(2)}
                  </Text>
                  {item.arrivalText ? (
                    <Text style={[styles.address, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                      Will arrive: {item.arrivalText}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.statusContainer, {
                  borderColor: dark ? COLORS.dark3 : COLORS.primary,
                  backgroundColor: dark ? COLORS.dark3 : COLORS.black
                }]}>
                  <Text style={[styles.statusText, { color: COLORS.white }]}>
                    {item.displayStatus || item.status}
                  </Text>
                </View>
              </View>

              <View style={[styles.separateLine, { backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]} />

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  onPress={() => !isCOD && navigation.navigate("refundpolicy")}
                  disabled={isCOD}
                  style={[
                    isCOD ? styles.disabledBtn : styles.refundBtn,
                    { borderColor: dark ? COLORS.greyScale700 : COLORS.grayscale400 }
                  ]}
                >
                  <Text style={[styles.receiptBtnText, {
                    color: isCOD ? COLORS.grayscale700 : (dark ? COLORS.white : COLORS.primary)
                  }]}>
                    {isCOD ? 'Order Cancelled' : 'View Refund Policy'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    marginVertical: 22
  },
  cardContainer: {
    width: SIZES.width - 32,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusContainer: {
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.greyScale800,
    alignItems: "center",
    justifyContent: "center",
    borderColor: COLORS.primary,
    borderWidth: 1,
    paddingHorizontal: 8
  },
  statusText: {
    fontSize: 10,
    color: COLORS.primary,
    fontFamily: "medium",
  },
  separateLine: {
    width: "100%",
    height: .7,
    backgroundColor: COLORS.greyScale800,
    marginVertical: 12
  },
  name: {
    fontSize: 17,
    fontFamily: "bold",
    color: COLORS.greyscale900
  },
  address: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    marginVertical: 6
  },
  orderNumber: {
    fontSize: 12,
    fontFamily: "medium",
    marginTop: 4,
  },
  refundBtn: {
    flex: 1,
    height: 40,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderWidth: 1.5,
    marginBottom: 6,
    marginHorizontal: 6,
  },
  disabledBtn: {
    flex: 1,
    height: 40,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderWidth: 1.5,
    marginBottom: 6,
    marginHorizontal: 6,
    backgroundColor: COLORS.grayscale200,
  },
  receiptBtnText: {
    fontSize: 14,
    fontFamily: "semiBold",
    color: COLORS.primary,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 14,
    fontFamily: "medium"
  }
});

export default CancelledOrders;
