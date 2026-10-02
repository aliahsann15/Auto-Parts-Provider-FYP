// screens/CartScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  DeviceEventEmitter,
  BackHandler,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, FONTS, icons, SIZES } from '@/constants';
import { fetchPublicProducts } from '@/utils/api/products';
import HeaderWithSearch from '@/components/HeaderWithSearch';
import { NavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/app/context/AuthContext';
import { getCart, addToCart as apiAddToCart, updateCartItem, removeCartItem } from '@/utils/api/cart';
import { API_BASE_URL } from '@/utils/api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// width of each suggestion “card”
const SUGGESTION_WIDTH = SCREEN_WIDTH * 0.8;
// spacing between cards
const SUGGESTION_SPACING = 16;

export default function CartScreen() {
  const navigation = useNavigation<NavigationProp<any>>();
  const { dark, colors } = useTheme();
  const { token, isLoggedIn } = useAuth();
  const [cartItems, setCartItems] = useState<{ id: string; name: string; price: number; quantity: number; image?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<{ id: string; name: string; price: number; image?: string }[]>([]);
  const [forceIndexBack, setForceIndexBack] = useState(false);
  const apiBase = API_BASE_URL.replace(/\/api$/, '');

  const increment = async (id: string) => {
    if (!token) return;
    const item = cartItems.find(i => i.id === id);
    if (!item) return;
    try {
      await updateCartItem({ productId: id, quantity: item.quantity + 1 }, token);
      await loadCart();
    } catch (err: any) {
      setError(err?.message || 'Failed to update cart');
    }
  };

  const decrement = async (id: string) => {
    if (!token) return;
    const item = cartItems.find(i => i.id === id);
    if (!item) return;
    const nextQty = Math.max(1, item.quantity - 1);
    try {
      await updateCartItem({ productId: id, quantity: nextQty }, token);
      await loadCart();
    } catch (err: any) {
      setError(err?.message || 'Failed to update cart');
    }
  };

  const removeItem = async (id: string) => {
    if (!token) return;
    try {
      await removeCartItem(id, token);
      await loadCart();
    } catch (err: any) {
      setError(err?.message || 'Failed to remove item');
    }
  };

  const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const renderSuggestion = ({ item }: { item: { id: string; name: string; price: number; originalPrice?: number; image?: string } }) => (
    <View style={styles.suggestionCard}>
      <Image
        source={item.image ? { uri: item.image } : icons.image}
        style={styles.suggestionImage}
        resizeMode="contain"
        defaultSource={icons.image}
      />
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{item.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.suggestionPrice}>
            PKR {item.price.toFixed(2)}
          </Text>
          {item.originalPrice && item.originalPrice > item.price ? (
            <Text style={[styles.suggestionPrice, { textDecorationLine: 'line-through', color: COLORS.grayscale700, marginLeft: 6 }]}>
              PKR {item.originalPrice.toFixed(2)}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.suggestionBtn}
          onPress={async () => {
            if (!token) return navigation.navigate('login');
            await apiAddToCart({ productId: item.id, quantity: 1 }, token);
            await loadCart();
          }}>
          <Text style={styles.suggestionBtnText}>ADD</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  const loadCart = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getCart(token);
      const normalized = (res?.items || []).map((item: any) => {
        let image: string | undefined;
        const raw = item.product?.images?.[0];
        if (raw) {
          image = raw.startsWith('http') ? raw : `${apiBase}${raw}`;
          // treat placeholder URLs as missing so we show our app placeholder icon
          if (image?.includes('placeholder.com')) {
            image = undefined;
          }
        }
        return {
          id: item.product?._id || item.product,
          name: item.product?.name || 'Product',
          price: item.product?.salePrice || item.product?.price || 0,
          quantity: item.quantity,
          image,
          make: item.product?.make || '',
        };
      });
      setCartItems(normalized);
      const count = normalized.reduce((sum, it) => sum + it.quantity, 0);
      DeviceEventEmitter.emit('cart:updated', count);
      setError(null);
      await loadSuggestions(normalized.map(i => i.id), normalized.map(i => i.make));
    } catch (err: any) {
      setError(err?.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async (excludeIds: string[], makes: string[]) => {
    try {
      const res = await fetchPublicProducts({ limit: 20, page: 1 });
      const products = res.products || [];
      const pool = products.filter(p => !excludeIds.includes(p._id));
      const filtered = pool
        .filter(p => {
          if (!makes.length) return true;
          return makes.some(m => m && p.make && p.make.toLowerCase() === m.toLowerCase());
        });
      const source = filtered.length ? filtered : pool;
      const picked = source
        .sort(() => Math.random() - 0.5)
        .slice(0, 6)
        .map(p => ({
          id: p._id,
          name: p.name,
          price: p.salePrice || p.price,
          originalPrice: p.price,
          image: p.images?.[0]
            ? p.images[0].startsWith('http')
              ? p.images[0]
              : `${apiBase}${p.images[0]}`
            : undefined,
        }));
      setSuggested(picked);
    } catch {
      setSuggested([]);
    }
  };

  useEffect(() => {
    loadCart();
  }, [token, apiBase]);

  useFocusEffect(
    React.useCallback(() => {
      loadCart();
    }, [token, apiBase])
  );

  const handleBackPress = useCallback(() => {
    if (forceIndexBack) {
      setForceIndexBack(false);
      router.replace('/(tabs)/inbox');
      return;
    }
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    router.replace('/(tabs)/inbox');
  }, [forceIndexBack, navigation]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('cart:navigate', () => {
      setForceIndexBack(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const beforeRemove = navigation.addListener('beforeRemove', e => {
      if (!forceIndexBack) return;
      e.preventDefault();
      router.replace('/(tabs)/inbox');
      setForceIndexBack(false);
    });
    return beforeRemove;
  }, [navigation, forceIndexBack]);

  useEffect(() => {
    if (forceIndexBack) {
      const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBackPress();
        return true;
      });
      return () => backSub.remove();
    }
    return undefined;
  }, [forceIndexBack, handleBackPress]);

  useEffect(() => {
    if (navigation.setOptions) {
      navigation.setOptions({ gestureEnabled: !forceIndexBack });
    }
  }, [navigation, forceIndexBack]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('cart:navigate', () => {
      setForceIndexBack(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const removeListener = navigation.addListener('beforeRemove', e => {
      if (!forceIndexBack) return;
      e.preventDefault();
      router.replace('/(tabs)/inbox');
      setForceIndexBack(false);
    });
    return removeListener;
  }, [navigation, forceIndexBack]);

  useEffect(() => {
    const blurListener = navigation.addListener('blur', () => {
      if (forceIndexBack) {
        setForceIndexBack(false);
      }
    });
    return blurListener;
  }, [navigation, forceIndexBack]);

  // Additional navigation guards handled above.
  return (
    <SafeAreaView
      style={[styles.area, { backgroundColor: colors.background }]}
    >
{isLoggedIn ? ( <View
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <HeaderWithSearch
          title="Cart"
          onBackPress={handleBackPress}
        />

        <ScrollView
          contentContainerStyle={{
            backgroundColor: dark ? COLORS.dark1 : COLORS.white,
            paddingBottom: 20, // space for fixed button
          }}
        >
          {loading ? (
            <Text style={{ padding: 16, color: dark ? COLORS.white : COLORS.black }}>Loading cart...</Text>
          ) : error ? (
            <Text style={{ padding: 16, color: COLORS.red }}>{error}</Text>
          ) : cartItems.length === 0 ? (
            <View style={{ padding: 16 }}>
              <Text style={{ color: dark ? COLORS.white : COLORS.black, fontSize: 16 }}>Nothing here yet.</Text>
              <TouchableOpacity onPress={() => navigation.navigate('(tabs)')}>
                <Text style={{ color: COLORS.primary, marginTop: 8 }}>Continue shopping</Text>
              </TouchableOpacity>
            </View>
          ) : (
            cartItems.map(item => (
              <View key={item.id} style={styles.itemRow}>
                <Image
                  source={item.image ? { uri: item.image } : icons.image}
                  style={styles.itemImage}
                  resizeMode="contain"
                  defaultSource={icons.image}
                />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>
                    PKR {item.price.toFixed(2)}
                  </Text>
                  <View style={styles.qtyBox}>
                    <TouchableOpacity onPress={() => decrement(item.id)}>
                      <Feather name="minus" size={16} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => increment(item.id)}>
                      <Feather name="plus" size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Feather name="trash-2" size={20} color="black" />
                </TouchableOpacity>
              </View>
            ))
          )}

        
        </ScrollView>

      
              {/* You May Also Like */}
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>You May Also Like</Text>
            <FlatList
              data={suggested}
              keyExtractor={i => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              snapToInterval={SUGGESTION_WIDTH + SUGGESTION_SPACING}
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: SUGGESTION_SPACING / 2,
              }}
              renderItem={renderSuggestion}
              ListEmptyComponent={
                <Text style={{ paddingHorizontal: 16, color: COLORS.grayscale700 }}>No suggestions available.</Text>
              }
            />
          </View>
          {cartItems.length > 0 ? (
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => navigation.navigate('checkout')}
            >
              <Text style={[styles.checkoutBtnText]}>
                Go to checkout → PKR {total.toFixed(2)}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => navigation.navigate('(tabs)')}
            >
              <Text style={[styles.checkoutBtnText]}>
                Continue shopping
              </Text>
            </TouchableOpacity>
          )}
        </View>)
        : (
        <View
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <HeaderWithSearch
          title="Cart"
          onBackPress={handleBackPress}
        />

<ScrollView
  contentContainerStyle={{
    flex: 1,
    backgroundColor: dark ? COLORS.dark1 : COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
                padding: 16,
  }}
>

  <Text style={{ fontFamily: 'bold', fontSize: 25, marginBottom: 10}}>Cart is Empty!</Text>
  <TouchableOpacity style={styles.submitBtn} onPress={() => navigation.navigate("(tabs)")}>
    <Text style={styles.submitText}>Continue shopping</Text>
  </TouchableOpacity>
</ScrollView>


      
       
          
        </View>)}
     
     
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white,
    
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 16,
    
  },
  itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      width: SIZES.width - 32,
      borderRadius: 18,
      backgroundColor: COLORS.white,
      paddingHorizontal: 8,
      paddingVertical: 16,
      marginBottom: 12
    },
    itemImage: {   width: 88,
      height: 88,
      borderRadius: 16,
      marginRight: 12,
      backgroundColor: COLORS.silver },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 17,
      fontFamily: "bold",
      color: COLORS.greyscale900, marginBottom: 6},
    itemPrice: { fontSize: 14, marginBottom: 6 },
    qtyBox: {
      width: 75,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      justifyContent: 'center',
      borderRadius: 6,
      backgroundColor: "transparent",
      borderColor: COLORS.primary,
      borderWidth: 1
    },
    qtyText: { marginHorizontal: 8,
      fontSize: 14,
      color: COLORS.primary,
      fontFamily: "medium", 
  },
  
    suggestionsContainer: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: '#eee',
      paddingVertical: 12,
    
      
    },
    suggestionsTitle: {
      fontSize: 17,
      fontFamily: "bold",
      color: COLORS.greyscale900,
      marginLeft: SUGGESTION_SPACING / 2,
      marginBottom: 12,
    },
    suggestionCard: {
      width: SUGGESTION_WIDTH,
      marginHorizontal: SUGGESTION_SPACING / 2,
      backgroundColor: '#f9f9f9',
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
      flexDirection: 'row',        // row vs column
      justifyContent: 'flex-start', // horizontal alignment
      gap: 20,
  
    },
    suggestionImage: { width: 80, height: 80, borderRadius: 4, marginBottom: 8, backgroundColor: 'transparent' },
    suggestionName: {   fontSize: 15,
      fontFamily: "bold",
      color: COLORS.greyscale900,
      marginBottom: 4, textAlign: 'left' },
    suggestionPrice: { fontSize: 14, fontWeight: '400', marginBottom: 8 },
    suggestionBtn: {
      backgroundColor: COLORS.black,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
    },
    suggestionContent: {
      width: SUGGESTION_WIDTH * 0.6,
      alignItems: 'flex-start',
      textAlign: 'left',
  
    },
    suggestionBtnText: { color: '#fff', fontSize: 12 },
  
    footer: { padding: 16,
      
    },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    totalText: {  fontFamily: "bold",
      color: COLORS.greyscale900, fontSize: 16, },
    totalAmount: { fontFamily: "bold",
      color: COLORS.greyscale900, fontSize: 18, },
    continueBtn: {
      width: '100%',
      padding: 12,
      borderWidth: 1,
      borderColor: '#ccc',
      alignItems: 'center',
      marginBottom: 8,
      backgroundColor: COLORS.primary,
      borderRadius: 32
    },
    checkoutBtn: {
      height: 58,
      width: '100%',
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 32,
      backgroundColor: COLORS.black,
      flexDirection: "row",
      fontSize: 16,
      fontFamily: "bold",
      color: COLORS.white,
      textAlign: "center",
      marginBottom: 70,
      marginTop: 16
    },
    checkoutBtnText: {
      fontSize: 16,
      fontFamily: "bold",
      color: COLORS.white,
      textAlign: "center",
      
  },
    separateLine: {
      height: .4,
      width: SIZES.width - 32,
      backgroundColor: COLORS.greyscale300,
      marginVertical: 12
    },
    submitBtn: {
      height: 58,
      width: '70%',
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 32,
      backgroundColor: COLORS.black,
      flexDirection: "row",
      fontSize: 16,
      fontFamily: "bold",
      color: COLORS.white,
      textAlign: "center",
      marginBottom: 60,
      marginTop: 16,
      alignSelf: 'center'
    },
    submitText: {  fontSize: 16,
      fontFamily: "bold",
      color: COLORS.white,
      textAlign: "center", },
});
