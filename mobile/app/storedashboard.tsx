import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  RefreshControl,
  Dimensions,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { COLORS, icons } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { useNavigation, useLocalSearchParams } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { useAuth } from '@/app/context/AuthContext';
import ProductCard from '@/components/ProductCard';
import ProductSalesCard from '@/components/ProductSalesCard';
import { fetchStoreBySellerId } from '@/utils/api/store';
import { fetchPublicProducts, Product } from '@/utils/api/products';
import { API_BASE_URL } from '@/utils/api/client';
import { FontAwesome } from '@expo/vector-icons';
import { fetchSellerOrderInsights, fetchSellerProfitInsights, fetchSellerStats, SellerOrderInsights, SellerProfitInsights, SellerStats } from '@/utils/api/sellerDashboard';
import { sellerreviews } from '@/data/sellerDashboardData';
import { PRODUCT_PLACEHOLDER, resolveProductImageSource } from '@/utils/images';

const { width } = Dimensions.get('window');

const isOnSale = (p: Product) => {
  const priceNum = Number((p as any)?.price);
  const saleNum = Number((p as any)?.salePrice);
  return Number.isFinite(priceNum) && priceNum > 0 && Number.isFinite(saleNum) && saleNum < priceNum;
};

export default function StoreDashboard() {
  const [selectedTab, setSelectedTab] = useState<'Store' | 'Products' | 'Sale'>('Store');
  const { dark, colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const params = useLocalSearchParams<{ sellerId?: string }>();
  const sellerId = params.sellerId || (params as any)?.id;
  const { token } = useAuth();

  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [orderInsights, setOrderInsights] = useState<SellerOrderInsights | null>(null);
  const [profitInsights, setProfitInsights] = useState<SellerProfitInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const apiBase = useMemo(() => API_BASE_URL.replace(/\/api$/, ''), []);

  const loadStoreData = useCallback(async () => {
    if (!sellerId) return;
    try {
      setLoading(true);
      const st = await fetchStoreBySellerId(String(sellerId));
      setStore(st.store);
      const res = await fetchPublicProducts({ seller: String(sellerId), limit: 200 });
      setProducts(res.products || []);
    } catch (err) {
      setStore(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  const loadStatsData = useCallback(async () => {
    if (!token) return;
    try {
      const [s, o, p] = await Promise.all([
        fetchSellerStats(token),
        fetchSellerOrderInsights(token),
        fetchSellerProfitInsights(token),
      ]);
      setStats(s as any);
      setOrderInsights(o as any);
      setProfitInsights(p as any);
    } catch (err) {
      setStats(null);
      setOrderInsights(null);
      setProfitInsights(null);
    }
  }, [token]);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStoreData(), loadStatsData()]).finally(() => setRefreshing(false));
  }, [loadStatsData, loadStoreData]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const avatarLetter = (store?.storeName || 'S').charAt(0).toUpperCase();
  const coverImage = store?.storeCoverImage
    ? store.storeCoverImage.startsWith('http')
      ? store.storeCoverImage
      : `${apiBase}${store.storeCoverImage}`
    : undefined;
  const logoImage = store?.storeProfileImage
    ? store.storeProfileImage.startsWith('http')
      ? store.storeProfileImage
      : `${apiBase}${store.storeProfileImage}`
    : undefined;

  const sections = useMemo<string[]>(() => {
    const order = Array.isArray(store?.sectionsOrder) && store.sectionsOrder.length
      ? store.sectionsOrder
      : ['banner', 'salesbanner', 'featured', 'best', 'reviews', 'sale', 'products'];
    return order.filter(Boolean);
  }, [store]);

  const featuredProducts = useMemo(() => {
    if (!store?.featuredProductIds?.length) return [];
    return products.filter(p => store.featuredProductIds.includes(p._id));
  }, [products, store?.featuredProductIds]);

  const saleProducts = useMemo(
    () => products.filter(isOnSale).sort((a, b) => ((b as any).itemsSold || 0) - ((a as any).itemsSold || 0)),
    [products]
  );

  const bestSellingProducts = useMemo(
    () => [...products].sort((a, b) => ((b as any).itemsSold || 0) - ((a as any).itemsSold || 0)),
    [products]
  );

  const pkGreeting = useMemo(() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const pk = new Date(utc + 5 * 60 * 60000);
    const h = pk.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    if (h < 21) return 'Good Evening';
    return 'Good Night';
  }, []);

  const todayKey = useMemo(() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const pk = new Date(utc + 5 * 60 * 60000);
    return pk.toISOString().slice(0, 10);
  }, []);

  const todayOrderPoint = orderInsights?.points?.find(p => p.date === todayKey);
  const ordersToday =
    (todayOrderPoint?.completed ?? 0) +
    (todayOrderPoint?.pending ?? 0) +
    (todayOrderPoint?.cancelled ?? 0);

  const salesToday = profitInsights?.points?.find(p => p.date === todayKey)?.revenue ?? 0;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image source={icons.back} resizeMode="contain" style={[styles.backIcon, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Store</Text>
      </View>
    </View>
  );

  const renderProductCard = (item: Product) => {
    const image = item.images?.[0]
      ? resolveProductImageSource(item.images[0])
      : PRODUCT_PLACEHOLDER;
    const vehicleLabel = [item.make, item.carModel, item.variant, (item as any)?.year].filter(Boolean).join(' ');
    return (
      <ProductCard
        name={item.name}
        image={image}
        numSolds={(item as any)?.itemsSold ?? (item as any)?.stock ?? 0}
        price={item.salePrice ?? item.price}
        salePrice={item.salePrice}
        rating={item.averageRating ?? item.rating ?? 0}
        vehicleLabel={vehicleLabel}
        onPress={() => navigation.navigate('cardetails', { id: item._id })}
      />
    );
  };

  const renderSalesCard = (item: Product) => {
    const image = item.images?.[0]
      ? resolveProductImageSource(item.images[0])
      : PRODUCT_PLACEHOLDER;
    return (
      <ProductSalesCard
        name={item.name}
        image={image}
        numSolds={(item as any)?.itemsSold ?? (item as any)?.stock ?? 0}
        rating={item.averageRating ?? item.rating ?? 0}
        price={item.price}
        salesprice={item.salePrice ?? item.price ?? 0}
        onPress={() => navigation.navigate('cardetails', { id: item._id })}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      {renderHeader()}
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadAll}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.coverWrapper}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={[styles.coverImage, { backgroundColor: COLORS.silver }]} />
          )}
          <View style={styles.logoWrapper}>
            {logoImage ? (
              <Image source={{ uri: logoImage }} style={styles.logo} resizeMode="cover" />
            ) : (
              <View style={[styles.logo, { backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: COLORS.white, fontFamily: 'bold', fontSize: 18 }}>
                  {avatarLetter}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.greetingText}>{pkGreeting},</Text>
          <Text style={styles.storeName}>{store?.storeName || 'Store'}</Text>
          <Text style={styles.secondary}>{(store?.itemsSold ?? 0)} items sold</Text>
          <Text style={styles.rating}>{("★".repeat(Math.round(store?.averageRating || 0)) || "★")} ({store?.reviewsCount ?? 0} reviews)</Text>
        </View>

        <View style={styles.metricRow}>
          <TouchableOpacity style={styles.metricCard} onPress={() => navigation.navigate('orders')}>
            <Text style={styles.metricLabel}>Orders Today</Text>
            <Text style={styles.metricValue}>{ordersToday || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.metricCard} onPress={() => navigation.navigate('products')}>
            <Text style={styles.metricLabel}>Products</Text>
            <Text style={styles.metricValue}>{stats?.products ?? products.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.metricCard} onPress={() => navigation.navigate('salesreport')}>
            <Text style={styles.metricLabel}>Sales Today</Text>
            <Text style={styles.metricValue}>PKR {salesToday.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16, marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Store Bio</Text>
          <Text style={styles.text}>{store?.storeBio || 'No bio added yet.'}</Text>
        </View>

        <View style={styles.tabRow}>
          {['Store', 'Products', 'Sale'].map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab as any)}
              style={[
                styles.tabPill,
                selectedTab === tab && styles.tabPillActive
              ]}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} />
        ) : (
          <>
            {selectedTab === 'Store' && (
              <View style={{ padding: 16, gap: 20 }}>
                {sections.map((section: string, index: number) => {
                  if (section === 'banner' && store?.storeBanners?.length) {
                    return (
                      <FlatList
                        key={`banner-${index}`}
                        data={store.storeBanners}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(uri, idx) => `${uri}-${idx}`}
                        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                        renderItem={({ item }) => (
                          <Image
                            source={{ uri: item.startsWith('http') ? item : `${apiBase}${item}` }}
                            style={{ width: width * 0.8, height: 200, borderRadius: 12 }}
                            resizeMode="cover"
                          />
                        )}
                      />
                    );
                  }
                  if (section === 'salesbanner' && store?.storeSalesBanners?.length) {
                    return (
                      <FlatList
                        key={`sales-${index}`}
                        data={store.storeSalesBanners}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(uri, idx) => `${uri}-${idx}`}
                        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                        renderItem={({ item }) => (
                          <Image
                            source={{ uri: item.startsWith('http') ? item : `${apiBase}${item}` }}
                            style={{ width: width * 0.8, height: 200, borderRadius: 12 }}
                            resizeMode="cover"
                          />
                        )}
                      />
                    );
                  }
                  if (section === 'featured' && featuredProducts.length) {
                    return (
                      <View key={`featured-${index}`}>
                        <Text style={styles.sectionTitle}>Featured Products</Text>
                        <FlatList
                          data={featuredProducts}
                          keyExtractor={item => item._id}
                          numColumns={2}
                          columnWrapperStyle={{ gap: 16, marginBottom: 16 }}
                          renderItem={({ item }) => renderProductCard(item)}
                        />
                      </View>
                    );
                  }
                  if (section === 'best') {
                    return (
                      <View key={`best-${index}`}>
                        <Text style={styles.sectionTitle}>Best Selling Products</Text>
                        <FlatList
                          data={bestSellingProducts.slice(0, 4)}
                          keyExtractor={item => item._id}
                          numColumns={2}
                          columnWrapperStyle={{ gap: 16, marginBottom: 16 }}
                          renderItem={({ item }) => renderProductCard(item)}
                        />
                      </View>
                    );
                  }
                  if (section === 'sale' && saleProducts.length) {
                    return (
                      <View key={`sale-${index}`}>
                        <Text style={styles.sectionTitle}>Sale Products</Text>
                        <FlatList
                          data={saleProducts}
                          keyExtractor={item => item._id}
                          numColumns={2}
                          columnWrapperStyle={{ gap: 16, marginBottom: 16 }}
                          renderItem={({ item }) => renderSalesCard(item)}
                        />
                      </View>
                    );
                  }
                  if (section === 'reviews') {
                    return (
                      <View key={`reviews-${index}`}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <Text style={styles.sectionTitle}>Store Reviews</Text>
                          <Text style={styles.seeAll} onPress={() => navigation.navigate('productreviews')}>See All</Text>
                        </View>
                        <FlatList
                          data={sellerreviews}
                          keyExtractor={item => item.id}
                          renderItem={({ item }) => (
                            <View style={styles.reviewCard}>
                              <Image source={item.customerImage} style={styles.reviewImage} />
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.reviewName}>{item.reviewerName}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
                                  <FontAwesome name="star-half-o" size={14} color={dark ? COLORS.white : COLORS.primary} />
                                  <Text style={[styles.reviewMeta, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
                                    {" "}{item.rating} | Date: {item.date}
                                  </Text>
                                </View>
                                <Text style={styles.reviewText}>{item.comment}</Text>
                              </View>
                            </View>
                          )}
                        />
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            )}

            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Order Insights</Text>
                <TouchableOpacity onPress={() => navigation.navigate('orderinsights')}>
                  <Text style={styles.seeAll}>View report</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.insightRow}>
                <View style={styles.insightCard}>
                  <Text style={styles.metricLabel}>Completed</Text>
                  <Text style={styles.metricValue}>{orderInsights?.summary?.completed ?? 0}</Text>
                </View>
                <View style={styles.insightCard}>
                  <Text style={styles.metricLabel}>Pending</Text>
                  <Text style={styles.metricValue}>{orderInsights?.summary?.pending ?? 0}</Text>
                </View>
                <View style={styles.insightCard}>
                  <Text style={styles.metricLabel}>Cancelled</Text>
                  <Text style={styles.metricValue}>{orderInsights?.summary?.cancelled ?? 0}</Text>
                </View>
              </View>
            </View>

            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sales Insights</Text>
                <TouchableOpacity onPress={() => navigation.navigate('salesreport')}>
                  <Text style={styles.seeAll}>View report</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.insightRow}>
                <View style={styles.insightCard}>
                  <Text style={styles.metricLabel}>Revenue</Text>
                  <Text style={styles.metricValue}>PKR {(profitInsights?.summary?.revenue ?? 0).toLocaleString()}</Text>
                </View>
                <View style={styles.insightCard}>
                  <Text style={styles.metricLabel}>Profit</Text>
                  <Text style={styles.metricValue}>PKR {(profitInsights?.summary?.profit ?? 0).toLocaleString()}</Text>
                </View>
              </View>
            </View>

            {selectedTab === 'Products' && (
              <View style={{ padding: 16 }}>
                {products.length === 0 ? (
                  <Text style={styles.text}>No products available.</Text>
                ) : (
                  <FlatList
                    data={products}
                    keyExtractor={item => item._id}
                    numColumns={2}
                    columnWrapperStyle={{ gap: 16, marginBottom: 16 }}
                    renderItem={({ item }) => renderProductCard(item)}
                  />
                )}
              </View>
            )}

            {selectedTab === 'Sale' && (
              <View style={{ padding: 16 }}>
                {saleProducts.length === 0 ? (
                  <Text style={styles.text}>No sale products.</Text>
                ) : (
                  <FlatList
                    data={saleProducts}
                    keyExtractor={item => item._id}
                    numColumns={2}
                    columnWrapperStyle={{ gap: 16, marginBottom: 16 }}
                    renderItem={({ item }) => renderSalesCard(item)}
                  />
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1 },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 20, fontFamily: 'bold' },
  backIcon: { width: 24, height: 24 },
  coverWrapper: { position: 'relative' },
  coverImage: { width: '100%', height: 200 },
  logoWrapper: {
    position: 'absolute',
    bottom: -40,
    left: 16,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
    elevation: 3
  },
  infoContainer: {
    marginTop: 52,
    paddingHorizontal: 16,
  },
  storeName: { fontSize: 22, fontFamily: 'bold' },
  greetingText: { fontSize: 16, fontFamily: 'medium', color: COLORS.grayscale700 },
  secondary: { fontSize: 14, fontFamily: 'regular', color: COLORS.grayscale700 },
  rating: { fontSize: 14, fontFamily: 'medium', color: COLORS.black },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 18, gap: 10 },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    backgroundColor: COLORS.white,
  },
  metricLabel: { fontFamily: 'regular', fontSize: 12, color: COLORS.grayscale700 },
  metricValue: { fontFamily: 'bold', fontSize: 16, color: COLORS.black, marginTop: 6 },
  sectionTitle: { fontSize: 18, fontFamily: 'bold', marginBottom: 8 },
  text: { fontSize: 14, fontFamily: 'regular', color: COLORS.grayscale700 },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.black,
    backgroundColor: COLORS.white,
  },
  tabPillActive: {
    backgroundColor: COLORS.black,
  },
  tabText: {
    fontFamily: 'medium',
    color: COLORS.black,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  insightRow: { flexDirection: 'row', gap: 10 },
  insightCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    backgroundColor: COLORS.white,
  },
  seeAll: { fontFamily: 'medium', color: COLORS.primary },
  reviewCard: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: COLORS.silver,
    borderRadius: 10,
    marginBottom: 10
  },
  reviewImage: { width: 48, height: 48, borderRadius: 12 },
  reviewName: { fontFamily: 'bold', fontSize: 14 },
  reviewMeta: { fontFamily: 'regular', fontSize: 12 },
  reviewText: { fontFamily: 'regular', fontSize: 13, color: COLORS.greyscale900 }
});
