import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../theme/ThemeProvider';
import HeaderWithSearch from '../components/HeaderWithSearch';
import ProductCard from '../components/ProductCard';
import { fetchPublicProductsByMake } from '@/utils/api/products';
import { API_BASE_URL } from '@/utils/api/client';
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { icons, COLORS } from '@/constants';
import useWishlist from '@/hooks/useWishlist';

const Company = () => {
  const params = useLocalSearchParams();
  const slug = String((params as any).slug || '');
  const { dark, colors } = useTheme();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp<any>>();
  const { isInWishlist, toggle: toggleWishlist, isUpdatingId } = useWishlist();

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        // fetch products filtered by make
        const res = await fetchPublicProductsByMake(slug, { limit: 100 });
        const list = (res && (res as any).products) || [];
        setProducts(list);
      } catch (err) {
        console.error('Failed to load products for make', slug, err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}> 
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <HeaderWithSearch
          title={slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Company'}
          icon={icons.search}
          onPress={() => navigation.navigate('search')}
        />

        <View style={styles.content}>
          {loading ? null : (
            products.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.text }]}>No products found</Text>
              </View>
            ) : (
              <FlatList
                data={products}
                keyExtractor={(item) => item._id || item.id}
                numColumns={2}
                columnWrapperStyle={{ gap: 16 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  // build full image url if needed
                  const apiBase = API_BASE_URL.replace(/\/api$/, '');
                  const firstImage = item.images && item.images.length ? item.images[0] : undefined;
                  const imageUrl = firstImage ? (firstImage.startsWith('http') ? firstImage : `${apiBase}${firstImage}`) : undefined;
                  return (
                    <ProductCard
                      name={item.name}
                      image={imageUrl}
                      numSolds={item.itemsSold ?? item.stock ?? 0}
                      price={item.price}
                      salePrice={item.salePrice}
                      rating={item.reviews?.length ? (item.reviews.reduce((s:any, r:any)=> s + (r.rating||0),0) / item.reviews.length) : 0}
                      onPress={() => navigation.navigate('cardetails', { id: item._id || item.id })}
                      isWishlisted={isInWishlist(item._id)}
                      onToggleWishlist={async () => {
                        await toggleWishlist(item._id);
                        navigation.navigate('mywishlist');
                      }}
                      wishlistLoading={isUpdatingId === item._id}
                    />
                  )
                }}
              />
            )
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  content: { flex: 1, marginVertical: 12 },
  emptyState: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, fontFamily: 'medium' }
});

export default Company;
