import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import React from 'react';
import { SIZES, COLORS } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation, router } from 'expo-router';
import { OrderCardItem } from '@/types/orders';
import { ReturnSummaryItem } from '@/utils/api/orders';

type Props = {
  orders: OrderCardItem[];
  emptyText?: string;
  returnSummary?: Record<string, ReturnSummaryItem>;
};

const CompletedOrders: React.FC<Props> = ({ orders, emptyText = 'No completed orders', returnSummary }) => {
  const { dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();

  const getOrderTotalQuantity = (order: OrderCardItem) => {
    const rawItems = (order.raw as any)?.items;
    if (!Array.isArray(rawItems)) return 0;
    return rawItems.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
  };

  return (
    <View style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            {emptyText}
          </Text>
        }
        renderItem={({ item }) => (
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
                <Text style={[styles.address, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                  Amount: PKR {Number(item.price || 0).toFixed(2)}
                </Text>
                {(() => {
                  const summary = returnSummary?.[item.id];
                  const summaryStatus = (summary?.status || '').toLowerCase();
                  const showRejectionNotice = summaryStatus === 'rejected' || !!summary?.hasRejected;
                  if (showRejectionNotice) {
                    const orderId = (item.raw && (item.raw._id || item.raw.id)) || item.id;
                    return (
                     
                        <Text
                          style={[styles.rejectionLink, { color: dark ? COLORS.white : COLORS.primary }]}
                          onPress={() => router.push(`/order-returns/${orderId}`)}
                        >
                          Check Request Returns For This Order
                        </Text>
                   
                    );
                  }
                  if (item.arrivalText) {
                    return (
                      <Text style={[styles.address, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                        Will arrive: {item.arrivalText}
                      </Text>
                    );
                  }
                  return null;
                })()}
              </View>
              <View style={[styles.statusContainer, {
                borderColor: dark ? COLORS.dark3 : COLORS.primary,
                backgroundColor: dark ? COLORS.dark3 : COLORS.black
              }]}>
                <Text style={[styles.statusText, { color: dark ? COLORS.white : COLORS.white }]}>
                  {item.displayStatus || item.status}
                </Text>
              </View>
            </View>

            <View style={[styles.separateLine, { backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 }]} />

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate('productereceipt', {
                  data: JSON.stringify(item.raw || item),
                  orderNumber: item.subtitle || item.orderNumber,
                })}
                style={[styles.receiptBtn, { backgroundColor: dark ? COLORS.dark3 : COLORS.primary }]}
              >
                <Text style={styles.receiptBtnText}>View E-Receipt</Text>
              </TouchableOpacity>
              {['delivered', 'completed'].includes((item.status || '').toLowerCase()) && (() => {
                const totalQty = getOrderTotalQuantity(item);
                const requestedQty = returnSummary?.[item.id]?.requestedQuantity ?? 0;
                const allRequested = totalQty > 0 && requestedQty >= totalQty;
                const canRequestAgain = totalQty > requestedQty;
                const targetColor = dark ? COLORS.white : COLORS.primary;
                const summaryStatus = (returnSummary?.[item.id]?.status || '').toLowerCase();
                const hasApprovedRequest = summaryStatus === 'approved';
                if (!canRequestAgain) {
                  return (
                    <TouchableOpacity disabled style={[styles.returnBtn, styles.returnBtnDisabled]}>
                      <Text style={styles.returnBtnTextDisabled}>
                        {hasApprovedRequest ? 'Return Requested' : allRequested ? 'Request Rejected' : 'Request Cancelled'}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('returnrequest', {
                        orderId: (item.raw && (item.raw._id || item.raw.id)) || item.id,
                        orderNumber: item.orderNumber || item.subtitle || item.title,
                      })
                    }
                    style={[styles.returnBtn, { borderColor: dark ? COLORS.dark3 : COLORS.primary }]}
                  >
                    <Text style={[styles.returnBtnText, { color: targetColor }]}>Request Return</Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          </View>
        )}
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
    backgroundColor: "transparent",
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
  rejectionNotice: {
    fontSize: 12,
    fontFamily: "regular",
    marginTop: 4,
  },
  rejectionLink: {
    textDecorationLine: "underline",
    fontSize: 12,
    fontFamily: "semiBold",
  },
  receiptBtn: {
    flex: 1,
    height: 40,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderColor: COLORS.primary,
    borderWidth: 1.2,
    marginBottom: 6,
    marginHorizontal: 6
  },
  receiptBtnText: {
    fontSize: 14,
    fontFamily: "semiBold",
    color: COLORS.white,
  },
  returnBtn: {
    flex: 1,
    height: 40,
    borderRadius: 24,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 6,
    marginHorizontal: 6
  },
  returnBtnText: {
    fontSize: 14,
    fontFamily: "semiBold",
  },
  returnBtnDisabled: {
    opacity: 0.45,
    borderColor: COLORS.grayscale200,
  },
  returnBtnTextDisabled: {
    fontSize: 14,
    fontFamily: "semiBold",
    color: COLORS.greyscale500,
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

export default CompletedOrders;
