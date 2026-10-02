import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ImageSourcePropType, GestureResponderEvent } from 'react-native';
import { COLORS, SIZES, icons } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import { FontAwesome } from '@expo/vector-icons';

interface WishlistCardProps {
    name: string;
    image: ImageSourcePropType | string;
    numSolds: number;
    price: number | string;
    rating: number;
    onPress: (event: GestureResponderEvent) => void;
    onToggleWishlist?: () => void;
    isWishlisted?: boolean;
    wishlistLoading?: boolean;
}

const WishlistCard: React.FC<WishlistCardProps> = ({
    name,
    image,
    numSolds,
    price,
    rating,
    onPress,
    onToggleWishlist,
    isWishlisted = true,
    wishlistLoading
}) => {
    const { dark } = useTheme();
    const source = typeof image === 'string' ? { uri: image } : image;
    const displayPrice = typeof price === 'number' ? price : price;

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.container, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}
        >
            <View style={[styles.imageContainer, { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }]}>
                <Image source={source} resizeMode="cover" style={styles.image} />
            </View>
            <View style={styles.favouriteContainer}>
                <TouchableOpacity onPress={onToggleWishlist ?? onPress} disabled={wishlistLoading}>
                    <Image
                        source={isWishlisted ? icons.heart5 : icons.heart3Outline}
                        resizeMode="contain"
                        style={[styles.heartIcon, wishlistLoading && { opacity: 0.5 }]}
                    />
                </TouchableOpacity>
            </View>
            <Text style={[styles.name, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>{name}</Text>
            <View style={styles.viewContainer}>
                <FontAwesome name="star-half-o" size={14} color={dark ? COLORS.white : COLORS.primary} />
                <Text style={[styles.location, { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }]}>
                    {" "}
                    {rating} |{" "}
                </Text>
                <View style={[styles.soldContainer, { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }]}>
                    <Text style={[styles.soldText, { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }]}>
                        {numSolds} sold
                    </Text>
                </View>
            </View>
            <View style={styles.bottomPriceContainer}>
                <View style={styles.priceContainer}>
                    <Text style={[styles.price, { color: dark ? COLORS.white : COLORS.primary }]}>PKR {displayPrice}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'column',
        width: (SIZES.width - 32) / 2 - 12,
        backgroundColor: COLORS.white,
        padding: 6,
        borderRadius: 16,
        marginBottom: 12,
        marginRight: 4,
    },
    imageContainer: {
        width: '100%',
        height: 140,
        borderRadius: 16,
        backgroundColor: COLORS.silver,
    },
    image: {
        width: '100%',
        height: 140,
        borderRadius: 16,
    },
    name: {
        fontSize: 18,
        fontFamily: 'bold',
        color: COLORS.greyscale900,
        marginVertical: 4,
    },
    location: {
        fontSize: 12,
        fontFamily: 'regular',
        color: COLORS.grayscale700,
        marginVertical: 4,
    },
    bottomPriceContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    price: {
        fontSize: 18,
        fontFamily: 'bold',
        color: COLORS.primary,
        marginRight: 8,
    },
    heartIcon: {
        width: 16,
        height: 16,
        tintColor: COLORS.white,
    },
    favouriteContainer: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 28,
        height: 28,
        borderRadius: 9999,
        backgroundColor: COLORS.primary,
        zIndex: 999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 6,
    },
    soldContainer: {
        width: 66,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        backgroundColor: COLORS.silver,
    },
    soldText: {
        fontSize: 12,
        fontFamily: 'medium',
        color: COLORS.grayscale700,
        marginVertical: 4,
    },
});

export default WishlistCard;
