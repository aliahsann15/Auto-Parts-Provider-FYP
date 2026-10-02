import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType, GestureResponderEvent } from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import { COLORS, SIZES, icons } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import StarRating from './StarRating';
import { PRODUCT_PLACEHOLDER, toAbsoluteImageUri } from '@/utils/images';

interface ProductCardProps {
    name: string;
    image: ImageSourcePropType | string;
    numSolds?: number;
    price: number | string;
    salePrice?: number | string;
    rating: number;
    onPress: (event: GestureResponderEvent) => void;
    isWishlisted?: boolean;
    onToggleWishlist?: () => void;
    wishlistLoading?: boolean;
    vehicleLabel?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
    name,
    image,
    numSolds,
    price,
    salePrice,
    rating,
    onPress,
    isWishlisted,
    onToggleWishlist,
    wishlistLoading,
    vehicleLabel
}) => {
    const [localFav, setLocalFav] = useState(false);
    const { dark } = useTheme();
    const source = image
        ? typeof image === 'string'
            ? { uri: toAbsoluteImageUri(image) ?? image }
            : image
        : PRODUCT_PLACEHOLDER;
    const favourite = typeof isWishlisted === 'boolean' ? isWishlisted : localFav;
    const displayName = vehicleLabel ? `${vehicleLabel} ${name}` : name;
    const priceNumber = Number(price);
    const saleNumber = salePrice !== undefined ? Number(salePrice) : NaN;
    const hasSale = Number.isFinite(priceNumber) && priceNumber > 0 && Number.isFinite(saleNumber) && saleNumber < priceNumber;
    const soldCount = Number.isFinite(Number(numSolds)) ? Number(numSolds) : 0;

    const handleToggle = async () => {
        try {
            if (onToggleWishlist) {
                await onToggleWishlist();
            } else {
                setLocalFav(prev => !prev);
            }
            DeviceEventEmitter.emit('wishlist:navigate');
        } catch {
            // ignore toggle error; upstream handles auth alerts
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.container,
                { backgroundColor: dark ? COLORS.dark2 : COLORS.white }
            ]}
        >
            <View style={[
                styles.imageContainer,
                { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }
            ]}>
                {hasSale ? (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            -{Math.max(0, Math.round((1 - Number(saleNumber) / Number(priceNumber)) * 100))}%
                        </Text>
                    </View>
                ) : null}
                <Image
                    source={source}
                    resizeMode="cover"
                    style={styles.image}
                />
            </View>
            <View style={styles.favouriteContainer}>
                <TouchableOpacity onPress={handleToggle} disabled={wishlistLoading}>
                    <Image
                        source={favourite ? icons.heart5 : icons.heart3Outline}
                        resizeMode="contain"
                        style={[styles.heartIcon, wishlistLoading && { opacity: 0.5 }]}
                    />
                </TouchableOpacity>
            </View>
            <Text
                style={[
                    styles.name,
                    { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }
                ]}
                numberOfLines={2}
            >
                {displayName}
            </Text>
            {/* {vehicleLabel ? (
                <Text
                    style={[
                        styles.vehicle,
                        { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }
                    ]}
                    numberOfLines={2}
                >
                    {vehicleLabel}
                </Text>
            ) : null} */}
            <View style={styles.viewContainer}>
                <StarRating rating={rating} size={14} />
                <Text style={[
                    styles.location,
                    { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }
                ]}>
                    {" "}{rating.toFixed(1)} | 
                </Text>
                <View style={[
                    styles.soldContainer,
                    { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }
                ]}>
                    <Text style={[
                        styles.soldText,
                        { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }
                    ]}>
                        {soldCount} sold
                    </Text>
                </View>
            </View>
            <View style={styles.bottomPriceContainer}>
                <View style={styles.priceContainer}>
                    {hasSale ? (
                        <>
                            <Text style={[
                                styles.salePrice,
                                { color: dark ? COLORS.white : COLORS.primary }
                            ]}>
                                PKR {salePrice}
                            </Text>
                            <Text style={[
                                styles.priceStriked,
                                { color: dark ? COLORS.grayscale700 : COLORS.grayscale700 }
                            ]}>
                                PKR {price}
                            </Text>
                        </>
                    ) : (
                        <Text style={[
                            styles.price,
                            { color: dark ? COLORS.white : COLORS.primary }
                        ]}>
                            PKR {price}
                        </Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "column",
        width: (SIZES.width - 32) / 2 - 12,
        backgroundColor: COLORS.white,
        padding: 6,
        borderRadius: 16,
        marginBottom: 12,
        marginRight: 4
    },
    imageContainer: {
        width: "100%",
        height: 160,
        borderRadius: 16,
        backgroundColor: COLORS.silver
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 16
    },
    name: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.greyscale900,
        marginVertical: 4
    },
    vehicle: {
        fontSize: 12,
        fontFamily: "regular",
        marginBottom: 4,
    },
    location: {
        fontSize: 12,
        fontFamily: "regular",
        color: COLORS.grayscale700,
        marginVertical: 4
    },
    bottomPriceContainer: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    price: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.primary,
        marginRight: 8
    },
    salePrice: {
        fontSize: 18,
        fontFamily: "bold",
        marginRight: 8
    },
    priceStriked: {
        fontSize: 12,
        fontFamily: "regular",
        textDecorationLine: 'line-through'
    },
    heartIcon: {
        width: 16,
        height: 16,
        tintColor: COLORS.white,
    },
    favouriteContainer: {
        position: "absolute",
        top: 16,
        right: 16,
        width: 28,
        height: 28,
        borderRadius: 9999,
        backgroundColor: COLORS.primary,
        zIndex: 999,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
    },
    viewContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        marginBottom: 6,
gap: 5,
    },
    soldContainer: {
        width: 66,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
        backgroundColor: COLORS.silver
    },
    soldText: {
        fontSize: 12,
        fontFamily: "medium",
        color: COLORS.grayscale700,
        marginVertical: 4
    },
    badge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'red',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
        zIndex: 2,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 12,
        fontFamily: 'bold',
    }
});

export default ProductCard;
