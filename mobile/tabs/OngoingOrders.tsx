import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import React, { useRef, useState } from 'react';
import { SIZES, COLORS } from '../constants';
import RBSheet from "react-native-raw-bottom-sheet";
import { useTheme } from '../theme/ThemeProvider';
import Button from '../components/Button';
import { NavigationProp } from '@react-navigation/native';
import ButtonFilled from '../components/ButtonFilled';
import { useNavigation } from 'expo-router';
import { OrderCardItem } from '@/types/orders';

type Props = {
  orders: OrderCardItem[];
  emptyText?: string;
};

const OngoingOrders: React.FC<Props> = ({ orders, emptyText = 'No ongoing orders' }) => {
  const refRBSheet = useRef<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderCardItem | null>(null);
  const { dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();

  return (
    <View style={[styles.container, {
      backgroundColor: dark ? COLORS.dark1 : COLORS.white
    }]}>
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
          <TouchableOpacity style={[styles.cardContainer, {
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
                borderColor: dark ? COLORS.dark3 : COLORS.black,
                backgroundColor: dark ? COLORS.dark3 : COLORS.black
              }]}>
                <Text style={[styles.statusText, {
                  color: dark ? COLORS.white : COLORS.white,
                }]}>{item.displayStatus || item.status}</Text>
              </View>
            </View>
            <View style={[styles.separateLine, {
              marginVertical: 10,
              backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
            }]} />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedOrder(item);
                  refRBSheet.current?.open();
                }}
                style={[styles.cancelBtn, {
                  borderColor: dark ? COLORS.white : COLORS.primary
                }]}>
                <Text style={[styles.cancelBtnText, {
                  color: dark ? COLORS.white : COLORS.primary,
                }]}>Cancel Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate("productereceipt", { data: JSON.stringify(item.raw || item) })}
                style={[styles.receiptBtn, {
                  backgroundColor: dark ? COLORS.dark3 : COLORS.primary,
                  borderColor: dark ? COLORS.dark3 : COLORS.primary,
                }]}>
                <Text style={styles.receiptBtnText}>View E-Receipt</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
      <RBSheet
        ref={refRBSheet}
        closeOnPressMask={true}
        height={260}
        customStyles={{
          wrapper: {
            backgroundColor: "rgba(0,0,0,0.5)",
          },
          draggableIcon: {
            backgroundColor: dark ? COLORS.greyscale300 : COLORS.greyscale300,
          },
          container: {
            borderTopRightRadius: 32,
            borderTopLeftRadius: 32,
            height: 260,
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
            alignItems: "center",
            width: "100%"
          }
        }}>
        <Text style={[styles.bottomSubtitle, {
          color: dark ? COLORS.red : COLORS.red
        }]}>Cancel Order</Text>
        <View style={[styles.separateLine, {
          backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
        }]} />

        <View style={styles.selectedCancelContainer}>
          <Text style={[styles.cancelTitle, {
            color: dark ? COLORS.secondaryWhite : COLORS.greyscale900
          }]}>Are you sure you want to cancel your order?</Text>
          <Text style={[styles.cancelSubtitle, {
          color: dark ? COLORS.grayscale400 : COLORS.grayscale700
        }]}>You can cancel your order and we will start the refund as per our policy. Refunds are initiated within 14 working days.</Text>
      </View>

      <View style={styles.bottomContainer}>
          <Button
            title="Cancel"
            style={{
              width: (SIZES.width - 32) / 2 - 8,
              backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              borderRadius: 32,
              borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary
            }}
            textColor={dark ? COLORS.white : COLORS.primary}
            onPress={() => refRBSheet.current.close()}
        />
        <ButtonFilled
          title="Yes, Cancel"
          style={styles.removeButton}
          onPress={() => {
              refRBSheet.current.close();
              const orderId = (selectedOrder as any)?.raw?._id || selectedOrder?.id;
              navigation.navigate("cancelorder", { orderId, orderTitle: selectedOrder?.title });
            }}
        />
      </View>
      </RBSheet>
    </View>
  )
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
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.greyscale900
  },
  statusContainer: {
    width: 65,
    height: 26,
    borderRadius: 6,
    backgroundColor: COLORS.greyscale300,
    alignItems: "center",
    justifyContent: "center",
    borderColor: COLORS.primary,
    borderWidth: 1,
    
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
  serviceTitle: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
  },
  cancelBtn: {
    width: "48%",
    height: 36,
    borderRadius: 24,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderColor: COLORS.primary,
    borderWidth: 1.4,
    marginBottom: 12
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.primary,
  },
  receiptBtn: {
    width: (SIZES.width - 32) / 2 - 16,
    height: 36,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderColor: COLORS.primary,
    borderWidth: 1.4,
    marginBottom: 12
  },
  receiptBtnText: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.white,
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  remindMeText: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    marginVertical: 4
  },
  switch: {
    marginLeft: 8,
    transform: [{ scaleX: .8 }, { scaleY: .8 }], // Adjust the size of the switch
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingHorizontal: 16,
    width: "100%"
  },
  cancelButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.tansparentPrimary,
    borderRadius: 32
  },
  removeButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.primary,
    borderRadius: 32
  },
  bottomTitle: {
    fontSize: 24,
    fontFamily: "semiBold",
  },
  bottomSubtitle: {
    fontSize: 18,
    fontFamily: "bold",
    color: COLORS.greyscale900,
    marginTop: 12
  },
  selectedCancelContainer: {
    width: SIZES.width - 32,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  cancelTitle: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    textAlign: "center"
  },
  cancelSubtitle: {
    fontSize: 14,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    marginVertical: 10,
    textAlign: "center"
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4
  },
  priceItemContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  priceItemText: {
    fontSize: 12,
    fontFamily: "regular",
    color: COLORS.grayscale700,
  },
  totalPrice: {
    fontSize: 17,
    fontFamily: "semiBold",
    color: COLORS.primary,
    marginLeft: 8
  },
  reviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    marginLeft: 14,
  },
  rating: {
    fontSize: 12,
    color: COLORS.grayscale700,
    fontFamily: "regular",
    marginLeft: 4,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 14,
    fontFamily: "medium"
  }
});

export default OngoingOrders
