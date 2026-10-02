import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import { COLORS, SIZES } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import Header from '../components/Header';
import { ScrollView } from 'react-native-virtualized-view';
import ButtonFilled from '../components/ButtonFilled';
import AddressItem from '@/components/AddressItem';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import { useNavigation, router } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { fetchAddresses, Address } from '@/utils/api/addresses';

const SelectShippingAddress = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { colors, dark } = useTheme();
  const { token, isLoggedIn } = useAuth();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      const load = async () => {
        if (!token) {
          setAddresses([]);
          return;
        }
        setLoading(true);
        try {
          const res = await fetchAddresses(token);
          const list = res.addresses || [];
          setAddresses(list);
          const lastIdx = list.length ? String(list.length - 1) : null;
          if (!selectedItem && lastIdx) {
            setSelectedItem(lastIdx);
          } else if (selectedItem && list.length) {
            const idxNum = Number(selectedItem);
            if (Number.isNaN(idxNum) || idxNum >= list.length) {
              setSelectedItem(lastIdx);
            }
          }
        } catch {
          setAddresses([]);
        } finally {
          setLoading(false);
        }
      };
      load();
    }, [token, isLoggedIn, selectedItem])
  );

  const handleCheckboxPress = (id: string) => {
    setSelectedItem(id === selectedItem ? null : id);
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          title="Deliver To"
          renderRight={() => (
            <TouchableOpacity style={styles.headerAdd} onPress={() => navigation.navigate("addnewaddress")}>
              <Text style={[styles.addNewText, { color: dark ? COLORS.white : COLORS.primary }]}>+ Add new</Text>
            </TouchableOpacity>
          )}
        />
        <ScrollView
          contentContainerStyle={{
            backgroundColor: dark ? COLORS.dark1 : COLORS.white,
            marginVertical: 16
          }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
          ) : addresses.length === 0 ? (
            <Text style={{ color: dark ? COLORS.white : COLORS.greyscale900, paddingVertical: 12 }}>
              No saved addresses.
            </Text>
          ) : (
            addresses.map((addr, idx) => {
              const id = String(idx);
              return (
                <View
                  key={id}
                  style={[
                    styles.addressWrapper,
                    selectedItem === id && styles.addressWrapperSelected
                  ]}
                >
                  <AddressItem
                    checked={selectedItem === id}
                    onPress={() => handleCheckboxPress(id)}
                    name={addr.fullAddress || 'Address'}
                    address={[addr.street, addr.city, addr.postalCode].filter(Boolean).join(', ')}
                  />
                </View>
              );
            })
          )}

        </ScrollView>

        <ButtonFilled
          title="Apply"
          onPress={() => {
            const idx = selectedItem ? Number(selectedItem) : -1;
            const selected = idx >= 0 ? addresses[idx] : null;
            if (!selected) {
              return;
            }
            // Ensure we land on checkout with params; replace so selection sticks even if stack is odd.
            router.replace({ pathname: "/checkout", params: { selectedAddress: JSON.stringify(selected) } });
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
  },

  addressWrapper: {

    borderWidth: 1,
    borderColor: COLORS.grayscale200,  // your light gray
    borderRadius: 8,
    marginBottom: 12,                  // space between items
    overflow: 'hidden',
    paddingLeft: 5,

  },
  addressWrapperSelected: {
    borderColor: COLORS.primary,       // highlight selected if you like
  },
  addNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addNewIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  addNewText: {
    fontSize: 16,
    fontFamily: 'semiBold',
  },
  headerAdd: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
})

export default SelectShippingAddress
