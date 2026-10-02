import { View, StyleSheet } from 'react-native';
import React, { useMemo, useState } from 'react';
import { COLORS, icons } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import { ScrollView } from 'react-native-virtualized-view';
import ButtonFilled from '../components/ButtonFilled';
import ShippingItem from '@/components/ShippingItem';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation, useLocalSearchParams } from 'expo-router';

const PARCELS = [
  { code: 'S' as const, maxVolume: 280 },
  { code: 'M' as const, maxVolume: 840 },
  { code: 'L' as const, maxVolume: 2160 },
  { code: 'XL' as const, maxVolume: 24000 },
];

const SHIPPING_TIERS: Record<'eco' | 'regular' | 'express', { eta: string; minDays: number; maxDays: number; prices: Record<'S' | 'M' | 'L' | 'XL', number> }> = {
  eco: { eta: '3-5 business days', minDays: 3, maxDays: 5, prices: { S: 250, M: 350, L: 550, XL: 1800 } },
  regular: { eta: '2-3 business days', minDays: 2, maxDays: 3, prices: { S: 350, M: 500, L: 750, XL: 2600 } },
  express: { eta: '1-2 business days', minDays: 1, maxDays: 2, prices: { S: 550, M: 750, L: 1100, XL: 3800 } },
};

const addBusinessDays = (start: Date, days: number) => {
  const date = new Date(start);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return date;
};

const formatRange = (start: Date, end: Date) => {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = monthNames[start.getMonth()];
  const endMonth = monthNames[end.getMonth()];
  if (startMonth === endMonth) return `${startDay} - ${endDay} ${startMonth}`;
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
};

const ChooseShippingMethods = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { colors, dark } = useTheme();
  const params = useLocalSearchParams<{ volume?: string; shippingMethod?: string; sellerVolumes?: string }>();
  const totalVolume = Number(params.volume || 0);
  let sellerVolumes: Record<string, number> = {};
  try {
    if (params.sellerVolumes) {
      sellerVolumes = JSON.parse(params.sellerVolumes as string) || {};
    }
  } catch {
    sellerVolumes = {};
  }
  const defaultMethod = (params.shippingMethod as string)?.toLowerCase();
  const [selectedItem, setSelectedItem] = useState<string | null>(
    defaultMethod === 'eco' ? 'Economy' : defaultMethod === 'express' ? 'Express' : 'Regular'
  );

  const calcTier = (code: 'eco' | 'regular' | 'express') => {
    const tier = SHIPPING_TIERS[code];
    let fee = 0;
    const volumes = Object.keys(sellerVolumes).length ? Object.values(sellerVolumes) : [totalVolume];
    volumes.forEach(volume => {
      const parcel = PARCELS.find(p => volume <= p.maxVolume) || PARCELS[PARCELS.length - 1];
      fee += tier.prices[parcel.code];
    });
    const today = new Date();
    const start = addBusinessDays(today, tier.minDays);
    const end = addBusinessDays(today, tier.maxDays);
    return { fee, range: formatRange(start, end) };
  };

  const economyInfo = useMemo(() => calcTier('eco'), [totalVolume]);
  const regularInfo = useMemo(() => calcTier('regular'), [totalVolume]);
  const expressInfo = useMemo(() => calcTier('express'), [totalVolume]);

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
        <Header title="Choose Shipping" />
        <ScrollView
          contentContainerStyle={{
            backgroundColor: dark ? COLORS.dark1 : COLORS.white,
            marginVertical: 12
          }}
          showsVerticalScrollIndicator={false}>
          <ShippingItem
            checked={selectedItem === 'Economy'}
            onPress={() => handleCheckboxPress('Economy')}
            name="Economy"
            arrivalDate={economyInfo.range}
            price={economyInfo.fee}
            icon={icons.box2}
          />
          <ShippingItem
            checked={selectedItem === 'Regular'}
            onPress={() => handleCheckboxPress('Regular')}
            name="Regular"
            arrivalDate={regularInfo.range}
            price={regularInfo.fee}
            icon={icons.motorcycle}
          />
          {/* <ShippingItem
            checked={selectedItem === 'Cargo'}
            onPress={() => handleCheckboxPress('Cargo')}
            name="Cargo"
            arrivalDate="Dec 19-20"
            price={200}
            icon={icons.cargo}
          /> */}
          <ShippingItem
            checked={selectedItem === "Express"}
            onPress={() => handleCheckboxPress("Express")}
            name="Express"
            arrivalDate={expressInfo.range}
            price={expressInfo.fee}
            icon={icons.cargo2}
          />
          {/* <ShippingItem
            checked={selectedItem === "Premium"}
            onPress={() => handleCheckboxPress("Premium")}
            name="Premium"
            arrivalDate="Dec 17-18"
            price={500}
            icon={icons.cargo2}
          /> */}
        </ScrollView>
        <ButtonFilled
          title="Apply"
          onPress={() => {
            if (!selectedItem) {
              navigation.goBack();
              return;
            }
            const code = selectedItem === 'Economy' ? 'eco' : selectedItem === 'Express' ? 'express' : 'regular';
            navigation.navigate('checkout', { shippingMethod: code });
          }}
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
    paddingTop: 16,
    paddingHorizontal: 16
  },
  addBtn: {
    backgroundColor: COLORS.tansparentPrimary,
    borderColor: COLORS.tansparentPrimary
  }
})

export default ChooseShippingMethods
