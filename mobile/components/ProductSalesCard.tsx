import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  GestureResponderEvent,
} from 'react-native';
import { COLORS, SIZES, icons } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import StarRating from './StarRating';
import { PRODUCT_PLACEHOLDER } from '@/utils/images';

interface ProductCardProps {
  name: string;
  image: ImageSourcePropType | string;
  numSolds: number;
  price: number | string;
  salesprice: number | string;
  rating: number;
  onPress: (event: GestureResponderEvent) => void;
}

const ProductSalesCard: React.FC<ProductCardProps> = ({
  name,
  image,
  numSolds,
  price,
  salesprice,
  rating,
  onPress,
}) => {
  const [isFavourite, setIsFavourite] = useState(false);
  const { dark } = useTheme();
  const priceNumber = Number(price);
  const saleNumber = Number(salesprice);
  const hasSale = Number.isFinite(priceNumber) && priceNumber > 0 && Number.isFinite(saleNumber) && saleNumber < priceNumber;
  const source = image
    ? typeof image === 'string'
      ? { uri: image }
      : image
    : PRODUCT_PLACEHOLDER;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: dark ? COLORS.dark2 : COLORS.white }
      ]}
    >
      {/* Discount Badge */}
      {hasSale && (
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            -{Math.round(((+priceNumber - +saleNumber) / +priceNumber) * 100)}%
          </Text>
        </View>
      )}

      {/* Product Image */}
      <View style={[
        styles.imageContainer,
        { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }
      ]}>
        <Image
          source={source}
          resizeMode="cover"
          style={styles.image}
        />
      </View>

      {/* Favourite Icon */}
      <View style={styles.favouriteContainer}>
        <TouchableOpacity onPress={() => setIsFavourite(!isFavourite)}>
          <Image
            source={isFavourite ? icons.heart5 : icons.heart3Outline}
            resizeMode="contain"
            style={styles.heartIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Name */}
      <Text style={[
        styles.name,
        { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }
      ]}>
        {name}
      </Text>

      {/* Rating and Sold */}
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
            {numSolds} sold
          </Text>
        </View>
      </View>

      {/* Prices */}
      <View style={styles.bottomPriceContainer}>
        <View style={styles.priceContainer}>
          {hasSale ? (
            <>
              <Text style={styles.originalPrice}>PKR {price}</Text>
              <Text style={styles.salePrice}>PKR {salesprice}</Text>
            </>
          ) : (
            <Text style={styles.salePrice}>PKR {price}</Text>
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
    marginRight: 4,
    position: "relative"
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
  originalPrice: {
    fontSize: 14,
    fontFamily: "regular",
    color: COLORS.grayscale700,
    textDecorationLine: 'line-through',
    marginRight: 6
  },
  salePrice: {
    fontSize: 18,
    fontFamily: "bold",
    color: COLORS.greyscale900
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
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'red',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    zIndex: 999,
  },
  discountText: {
    fontSize: 12,
    fontFamily: 'bold',
    color: 'white',
  },
});

export default ProductSalesCard;
