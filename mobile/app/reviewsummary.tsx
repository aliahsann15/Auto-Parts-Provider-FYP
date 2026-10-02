import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, icons } from '../constants';
import Header from '../components/Header';
import { ScrollView } from 'react-native-virtualized-view';
import { useTheme } from '../theme/ThemeProvider';
import OrderListItem from '../components/OrderListItem';
import { orderList } from '../data';
import ButtonFilled from '../components/ButtonFilled';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';

const ReviewSummary = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const { dark } = useTheme();

    return (
        <SafeAreaView style={[styles.area, {
            backgroundColor: dark ? COLORS.dark1 : COLORS.white
        }]}>
            <View style={[styles.container, {
                backgroundColor: COLORS.white
            }]}>
                <Header title="Review Summary" />
                <ScrollView showsVerticalScrollIndicator={false}>

                    <View style={{
                        marginTop: 22,
                        backgroundColor: dark ? COLORS.dark1 : COLORS.white
                        
                    }}>
                        <FlatList
                            data={orderList}
                            keyExtractor={item => item.id}
                            style={{  }}
                            renderItem={({ item }) => (
                                <OrderListItem
                                    name={item.name}
                                    image={item.image}
                                    price={item.price}
                                    rating={item.rating}
                                    numReviews={item.numReviews}
                                    color={item.color}
                                    quantity={item.quantity}
                                />
                            )}
                        />
                    </View>

                    <View style={[styles.summaryContainer, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    }]}>
                        <View style={styles.view}>
                            <Text style={[styles.viewLeft, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Address</Text>
                            <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>House No 21, J-Block, Eden Executive</Text>
                        </View>

                        <View style={styles.view}>
                            <Text style={[styles.viewLeft, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Name</Text>
                            <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Ahmed Afzal</Text>
                        </View>
                        <View style={styles.view}>
                            <Text style={[styles.viewLeft, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Phone</Text>
                            <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>+92 303 9245137</Text>
                        </View>
                    </View>

                    <View style={[styles.summaryContainer, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    }]}>
                        <View style={styles.view}>
                            <Text style={[styles.viewLeft, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Amount</Text>
                            <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>PKR 170,000</Text>
                        </View>
                        <View style={styles.view}>
                            <Text style={[styles.viewLeft, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Shipping</Text>
                            <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>PKR 250</Text>
                        </View>
                        <View style={styles.view}>
                            <Text style={[styles.viewLeft, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Tax</Text>
                            <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>PKR 1,000</Text>
                        </View>
                        <View style={[styles.separateLine, {
                            backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200
                        }]} />
                        <View style={styles.view}>
                            <Text style={[styles.viewLeft, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>Total</Text>
                            <Text style={[styles.viewRight, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>PKR 171,250</Text>
                        </View>
                    </View>

                    <View style={[styles.cardContainer, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.white
                    }]}>
                        <View style={styles.cardLeft}>
                            <Image
                                source={icons.creditCard}
                                resizeMode='contain'
                                style={styles.creditCard}
                            />
                            <Text style={[styles.creditCardNum, {
                                color: dark ? COLORS.white : COLORS.greyscale900
                            }]}>
                                •••• •••• •••• •••• 4679</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate("AddNewCard")}>
                            <Text style={[styles.changeBtnText, {
                                color: dark ? COLORS.white : COLORS.primary
                            }]} onPress={() => navigation.navigate("paymentmethods")}>Change</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
                <ButtonFilled
                    title="Continue"
                    onPress={() => navigation.navigate("checkoutsuccessful")}
                    style={styles.continueBtn}
                />
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
        padding: 16,
    },
    btnContainer: {
        width: SIZES.width - 32,
        height: 300,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 28,
        marginBottom: 16,
        backgroundColor: "#FAFAFA"
    },
    premiumIcon: {
        width: 60,
        height: 60,
        tintColor: COLORS.primary
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 12
    },
    price: {
        fontSize: 32,
        fontFamily: "bold",
        color: COLORS.greyscale900
    },
    priceMonth: {
        fontSize: 18,
        fontFamily: "medium",
        color: COLORS.grayscale700,
    },
    premiumItemContainer: {
        marginTop: 16
    },
    premiumItem: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 6
    },
    premiumText: {
        fontSize: 16,
        fontFamily: "medium",
        color: COLORS.greyScale800,
        marginLeft: 24
    },
    summaryContainer: {
        width: SIZES.width - 32,
        borderRadius: 16,
        padding: 16,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.grayscale200, 
        marginBottom: 12,
        marginTop: 12,
    },
    view: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: 12
    },
    viewLeft: {
        fontSize: 14,
        fontFamily: "medium",
        color: COLORS.grayscale700
    },
    viewRight: {
        fontSize: 14,
        fontFamily: "semiBold",
        color: COLORS.greyscale900
    },
    separateLine: {
        width: "100%",
        height: 1,
        backgroundColor: COLORS.grayscale200
    },
    creditCard: {
        width: 44,
        height: 34

    },
    creditCardNum: {
        fontSize: 16,
        fontFamily: "bold",
        color: COLORS.greyscale900,
        marginLeft: 12
    },
    changeBtnText: {
        fontSize: 14,
        fontFamily: "bold",
        color: COLORS.primary
    },
    cardContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 12,
        marginBottom: 72,
        width: SIZES.width - 32,
        height: 80,
        borderRadius: 16,
        padding: 16,
        backgroundColor: COLORS.white,
          borderWidth: 1,
        borderColor: COLORS.grayscale200, 
    },
    cardLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    continueBtn: {
        borderRadius: 32,
      
        width: SIZES.width - 32,
        height: 58,
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        bottom: -10,
        left: 16,
        right: 16
       
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: "bold",
        color: COLORS.primary,
        textAlign: "center",
        marginVertical: 12
    },
    modalSubtitle: {
        fontSize: 16,
        fontFamily: "regular",
        color: COLORS.black,
        textAlign: "center",
        marginVertical: 12
    },
    modalContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)"
    },
    modalSubContainer: {
        height: 520,
        width: SIZES.width * 0.9,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        padding: 16
    },
    modalIllustration: {
        height: 180,
        width: 180,
        marginVertical: 22
    },
    successBtn: {
        width: "100%",
        marginTop: 12,
        borderRadius: 32
    },
    receiptBtn: {
        width: "100%",
        marginTop: 12,
        borderRadius: 32,
        backgroundColor: COLORS.tansparentPrimary,
        borderColor: COLORS.tansparentPrimary
    },
    editPencilIcon: {
        width: 42,
        height: 42,
        tintColor: COLORS.white,
        zIndex: 99999,
        position: "absolute",
        top: 54,
        left: 58,
    },
    backgroundIllustration: {
        height: 150,
        width: 150,
        marginVertical: 22,
        alignItems: "center",
        justifyContent: "center",
        zIndex: -999
    },
})

export default ReviewSummary