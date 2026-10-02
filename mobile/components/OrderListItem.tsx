import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import React from 'react';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import { FontAwesome } from '@expo/vector-icons';

interface OrderListItemProps {
  name: string;
  subtitleName?: string;
  image: any; // Adjust the type according to your image source (e.g., ImageSourcePropType)
  price: number | string; // Assuming price is a number
  salePrice?: number | string;
  storeName?: string;
  rating: number; // Assuming rating is a number
  numReviews: number; // Assuming numReviews is a number
  onPress?: () => void; // Function to handle press event
  size?: string; // Optional size prop
  color: string; // Color should be a string (e.g., hex color)
  quantity: number; // Assuming quantity is a number
}

const OrderListItem: React.FC<OrderListItemProps> = ({
  name,
  subtitleName,
  image,
  price,
  salePrice,
  rating,
  numReviews,
  onPress,
  size,
  color,
  quantity,
  storeName,
}) => {
  const { dark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: dark ? COLORS.dark2 : COLORS.white,
        },
      ]}
    >
      <View
        style={[
          styles.imageContainer,
          {
            backgroundColor: dark ? COLORS.dark3 : COLORS.silver,
          },
        ]}
      >
        <Image source={image} resizeMode='cover' style={styles.image} />
      </View>
      <View style={styles.columnContainer}>
        <View style={styles.topViewContainer}>
          <Text
            style={[
              styles.name,
              {
                color: dark ? COLORS.secondaryWhite : COLORS.greyscale900,
              },
            ]}
          >
            {name}
          </Text>
          {storeName ? (
            <Text style={[styles.storeName, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]} numberOfLines={1}>
              {storeName}
            </Text>
          ) : null}
        </View>
        <View style={styles.viewContainer}>
          <FontAwesome name='star' size={14} color={COLORS.black} />
          <Text
            style={[
              styles.location,
              {
                color: dark ? COLORS.greyscale300 : COLORS.grayscale700,
              },
            ]}
          >
            {' '}
            {rating} ({numReviews})
          </Text>
        </View>
        <View style={styles.bottomViewContainer}>
          <View style={styles.priceContainer}>
            {salePrice && Number(salePrice) < Number(price) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.price, { color: dark ? COLORS.white : COLORS.primary }]}>
                  PKR {salePrice}
                </Text>
                <Text style={[styles.priceStriked, { color: COLORS.grayscale700 }]}>
                  PKR {price}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.price,
                  {
                    color: dark ? COLORS.white : COLORS.primary,
                  },
                ]}
              >
                PKR {price}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.qtyContainer,
              {
                backgroundColor: COLORS.black,
              },
            ]}
          >
            <Text
              style={[
                styles.qtyNum,
                {
                  color: COLORS.white,
                },
              ]}
            >
              {quantity}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: SIZES.width - 32,
    backgroundColor: COLORS.white,
    padding: 6,
    paddingBottom: 12,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: 'flex-start',
    borderBottomColor: COLORS.silver,
    borderBottomWidth: 1
    
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: COLORS.silver,
  },
  columnContainer: {
    flexDirection: 'column',
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
    marginVertical: 4,
    marginRight: 16,
  },
  location: {
    fontSize: 14,
    fontFamily: 'regular',
    color: COLORS.grayscale700,
    marginVertical: 4,
  },
  subtitleName: {
    fontSize: 12,
    fontFamily: 'regular',
  },
  priceContainer: {
    flexDirection: 'column',
    marginVertical: 0,
  },
  storeName: { fontSize: 14, fontFamily: 'medium', marginVertical: 4 },
  bottomViewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 0,
  },
  viewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 0,
  },
  price: {
    fontSize: 16,
    fontFamily: 'semiBold',
    color: COLORS.primary,
    marginRight: 8,
  },
  priceStriked: {
    fontSize: 12,
    fontFamily: 'regular',
    textDecorationLine: 'line-through',
  },
  qtyContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.silver,
    flexDirection: 'row',
  },
  qtyNum: {
    fontSize: 14,
    fontFamily: 'semiBold',
    color: COLORS.primary,
    marginHorizontal: 12,
  },
  topViewContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    // alignItems: 'center',
    width: SIZES.width - 164,
  },
});

export default OrderListItem;
