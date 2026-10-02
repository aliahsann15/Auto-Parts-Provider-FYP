import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions, Modal, TouchableWithoutFeedback, FlatList, TextInput } from 'react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView } from 'react-native-tab-view';
import { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons, images, SIZES } from '@/constants';
import { CancelledOrders, CompletedOrders } from '@/tabs';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import ActiveProducts from '../sellerProductTabs/ActiveProducts';
import DraftProducts from '../sellerProductTabs/DraftProducts';
import DeletedProducts from '../sellerProductTabs/DeleteProducts';


const Products = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const layout = useWindowDimensions();
  const { dark, colors } = useTheme();
  const params = useLocalSearchParams<{ refresh?: string }>();

  const [index, setIndex] = React.useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [routes] = React.useState([
    { key: 'first', title: 'Active' },
    { key: 'second', title: 'Draft' },
    { key: 'third', title: 'Deleted' }
  ]);
  const sortOptions: { key: 'recent' | 'mostSold' | 'topRated' | 'priceHigh' | 'priceLow'; label: string }[] = [
    { key: 'recent', label: 'Recent' },
    { key: 'mostSold', label: 'Most sold' },
    { key: 'topRated', label: 'Top rated' },
    { key: 'priceHigh', label: 'Price high → low' },
    { key: 'priceLow', label: 'Price low → high' },
  ];
  const [sortKey, setSortKey] = useState<'recent' | 'mostSold' | 'topRated' | 'priceHigh' | 'priceLow'>('recent');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const dropdownItems = [
    { label: 'Add Product', value: 'addProduct', icon: icons.addFileOutline },
   
  ];

  const handleDropdownSelect = (item: any) => {
    setSelectedItem(item.value);
    setModalVisible(false);

    // Perform actions based on the selected item
    switch (item.value) {
      case 'addProduct':
        // Handle Share action
        setModalVisible(false);
        navigation.navigate('addProduct')
        break;
      
      default:
        break;
    }
  };

  useFocusEffect(
    useCallback(() => {
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  useEffect(() => {
    if (params.refresh) {
      setRefreshKey(prev => prev + 1);
    }
  }, [params.refresh]);

  const handleListChanged = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const renderScene = ({ route }: { route: { key: string } }) => {
    switch (route.key) {
      case 'first':
        return <ActiveProducts refreshKey={refreshKey} onChange={handleListChanged} sortKey={sortKey} searchTerm={searchTerm} />;
      case 'second':
        return <DraftProducts refreshKey={refreshKey} onChange={handleListChanged} sortKey={sortKey} searchTerm={searchTerm} />;
      case 'third':
        return <DeletedProducts refreshKey={refreshKey} onChange={handleListChanged} sortKey={sortKey} searchTerm={searchTerm} />;
      default:
        return null;
    }
  };

  const renderTabBar = () => (
    <View>
      <View style={styles.customTabBar}>
        {routes.map((route, idx) => {
          const focused = idx === index;
          return (
            <TouchableOpacity
              key={route.key}
              style={[
                styles.customTab,
                focused && { borderBottomColor: dark ? COLORS.white : COLORS.primary, borderBottomWidth: 2 }
              ]}
              onPress={() => setIndex(idx)}
            >
              <Text style={{
                color: focused ? (dark ? COLORS.white : COLORS.primary) : "gray",
                fontSize: 16,
                fontFamily: "semiBold"
              }}>
                {route.title}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <View style={styles.searchSortRow}>
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search products..."
          placeholderTextColor={dark ? COLORS.gray3 : COLORS.gray}
          style={[
            styles.searchInput,
            {
              backgroundColor: COLORS.white,
              color: COLORS.black,
              borderColor: COLORS.black,
            },
          ]}
        />
        <TouchableOpacity
          onPress={() => setSortModalVisible(true)}
          style={[styles.sortChip, { borderColor: dark ? COLORS.white : COLORS.primary }]}
        >
          <Text style={[styles.sortText, { color: dark ? COLORS.white : COLORS.primary }]}>
            Sort: {sortOptions.find(o => o.key === sortKey)?.label || 'Recent'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  /**
  * Render header
  */
  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}>
            <Image
              source={icons.back}
              resizeMode='contain'
              style={[styles.backIcon, {
                tintColor: dark ? COLORS.white : COLORS.greyscale900
              }]}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {
            color: dark ? COLORS.white : COLORS.greyscale900
          }]}>
            My Products
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('addProduct')}
          style={[styles.addBtn, { backgroundColor: dark ? COLORS.dark3 : COLORS.primary }]}
        >
          <Image source={icons.plus} style={{ width: 16, height: 16, tintColor: COLORS.white, marginRight: 8 }} />
          <Text style={{ color: COLORS.white, fontFamily: 'semiBold', fontSize: 14 }}>Add Product</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          renderTabBar={renderTabBar}
        />
        <Modal transparent visible={sortModalVisible} animationType="fade">
          <TouchableWithoutFeedback onPress={() => setSortModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
                  {sortOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={styles.modalRow}
                      onPress={() => {
                        setSortKey(opt.key);
                        setSortModalVisible(false);
                      }}
                    >
                      <Text style={[styles.modalText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
      {/* Modal removed */}
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
  sortRow: {
    alignItems: 'flex-end',
    marginTop: 0,
    marginBottom: 0,
    padding: 0
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.2,
  },
  sortText: { fontFamily: 'semiBold', fontSize: 13 },
  customTabBar: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayscale200
  },
  customTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center'
  },
  headerContainer: {
    flexDirection: "row",
    width: SIZES.width - 32,
    justifyContent: "space-between",
    marginBottom: 16
  },
  addBtn: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    flex: 1,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '80%', borderRadius: 12, paddingVertical: 16, elevation: 3 },
  modalRow: { paddingVertical:0, paddingHorizontal: 16 },
  modalText: { fontFamily: 'medium', fontSize: 15, marginBottom: 12 },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    color: COLORS.black,
    marginLeft: 16
  },
  moreIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.black
  },

modalBackdrop: {
  flex: 1,
   // dim backdrop
},

dropdownContainer: {
  position: 'absolute',
  top: 112,
  right: 12,
  width: 202,
  padding: 16,
  borderRadius: 8,
},

dropdownItem: {
  flexDirection: 'row',
  alignItems: 'center',
  marginVertical: 12,
},

dropdownIcon: {
  width: 20,
  height: 20,
  marginRight: 16,
},

dropdownLabel: {
  fontSize: 14,
  fontFamily: 'semiBold',
},

})

export default Products
