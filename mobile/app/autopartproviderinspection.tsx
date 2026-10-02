import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons, SIZES } from '@/constants';
import { useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';

const AutoPartProviderInspection = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image source={icons.back} style={[styles.backIcon, { tintColor: colors.text }]} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Auto Parts Provider Inspection</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={[styles.card, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
            <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
              What we do
            </Text>
            <Text style={[styles.bodyText, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
              This product is first delivered to us from the seller. Our team will inspect the product and check whether the product quality meets your requirements, then we send it. If not, we will refund the amount to you.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backIcon: { width: 24, height: 24 },
  title: { fontSize: 18, fontFamily: 'bold' },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  sectionTitle: { fontSize: 16, fontFamily: 'bold', marginBottom: 8 },
  bodyText: { fontSize: 14, fontFamily: 'regular', lineHeight: 20 },
});

export default AutoPartProviderInspection;
