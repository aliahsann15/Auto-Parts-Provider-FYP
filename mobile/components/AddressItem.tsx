import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import React from 'react';
import { COLORS, SIZES, icons } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

// Define the props interface for AddressItem
interface AddressItemProps {
  checked: boolean;
  name: string;
  address: string;
  onPress: () => void; 
}

const AddressItem: React.FC<AddressItemProps> = ({
  checked,
  name,
  address,
  onPress,
}) => {
  const { dark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        {
          borderBottomColor: dark ? COLORS.greyscale900 : COLORS.grayscale100,
          backgroundColor: dark ? COLORS.dark1 : COLORS.white,
        },
      ]}
    >
      <View style={styles.routeLeftContainer}>
       
          <View style={styles.locationIcon2}>
            <Image
              source={icons.location2}
              resizeMode='contain'
              style={styles.locationIcon3}
            />
          </View>
      
        <View>
          <Text
            style={[
              styles.routeName,
              {
                color: dark ? COLORS.white : COLORS.greyscale900,
              },
            ]}
          >
            {name}
          </Text>
          <Text
            style={[
              styles.routeAddress,
              {
                color: dark ? COLORS.grayscale200 : COLORS.grayscale700,
              },
            ]}
          >
            {address}
          </Text>
        </View>
      </View>
      <View style={styles.leftContainer}>
        <TouchableOpacity style={{ marginLeft: 8 }}>
          <View
            style={[
              styles.roundedChecked,
              {
                borderColor: dark ? COLORS.white : COLORS.primary,
              },
            ]}
          >
            {checked && (
              <View
                style={[
                  styles.roundedCheckedCheck,
                  {
                    backgroundColor: dark ? COLORS.white : COLORS.primary,
                  },
                ]}
              />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SIZES.width - 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  routeLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon1: {
    height: 52,
    width: 52,
    borderRadius: 999,
    marginRight: 12,
    backgroundColor: 'rgba(27, 172, 75, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIcon2: {
    height: 36,
    width: 36,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  locationIcon3: {
    height: 16,
    width: 16,
    tintColor: COLORS.white,
  },
  routeName: {
    fontSize: 18,
    color: COLORS.greyscale900,
    fontFamily: 'bold',
    marginBottom: 6,
  },
  routeAddress: {
    fontSize: 12,
    color: COLORS.grayscale700,
    fontFamily: 'regular',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundedChecked: {
    width: 20,
    height: 20,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  roundedCheckedCheck: {
    height: 10,
    width: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
  },
});

export default AddressItem;
