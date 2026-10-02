// components/CartPopup.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { suggestions } from '@/data';
import { COLORS, SIZES } from '@/constants';
import { DarkTheme, NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { darkColors } from '@/theme/colors';
import { ScrollView } from 'react-native-virtualized-view';
import { useAuth } from '@/app/context/AuthContext';
import { getCart, updateCartItem, removeCartItem, addToCart as apiAddToCart } from '@/utils/api/cart';
import { API_BASE_URL } from '@/utils/api/client';
import { fetchPublicProducts } from '@/utils/api/products';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.8;

// Suggestion card width, leaving some peek
const SUGGESTION_WIDTH = SCREEN_WIDTH * 0.8;
const SUGGESTION_SPACING = 16;

export interface CartItem {
  id: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
}

interface CartPopupProps {
  visible: boolean;
  onClose: () => void;
  onCartCountChange?: (count: number) => void;
}

const CartPopup: React.FC<CartPopupProps> = ({ visible, onClose, onCartCountChange }) => {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [mounted, setMounted] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<any[]>([]);
  const { token } = useAuth();
  const apiBase = API_BASE_URL.replace(/\/api$/, '');

  // handle show/hide with smooth animation
  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible]);

  const increment = async (id: string) => {
    const item = cartItems.find(i => i.id === id);
    if (!item || !token) return;
    await updateCartItem({ productId: id, quantity: item.quantity + 1 }, token);
    await loadCart();
  };
  const decrement = async (id: string) => {
    const item = cartItems.find(i => i.id === id);
    if (!item || !token) return;
    const nextQty = Math.max(1, item.quantity - 1);
    await updateCartItem({ productId: id, quantity: nextQty }, token);
    await loadCart();
  };
  const removeItem = async (id: string) => {
    if (!token) return;
    await removeCartItem(id, token);
    await loadCart();
  };

  const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const isEmpty = cartItems.length === 0;

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemRow}>
      <Image source={item.image ? { uri: item.image } : undefined} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>PKR {item.price.toFixed(2)}</Text>
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
  );

  const renderSuggestion = ({ item }: { item: { id: string; name: string; price: number; image?: string } }) => (
    <View style={styles.suggestionCard}>
      <Image source={item.image ? { uri: item.image } : undefined} style={styles.suggestionImage} />
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{item.name}</Text>
        <Text style={styles.suggestionPrice}>PKR {item.price.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.suggestionBtn}
          onPress={async () => {
            if (!token) return;
            await apiAddToCart({ productId: item.id, quantity: 1 }, token);
            await loadCart();
            await loadSuggestions(cartItems.map(c => c.id).concat(item.id));
          }}>
          <Text style={styles.suggestionBtnText}>ADD</Text>
        </TouchableOpacity></View>
    </View>
  );
  const navigation = useNavigation<NavigationProp<any>>();

  const loadCart = async (): Promise<CartItem[] | undefined> => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getCart(token);
      const normalized = (res?.items || []).map((item: any) => ({
        id: item.product?._id || item.product,
        name: item.product?.name || 'Product',
        price: item.product?.salePrice || item.product?.price || 0,
        quantity: item.quantity,
        image: item.product?.images?.[0]
          ? item.product.images[0].startsWith('http')
            ? item.product.images[0]
            : `${apiBase}${item.product.images[0]}`
          : undefined,
      }));
      setCartItems(normalized);
      onCartCountChange?.(normalized.reduce((acc, cur) => acc + cur.quantity, 0));
      setError(null);
      return normalized;
    } catch (err: any) {
      setError(err?.message || 'Failed to load cart');
      onCartCountChange?.(0);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async (excludeIds: string[]) => {
    try {
      const res = await fetchPublicProducts({ limit: 20, page: 1 });
      const products = res.products || [];
      const pool = products.filter(p => !excludeIds.includes(p._id));
      const picked = pool
        .sort(() => Math.random() - 0.5)
        .slice(0, 6)
        .map(p => ({
          id: p._id,
          name: p.name,
          price: p.salePrice || p.price,
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
    const run = async () => {
      const items = await loadCart();
      const ids = items?.map(i => i.id) || [];
      await loadSuggestions(ids);
    };
    if (visible) {
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, visible, apiBase]);

  if (!mounted) return null;

  return (
    <Modal transparent animationType="none" visible={mounted} onRequestClose={onClose}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cart Items</Text>
          <View style={styles.separateLine} />
        </View>
<ScrollView
          contentContainerStyle={{
   paddingHorizontal: 16,
          }}
        >
        {/* Cart Items */}
        <FlatList
          data={cartItems}
          keyExtractor={i => i.id?.toString()}
          renderItem={renderCartItem}
          contentContainerStyle={styles.listContent}
        />
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
            contentContainerStyle={{ paddingHorizontal: SUGGESTION_SPACING / 2 }}
            renderItem={renderSuggestion}
            ListEmptyComponent={
              <Text style={{ paddingHorizontal: 16, color: COLORS.grayscale700 }}>No suggestions available.</Text>
            }
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Total</Text>
            <Text style={styles.totalAmount}>PKR {total.toFixed(2)}</Text>
          </View>
          {/* <TouchableOpacity style={styles.continueBtn} onPress={onClose}>
            <Text>Continue shopping</Text>
          </TouchableOpacity> */}
          {!isEmpty && (
            <TouchableOpacity onPress={() => { onClose(); navigation.navigate("checkout"); }} style={styles.checkoutBtn}>
              <Text style={[styles.checkoutBtnText]}>Go to checkout →</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

export default CartPopup;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: SCREEN_WIDTH,
    maxHeight: SHEET_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    height: 80,

    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "semiBold",
    color: COLORS.black,
    textAlign: "center",
  },
  listContent: { padding: 16,
    marginTop: -15,
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
  suggestionImage: { width: 80, height: 80, borderRadius: 4, marginBottom: 8 },
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
    textAlign: "center"
  },
  checkoutBtnText: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.white,
    textAlign: "center"
},
  separateLine: {
    height: .4,
    width: SIZES.width - 32,
    backgroundColor: COLORS.greyscale300,
    marginVertical: 12
  }
});
