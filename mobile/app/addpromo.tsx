import { View, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import { COLORS, SIZES } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { ScrollView } from 'react-native-virtualized-view';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import PromoItem from '@/components/PromoItem';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';

const AddPromo = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const [selectedItem, setSelectedItem] = useState(null);
  const { colors, dark } = useTheme();

  // Handle checkbox
  const handleCheckboxPress = (itemTitle:any) => {
    if (selectedItem === itemTitle) {
      // If the clicked item is already selected, deselect it
      setSelectedItem(null);
    } else {
      // Otherwise, select the clicked item
      setSelectedItem(itemTitle);
    }
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Add Promo" />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{
            backgroundColor: dark ? COLORS.dark1 : COLORS.white,
            marginTop: 16
          }}>
            <PromoItem
              checked={selectedItem === 'Offer1'}
              onPress={() => handleCheckboxPress('Offer1')}
              title="Special 25% Off"
              description="Special promo only today!"
              primaryColor={COLORS.primary}
              transparentColor={COLORS.primary}
            />
            <PromoItem
              checked={selectedItem === 'Offer2'}
              onPress={() => handleCheckboxPress('Offer2')}
              title="Discount 30% Off"
              description="New user special promo"
              primaryColor={COLORS.primary}
              transparentColor={COLORS.primary}
            />
            <PromoItem
              checked={selectedItem === 'Offer3'}
              onPress={() => handleCheckboxPress('Offer3')}
              title="Special 20% Off"
              description="Special promo only today"
              primaryColor={COLORS.primary}
              transparentColor={COLORS.primary}
            />
            <PromoItem
              checked={selectedItem === 'Offer4'}
              onPress={() => handleCheckboxPress('Offer4')}
              title="Discount 40% Off"
              description="Special promo only valid today!"
              primaryColor={COLORS.primary}
              transparentColor={COLORS.primary}
            />
            <PromoItem
              checked={selectedItem === 'Offer5'}
              onPress={() => handleCheckboxPress('Offer5')}
              title="Discount 35% Off"
              description="Special promo only valid today!"
              primaryColor={COLORS.primary}
              transparentColor={COLORS.primary}
            />
            <PromoItem
              checked={selectedItem === 'Offer6'}
              onPress={() => handleCheckboxPress('Offer6')}
              title="Discount 40% Off"
              description="Special promo only valid today!"
              primaryColor={COLORS.primary}
              transparentColor={COLORS.primary}
            />
          </View>
        </ScrollView>
      </View>
      <View style={[styles.bottomContainer, {
        backgroundColor: dark ? COLORS.dark1 : COLORS.white
      }]}>
        <ButtonFilled
          title="Apply Promo"
          style={{ width: SIZES.width - 32 }}
          onPress={() => navigation.goBack()}
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
    padding: 16
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    height: 112,
    backgroundColor: COLORS.white,
    width: SIZES.width,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32
  }
})

export default AddPromo