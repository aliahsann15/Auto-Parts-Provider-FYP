import { View, StyleSheet, FlatList, TouchableOpacity, Text } from 'react-native';
import React, { useState, useEffect } from 'react';
import { COLORS, icons } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { ScrollView } from 'react-native-virtualized-view';
import { useTheme } from '../theme/ThemeProvider';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { fetchCarMakes } from '@/utils/api/carData';

const Categories = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const [makes, setMakes] = useState<string[]>([]);

  // Fetch makes on component mount
  useEffect(() => {
    const loadMakes = async () => {
      try {
        const res = await fetchCarMakes();
        const makeList = Array.isArray((res as any)?.makes) ? (res as any).makes : [];
        setMakes(makeList);
      } catch (err) {
        console.error('Failed to load makes:', err);
      }
    };
    loadMakes();
  }, []);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Top Makes" rightIcon={icons.search} onRightPress={() => navigation.navigate('search')} />
        <ScrollView style={styles.scrollView}>
          <FlatList
            data={makes}
            keyExtractor={(item) => item}
            numColumns={3}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.chip}
                onPress={() => navigation.navigate('company', { slug: item.toLowerCase() })}
              >
                <Text style={styles.chipText}>{item}</Text>
              </TouchableOpacity>
            )}
            />
        </ScrollView>
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
  scrollView: {
    marginVertical: 22
  },
  chip: {
    // flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1.3,
    borderColor: COLORS.primary,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: "30%"
  },
  chipText: {
    color: COLORS.primary,
    fontFamily: 'medium',
    textAlign: 'center'
  }
})

export default Categories
