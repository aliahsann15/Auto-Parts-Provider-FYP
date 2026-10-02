import { View, Text, StyleSheet, Image } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderWithSearch from '../components/HeaderWithSearch';
import { COLORS, SIZES, icons, images } from '../constants';
import { ScrollView } from 'react-native-virtualized-view';
import { useTheme } from '../theme/ThemeProvider';
import { Ionicons, Fontisto } from "@expo/vector-icons";

const TrackOrder = () => {
    const { colors, dark } = useTheme()

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <HeaderWithSearch
                    title="Track Order"
                    icon={icons.search3}
                    onPress={() => null}
                />
                <ScrollView
                    contentContainerStyle={{
                        backgroundColor: dark ? COLORS.dark2 : COLORS.tertiaryWhite,
                        marginTop: 12
                    }}
                    showsVerticalScrollIndicator={false}>
                    <View style={[styles.orderContainer, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    }]}>
                        <View style={[styles.productImageContainer, {
                            backgroundColor: dark ? COLORS.dark3 : COLORS.silver
                        }]}>
                            <Image
                                source={images.bmw1}
                                resizeMode='contain'
                                style={styles.productImage}
                            />
                        </View>
                        <View>
                            <Text style={[styles.productName, {
                                color: dark ? COLORS.white : COLORS.black,
                            }]}>
                                BMW M5 Series
                            </Text>
                            <View style={styles.descContainer}>
                                <View style={styles.color} />
                                <Text style={[styles.descText, {
                                    color: dark ? COLORS.grayscale100 : COLORS.grayscale700
                                }]}>
                                    Color | Qty = 1
                                </Text>
                            </View>
                            <Text style={[styles.price, {
                                color: dark ? COLORS.white : COLORS.black,
                            }]}>$375.00</Text>
                        </View>
                    </View>
                    <View style={[styles.autoContainer, {
                        backgroundColor: dark ? COLORS.dark3 : COLORS.tertiaryWhite,
                    }]}>
                        <View style={styles.autoIconContainer}>
                            <Image
                                source={icons.box3}
                                resizeMode='contain'
                                style={[styles.autoIcon, {
                                    tintColor: dark ? COLORS.white : COLORS.black
                                }]}
                            />
                            <Ionicons name="checkmark-circle" size={20} color={dark ? COLORS.white : "black"} />
                        </View>
                        <View style={[styles.autoLine, { borderColor: dark ? "#9E9E9E" : COLORS.greyscale900, }]} />
                        <View style={styles.autoIconContainer}>
                            <Image
                                source={icons.cargo2}
                                resizeMode='contain'
                                style={[styles.autoIcon, {
                                    tintColor: dark ? COLORS.white : COLORS.black
                                }]}
                            />
                            <Ionicons name="checkmark-circle" size={20} color={dark ? COLORS.white : "black"} />
                        </View>
                        <View style={[styles.autoLine, { borderColor: "#9E9E9E" }]} />
                        <View style={styles.autoIconContainer}>
                            <Image
                                source={icons.delivery}
                                resizeMode='contain'
                                style={[styles.autoIcon, {
                                    tintColor: "#9E9E9E"
                                }]}
                            />
                            <Ionicons name="checkmark-circle" size={20} color="#9E9E9E" />
                        </View>
                        <View style={[styles.autoLine, { borderColor: "#9E9E9E" }]} />
                        <View style={styles.autoIconContainer}>
                            <Image
                                source={icons.boxOpen2}
                                resizeMode='contain'
                                style={[styles.autoIcon, {
                                    tintColor: "#9E9E9E"
                                }]}
                            />
                            <Ionicons name="checkmark-circle" size={20} color="#9E9E9E" />
                        </View>
                    </View>
                    <View style={[styles.deliveryContainer, {
                        backgroundColor: dark ? COLORS.dark3 : COLORS.tertiaryWhite
                    }]}>
                        <Text style={[styles.deliveryTitle, {
                            color: dark ? COLORS.white : COLORS.black,
                        }]}>
                            Packet In Delivery
                        </Text>
                        <View style={styles.separateLine} />
                    </View>
                    <View style={[styles.viewContainer, {
                        backgroundColor: dark ? COLORS.dark3 : COLORS.white
                    }]}>
                        <Text style={[styles.orderTitle, {
                            color: dark ? COLORS.white : COLORS.black,
                        }]}>Order Status Details</Text>
                        <View style={styles.orderDetailsContainer}>
                            <View style={styles.orderViewContainer}>
                                <Fontisto name="radio-btn-active" size={24} color={dark ? COLORS.white : "black"} />
                                <View style={styles.orderView}>
                                    <Text style={[styles.orderDetailsTitle, {
                                        color: dark ? COLORS.white : COLORS.black,
                                    }]}>Order In Transit - Dec 17</Text>
                                    <Text style={[styles.orderDetailsSubtitle, {
                                        color: dark ? COLORS.greyscale300 : COLORS.grayscale700
                                    }]}>32 Manchester Ave. Ringgold, GA 30736</Text>
                                </View>
                            </View>
                            <Text style={[styles.deliveryTime, {
                                color: dark ? COLORS.greyscale300 : COLORS.grayscale700
                            }]}>15:20 PM</Text>
                        </View>
                        <View style={styles.orderDetailsContainer}>
                            <View style={styles.orderViewContainer}>
                                <Fontisto name="radio-btn-active" size={24} color={dark ? COLORS.white : "black"} />
                                <View style={styles.orderView}>
                                    <Text style={[styles.orderDetailsTitle, {
                                        color: dark ? COLORS.white : COLORS.black,
                                    }]}>Order ... Customs Port - Dec 16</Text>
                                    <Text style={[styles.orderDetailsSubtitle, {
                                        color: dark ? COLORS.greyscale300 : COLORS.grayscale700
                                    }]}>4 Evergreen Street Lake Zurich, IL 60047</Text>
                                </View>
                            </View>
                            <Text style={[styles.deliveryTime, {
                                color: dark ? COLORS.greyscale300 : COLORS.grayscale700
                            }]}>14:40 PM</Text>
                        </View>
                        <View style={styles.orderDetailsContainer}>
                            <View style={styles.orderViewContainer}>
                                <Fontisto name="radio-btn-active" size={24} color={dark ? COLORS.white : "black"} />
                                <View style={styles.orderView}>
                                    <Text style={[styles.orderDetailsTitle, {
                                        color: dark ? COLORS.white : COLORS.black,
                                    }]}>Orders are ... Shipped - Dec 15</Text>
                                    <Text style={[styles.orderDetailsSubtitle, {
                                        color: dark ? COLORS.greyscale300 : COLORS.grayscale700
                                    }]}>9177 Hillcrest Street Wheeling, WV 26003</Text>
                                </View>
                            </View>
                            <Text style={[styles.deliveryTime, {
                                color: dark ? COLORS.greyscale300 : COLORS.grayscale700
                            }]}>11:30 AM</Text>
                        </View>
                        <View style={styles.orderDetailsContainer}>
                            <View style={styles.orderViewContainer}>
                                <Fontisto name="radio-btn-active" size={24} color={dark ? COLORS.white : "black"} />
                                <View style={styles.orderView}>
                                    <Text style={[styles.orderDetailsTitle, {
                                        color: dark ? COLORS.white : COLORS.black,
                                    }]}>Order is in Packing - Dec 15</Text>
                                    <Text style={[styles.orderDetailsSubtitle, {
                                        color: dark ? COLORS.greyscale300 : COLORS.grayscale700
                                    }]}>891 Glen Ridge St. Gainesville, VA 20155</Text>
                                </View>
                            </View>
                            <Text style={[styles.deliveryTime, {
                                color: dark ? COLORS.greyscale300 : COLORS.grayscale700
                            }]}>10:25 AM</Text>
                        </View>
                        <View style={styles.orderDetailsContainer}>
                            <View style={styles.orderViewContainer}>
                                <Fontisto name="radio-btn-active" size={24} color={dark ? COLORS.white : "black"} />
                                <View style={styles.orderView}>
                                    <Text style={[styles.orderDetailsTitle, {
                                        color: dark ? COLORS.white : COLORS.black,
                                    }]}>Verified Payments - Dec 15</Text>
                                    <Text style={[styles.orderDetailsSubtitle, {
                                        color: dark ? COLORS.greyscale300 : COLORS.grayscale700
                                    }]}>55 Summerhouse Dr. Apopka, FL 32703</Text>
                                </View>
                            </View>
                            <Text style={[styles.deliveryTime, {
                                color: dark ? COLORS.greyscale300 : COLORS.grayscale700
                            }]}>10:04 AM</Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingHorizontal: 16,
        paddingTop: 16
    },
    orderContainer: {
        width: 380,
        height: 160,
        borderRadius: 32,
        backgroundColor: COLORS.white,
        marginVertical: 16,
        padding: 16,
        flexDirection: "row",
    },
    productImageContainer: {
        height: 120,
        width: 120,
        borderRadius: 20,
        backgroundColor: COLORS.silver,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    productImage: {
        height: 120,
        width: 120
    },
    productName: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.black,
        marginVertical: 12
    },
    descContainer: {
        marginBottom: 6,
        flexDirection: "row",
        alignItems: "center"
    },
    color: {
        height: 16,
        width: 16,
        backgroundColor: "#7A5548",
        borderRadius: 999,
        marginRight: 12
    },
    descText: {
        fontSize: 12,
        fontFamily: "medium",
        color: COLORS.grayscale700
    },
    price: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.black,
        marginVertical: 12
    },
    autoContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        justifyContent: "center",
        backgroundColor: COLORS.tertiaryWhite,
    },
    autoIconContainer: {
        flexDirection: "column",
        alignItems: "center"
    },
    autoIcon: {
        height: 30,
        width: 30,
        tintColor: COLORS.black,
        marginBottom: 6
    },
    autoLine: {
        width: (SIZES.width - 32) / 5,
        height: 1,
        borderWidth: 1,
        borderColor: COLORS.greyscale900,
        borderRadius: 999,
        borderStyle: "dashed"
    },
    deliveryContainer: {
        backgroundColor: COLORS.tertiaryWhite
    },
    deliveryTitle: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.black,
        textAlign: "center",
        marginVertical: 12
    },
    separateLine: {
        width: "100%",
        height: .2,
        backgroundColor: COLORS.greyscale300,
        marginBottom: 8
    },
    orderTitle: {
        fontSize: 20,
        fontFamily: "bold",
        color: COLORS.black,
        marginVertical: 12
    },
    viewContainer: {
        backgroundColor: COLORS.white
    },
    orderDetailsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginVertical: 12
    },
    orderViewContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    orderDetailsTitle: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.black,
        marginBottom: 12
    },
    orderDetailsSubtitle: {
        fontSize: 14,
        fontFamily: "medium",
        color: COLORS.grayscale700
    },
    deliveryTime: {
        fontSize: 12,
        fontFamily: "medium",
        color: COLORS.grayscale700
    },
    orderView: {
        marginLeft: 12
    }
})

export default TrackOrder