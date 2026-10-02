import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { fetchStoreBySellerId, Store } from '@/utils/api/store';
import { fetchPublicProducts, fetchPublicProduct, Product } from '@/utils/api/products';
import { API_BASE_URL } from '@/utils/api/client';
import ProductCard from '@/components/ProductCard';
import ProductSalesCard from '@/components/ProductSalesCard';
import { COLORS, icons } from '@/constants';
import StarRating from '@/components/StarRating';
import { TextInput } from 'react-native-gesture-handler';
import { PRODUCT_PLACEHOLDER, resolveProductImageSource } from '@/utils/images';

const { width, height } = Dimensions.get('window');

const SECTION_LABELS: Record<string, string> = {
  banner: 'Banners',
  salesBanner: 'Sales Banners',
  featured: 'Featured Products',
  sale: 'Sale Products',
  best: 'Best Selling Products',
  reviews: 'Reviews',
};

const DEFAULT_SECTIONS = ['banner', 'salesBanner', 'featured', 'sale', 'best', 'reviews'];

const isOnSale = (p: Product) => {
  const priceNum = Number((p as any)?.price);
  const saleNum = Number((p as any)?.salePrice);
  return Number.isFinite(priceNum) && priceNum > 0 && Number.isFinite(saleNum) && saleNum < priceNum;
};

const normalizeSectionKey = (key: string) => {
  if (!key) return key;
  if (key.toLowerCase() === 'salesbanner' || key === 'sales_banner') return 'salesBanner';
  return key;
};

type StorePreviewProps = {
  sellerId?: string;
  embedded?: boolean;
  onClose?: () => void;
};

const StorePreview = ({ sellerId: sellerIdOverride, embedded, onClose }: StorePreviewProps = {}) => {
  const params = useLocalSearchParams<{ sellerId?: string; id?: string }>();
  const sellerId = sellerIdOverride || params.sellerId || params.id || '';
  const { colors, dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingStore, setLoadingStore] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'Store' | 'Products' | 'Sale'>('Store');
  const [filterModalTab, setFilterModalTab] = useState<'Products' | 'Sale' | null>(null);
  const [reviewSlideIndex, setReviewSlideIndex] = useState(0);
  const reviewSliderRef = useRef<FlatList<any>>(null);
  const reviewIndexRef = useRef(0);
  const [prodMake, setProdMake] = useState<string>('');
  const [prodModel, setProdModel] = useState<string>('');
  const [prodVariant, setProdVariant] = useState<string>('');
  const [prodYear, setProdYear] = useState<string>('');
  const [prodCategories, setProdCategories] = useState<string[]>([]);
  const [makeSearch, setMakeSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [variantSearch, setVariantSearch] = useState('');
  const [yearSearch, setYearSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [soldCounts, setSoldCounts] = useState<Record<string, number>>({});

  const apiBase = useMemo(() => API_BASE_URL.replace(/\/api$/, ''), []);

  const loadStore = useCallback(async () => {
    if (!sellerId) return;
    try {
      setLoadingStore(true);
      const res = await fetchStoreBySellerId(String(sellerId));
      setStore(res.store);
    } catch (err) {
      setStore(null);
    } finally {
      setLoadingStore(false);
    }
  }, [sellerId]);

  const loadProducts = useCallback(async () => {
    if (!sellerId) return;
    try {
      setLoadingProducts(true);
      const res = await fetchPublicProducts({ seller: String(sellerId), limit: 200 });
      setProducts(res.products || []);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [sellerId]);

  useEffect(() => {
    loadStore();
    loadProducts();
  }, [loadStore, loadProducts]);

  // Fetch items sold per product from detail endpoint (which aggregates orders)
  useEffect(() => {
    let active = true;
    const hydrateSold = async () => {
      if (!products.length) {
        setSoldCounts({});
        return;
      }
      try {
        const entries = await Promise.all(
          products.map(async p => {
            try {
              const res = await fetchPublicProduct(p._id);
              return [p._id, (res as any)?.product?.itemsSold ?? 0] as const;
            } catch {
              return [p._id, 0] as const;
            }
          })
        );
        if (!active) return;
        const map: Record<string, number> = {};
        entries.forEach(([id, sold]) => { map[id] = sold; });
        setSoldCounts(map);
      } catch {
        if (active) setSoldCounts({});
      }
    };
    hydrateSold();
    return () => { active = false; };
  }, [products]);

  const avatarLetter = (store?.storeName || 'S').charAt(0).toUpperCase();
  const coverImage = store?.storeCoverImage
    ? store.storeCoverImage.startsWith('http')
      ? store.storeCoverImage
      : `${apiBase}${store.storeCoverImage}`
    : undefined;
  const profileImage = store?.storeProfileImage
    ? store.storeProfileImage.startsWith('http')
      ? store.storeProfileImage
      : `${apiBase}${store.storeProfileImage}`
    : undefined;

  const sections = useMemo(() => {
    const orderSrc = Array.isArray(store?.sectionsOrder) && store.sectionsOrder.length
      ? store.sectionsOrder
      : DEFAULT_SECTIONS;
    const visibility = store?.sectionsVisibility || {};
    const normalized = orderSrc.map(normalizeSectionKey);
    const unique = normalized.filter((key, idx) => normalized.indexOf(key) === idx);
    const filtered = unique.filter((key) => visibility[normalizeSectionKey(key)] !== false);
    const withoutReviews = filtered.filter((k) => normalizeSectionKey(k) !== 'reviews');
    const hasReviews = filtered.some((k) => normalizeSectionKey(k) === 'reviews');
    return hasReviews ? [...withoutReviews, 'reviews'] : withoutReviews;
  }, [store?.sectionsOrder, store?.sectionsVisibility]);

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  const featuredProducts = useMemo(() => {
    if (!store?.featuredProductIds?.length) return [];
    return products.filter((p) => store.featuredProductIds?.includes(p._id));
  }, [products, store?.featuredProductIds]);

  const reviewStats = useMemo(() => {
    const list = products.flatMap((p) =>
      (p.reviews || []).map((rev, idx) => {
        const userObj = (rev as any)?.user || {};
        const reviewerName = userObj.name || (rev as any)?.userName || (rev as any)?.name || 'User';
        const reviewerImage = userObj.profileImage || (rev as any)?.userImage || '';
        return {
          productId: p._id,
          productName: p.name,
          rating: rev?.rating ?? 0,
          comment: (rev as any)?.comment || '',
          createdAt: (rev as any)?.createdAt,
        image: p.images?.[0] ? resolveProductImageSource(p.images[0]) : PRODUCT_PLACEHOLDER,
          userName: reviewerName,
          userImage: reviewerImage,
          key: `${p._id}-${idx}`,
        };
      })
    );

    const ratings = list.map((r) => r.rating).filter((r) => typeof r === 'number');
    const count = list.length;
    const total = ratings.reduce((sum, r) => sum + (Number(r) || 0), 0);
    const avg = count ? total / count : 0;
    const sorted = [...list].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
    return { list: sorted, count, avg };
  }, [apiBase, products]);

  const saleTabProducts = useMemo(() => products.filter(isOnSale), [products]);

  const selectedSaleProducts = useMemo(() => {
    const ids = new Set(store?.saleProductIds || []);
    if (!ids.size) return [];
    return products.filter(p => ids.has(p._id) && isOnSale(p));
  }, [products, store?.saleProductIds]);

  const bestProducts = useMemo(() => {
    if (!products.length) return [];
    return [...products]
      .sort((a, b) => (soldCounts[b._id] ?? 0) - (soldCounts[a._id] ?? 0))
      .slice(0, 6);
  }, [products, soldCounts]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => (p.categories || []).forEach((c: any) => {
      if (!c) return;
      if (typeof c === 'string') set.add(c);
      else if (c._id) set.add(c._id);
      else if (c.name) set.add(c.name);
    }));
    return Array.from(set);
  }, [products]);

  const makeOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.make) set.add(p.make); });
    return Array.from(set);
  }, [products]);

  const modelOptions = useMemo(() => {
    const set = new Set<string>();
    products
      .filter(p => !prodMake || (p.make || '').toLowerCase() === prodMake.toLowerCase())
      .forEach(p => { if (p.carModel) set.add(p.carModel); });
    return Array.from(set);
  }, [products, prodMake]);

  const variantOptions = useMemo(() => {
    const set = new Set<string>();
    products
      .filter(p => !prodMake || (p.make || '').toLowerCase() === prodMake.toLowerCase())
      .filter(p => !prodModel || (p.carModel || '').toLowerCase() === prodModel.toLowerCase())
      .forEach(p => { if (p.variant) set.add(p.variant); });
    return Array.from(set);
  }, [products, prodMake, prodModel]);

  const parseYearRange = useCallback((raw?: any) => {
    const str = typeof raw === 'number' ? String(raw) : (raw || '').toString().trim();
    if (!str) return null;
    if (str.includes('-')) {
      const nums = str.split('-').map((s: any) => Number(s.trim())).filter((n: any) => Number.isFinite(n));
      if (!nums.length) return null;
      return { min: Math.min(...nums), max: Math.max(...nums) };
    }
    const num = Number(str);
    if (!Number.isFinite(num)) return null;
    return { min: num, max: num };
  }, []);

  const yearOptions = useMemo(() => {
    if (!prodMake) return [] as string[];
    const ranges = products
      .filter(p => !prodMake || (p.make || '').toLowerCase() === prodMake.toLowerCase())
      .filter(p => !prodModel || (p.carModel || '').toLowerCase() === prodModel.toLowerCase())
      .filter(p => !prodVariant || (p.variant || '').toLowerCase() === prodVariant.toLowerCase())
      .map(p => parseYearRange((p as any)?.year))
      .filter(Boolean) as { min: number; max: number }[];
    if (!ranges.length) return [] as string[];
    const min = Math.min(...ranges.map(r => r.min));
    const max = Math.max(...ranges.map(r => r.max));
    return [min === max ? String(min) : `${min}-${max}`];
  }, [products, prodMake, prodModel, prodVariant, parseYearRange]);

  const filteredMakes = useMemo(() => makeOptions.filter(m => m.toLowerCase().includes(makeSearch.toLowerCase())), [makeOptions, makeSearch]);
  const filteredModels = useMemo(() => {
    if (!prodMake) return [];
    return modelOptions.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase()));
  }, [modelOptions, modelSearch, prodMake]);
  const filteredVariants = useMemo(() => {
    if (!prodMake || !prodModel) return [];
    return variantOptions.filter(v => v.toLowerCase().includes(variantSearch.toLowerCase()));
  }, [variantOptions, variantSearch, prodMake, prodModel]);
  const filteredYears = useMemo(() => {
    if (!prodMake) return [];
    return yearOptions.filter(y => y.toLowerCase().includes(yearSearch.toLowerCase()));
  }, [yearOptions, yearSearch, prodMake]);
  const filteredCategories = useMemo(
    () => categoryOptions.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase())),
    [categoryOptions, categorySearch]
  );
  const hasProdFilters = useMemo(
    () => !!(prodMake || prodModel || prodVariant || prodYear || prodCategories.length),
    [prodMake, prodModel, prodVariant, prodYear, prodCategories]
  );

  const resetFilters = useCallback(() => {
    setProdMake('');
    setProdModel('');
    setProdVariant('');
    setProdYear('');
    setProdCategories([]);
    setMakeSearch('');
    setModelSearch('');
    setVariantSearch('');
    setYearSearch('');
    setCategorySearch('');
  }, []);

  const applyFilters = useCallback((list: Product[]) => {
    const filtered = list.filter(p => {
      if (prodMake && (p.make || '').toLowerCase() !== prodMake.toLowerCase()) return false;
      if (prodModel && (p.carModel || '').toLowerCase() !== prodModel.toLowerCase()) return false;
      if (prodVariant && (p.variant || '').toLowerCase() !== prodVariant.toLowerCase()) return false;
      if (prodYear) {
        const isRange = prodYear.includes('-');
        const yearNum = Number((p as any)?.year);
        if (isRange) {
          const [minStr, maxStr] = prodYear.split('-');
          const min = Number(minStr);
          const max = Number(maxStr);
          if (Number.isNaN(yearNum) || Number.isNaN(min) || Number.isNaN(max) || yearNum < min || yearNum > max) return false;
        } else if (String((p as any)?.year || '') !== prodYear) {
          return false;
        }
      }
      if (prodCategories.length) {
        const cats = (p.categories || []).map((c: any) => {
          if (!c) return '';
          if (typeof c === 'string') return c.toLowerCase();
          const id = c._id || c.id || c.name || '';
          return String(id).toLowerCase();
        });
        const match = prodCategories.some(sel => cats.includes(sel.toLowerCase()));
        if (!match) return false;
      }
      return true;
    });
    return filtered.sort((a, b) => ((b as any)?.itemsSold ?? 0) - ((a as any)?.itemsSold ?? 0));
  }, [prodMake, prodModel, prodVariant, prodYear, prodCategories]);

  const renderProductCard = ({ item }: { item: Product }) => {
    const image = item.images?.[0] ? resolveProductImageSource(item.images[0]) : PRODUCT_PLACEHOLDER;
    const vehicleLabel = [item.make, item.carModel, item.variant, (item as any)?.year].filter(Boolean).join(' ');
    return (
      <ProductCard
        name={item.name}
        image={image}
        numSolds={soldCounts[item._id] ?? (item as any)?.itemsSold ?? (item as any)?.stock ?? 0}
        price={item.price}
        salePrice={item.salePrice}
        rating={item.averageRating ?? item.rating ?? 0}
        vehicleLabel={vehicleLabel}
        onPress={() => navigation.navigate('cardetails', { id: item._id })}
      />
    );
  };

  const renderBanners = (banners: string[], key: string) => {
    if (!banners.length) return null;
    return (
      <View key={key} style={styles.sectionBlock}>
        <FlatList
          data={banners}
          horizontal
          keyExtractor={(uri, idx) => `${uri}-${idx}`}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          renderItem={({ item }) => (
            <Image
              source={resolveProductImageSource(item)}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          )}
        />
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={!!filterModalTab}
      animationType="slide"
      transparent
      onRequestClose={() => setFilterModalTab(null)}
    >
      <TouchableWithoutFeedback onPress={() => setFilterModalTab(null)}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>
      <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
            {filterModalTab === 'Sale' ? 'Filter Sale Products' : 'Filter Products'}
          </Text>
          <Text style={[styles.metaText, { color: COLORS.black }]}>
            {(filterModalTab === 'Sale' ? applyFilters(saleTabProducts) : applyFilters(products)).length} Product Found
          </Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.modalLabel]}>Make</Text>
          <TextInput
            style={[styles.searchInput, { borderColor: COLORS.grayscale200, color: colors.text, backgroundColor: COLORS.grayscale200 }]}
            placeholder="Search make"
            placeholderTextColor={COLORS.gray}
            value={makeSearch}
            onChangeText={setMakeSearch}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 , marginBottom: 16 }}>
            {[{ id: '', name: 'All' }, ...filteredMakes.map(m => ({ id: m, name: m }))].map(opt => {
              const active = prodMake === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id || 'all-make'}
                  onPress={() => {
                    setProdMake(active ? '' : opt.id);
                    setProdModel('');
                    setProdVariant('');
                    setProdYear('');
                  }}
                  style={[
                    styles.filterChip,
                    { borderColor: COLORS.black, backgroundColor: active ? COLORS.black : COLORS.white },
                  ]}
                >
                  <Text style={{ color: active ? COLORS.white : COLORS.black, fontFamily: 'medium' }}>{opt.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.modalLabel]}>Model</Text>
          <TextInput
            style={[styles.searchInput, { borderColor: COLORS.grayscale200, color: colors.text, backgroundColor: COLORS.grayscale200 }]}
            placeholder="Search model"
            placeholderTextColor={COLORS.gray}
            value={modelSearch}
            onChangeText={setModelSearch}
            editable={!!prodMake}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
            {(filteredModels.length ? filteredModels : (prodMake ? ['No models found'] : ['Select make first'])).map(opt => {
              const disabled = opt === 'Select make first' || opt === 'No models found' || !prodMake;
              const active = prodModel === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  disabled={disabled}
                  onPress={() => {
                    setProdModel(active ? '' : opt);
                    setProdVariant('');
                    setProdYear('');
                  }}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: COLORS.black,
                      backgroundColor: active ? COLORS.black : COLORS.white,
                      opacity: disabled ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: active ? COLORS.white : COLORS.black, fontFamily: 'medium' }}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.modalLabel]}>Variant</Text>
          <TextInput
            style={[styles.searchInput, { borderColor: COLORS.grayscale200, color: colors.text, backgroundColor: COLORS.grayscale200 }]}
            placeholder="Search variant"
            placeholderTextColor={COLORS.gray}
            value={variantSearch}
            onChangeText={setVariantSearch}
            editable={!!prodMake}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
            {(filteredVariants.length ? filteredVariants : (prodModel ? ['No variants found'] : ['Select model first'])).map(opt => {
              const disabled = opt === 'Select model first' || opt === 'No variants found' || !prodMake || !prodModel;
              const active = prodVariant === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  disabled={disabled}
                  onPress={() => {
                    setProdVariant(active ? '' : opt);
                    setProdYear('');
                  }}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: COLORS.black,
                      backgroundColor: active ? COLORS.black : COLORS.white,
                      opacity: disabled ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: active ? COLORS.white : COLORS.black, fontFamily: 'medium' }}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.modalLabel]}>Year</Text>
          <TextInput
            style={[styles.searchInput, { borderColor: COLORS.grayscale200, color: colors.text, backgroundColor: COLORS.grayscale200 }]}
            placeholder="Search year"
            placeholderTextColor={COLORS.gray}
            value={yearSearch}
            onChangeText={setYearSearch}
            editable={!!prodMake}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
            {(filteredYears.length ? filteredYears : (!prodMake ? ['Select make first'] : ['No years found'])).map(opt => {
              const disabled = opt === 'No years found' || opt === 'Select make first' || !prodMake;
              const active = prodYear === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  disabled={disabled}
                  onPress={() => setProdYear(active ? '' : opt)}
                  style={[
                    styles.filterChip,
                    {
                      borderColor: COLORS.black,
                      backgroundColor: active ? COLORS.black : COLORS.white,
                      opacity: disabled ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: active ? COLORS.white : COLORS.black, fontFamily: 'medium' }}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.modalLabel]}>Categories</Text>
          <TextInput
            style={[styles.searchInput, { borderColor: COLORS.grayscale200, color: colors.text, backgroundColor: COLORS.grayscale200 }]}
            placeholder="Search categories"
            placeholderTextColor={COLORS.gray}
            value={categorySearch}
            onChangeText={setCategorySearch}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
            {filteredCategories.map(opt => {
              const active = prodCategories.includes(opt);
              return (
                <TouchableOpacity
                  key={opt || 'cat'}
                  onPress={() => {
                    setProdCategories(prev =>
                      active ? prev.filter(c => c !== opt) : [...prev, opt]
                    );
                  }}
                  style={[
                    styles.filterChip,
                    { borderColor: COLORS.black, backgroundColor: active ? COLORS.black : COLORS.white },
                  ]}
                >
                  <Text style={{ color: active ? COLORS.white : COLORS.black, fontFamily: 'medium' }}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
            {filteredCategories.length === 0 && (
              <Text style={{ color: COLORS.gray, paddingVertical: 6 }}>No categories</Text>
            )}
          </ScrollView>
<View style={{ display: 'flex', flexDirection: 'row',  gap: 16}}  >
          {/* <TouchableOpacity
            style={[styles.filterButton, { marginTop: 8 }]}
            onPress={() => setFilterModalTab(null)}
          >
            <Text style={styles.filterButtonText}>Apply Filters</Text>
          </TouchableOpacity> */}
          <TouchableOpacity
            style={[styles.filterButton, { marginTop: 8, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.black }]}
            onPress={() => {
              resetFilters();
              setFilterModalTab(null);
            }}
          >
            <Text style={[styles.filterButtonText, { color: COLORS.black }]}>Reset</Text>
          </TouchableOpacity></View>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderSection = (sectionKey: string) => {
    const key = normalizeSectionKey(sectionKey);
    if (key === 'banner') {
      return renderBanners(store?.storeBanners || [], 'banner');
    }
    if (key === 'salesBanner') {
      return renderBanners(store?.storeSalesBanners || [], 'salesBanner');
    }
    if (key === 'featured' && featuredProducts.length) {
      return (
        <View key="featured" style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{SECTION_LABELS.featured}</Text>
          <FlatList
            data={featuredProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderProductCard}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12 }}
            scrollEnabled={false}
          />
        </View>
      );
    }
    if (key === 'sale' && selectedSaleProducts.length) {
      return (
        <View key="sale" style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{SECTION_LABELS.sale}</Text>
          <FlatList
            data={selectedSaleProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderProductCard}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12 }}
            scrollEnabled={false}
          />
        </View>
      );
    }
    if (key === 'best' && bestProducts.length) {
      return (
        <View key="best" style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{SECTION_LABELS.best}</Text>
          <FlatList
            data={bestProducts}
            keyExtractor={(item) => item._id}
            renderItem={renderProductCard}
            numColumns={2}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ gap: 12 }}
            scrollEnabled={false}
          />
        </View>
      );
    }
    if (key === 'reviews') {
      return (
        <View key="reviews" style={styles.sectionBlock}>
          <View style={[styles.reviewsHeader, { marginBottom: 8 }]}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{SECTION_LABELS.reviews}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <StarRating rating={reviewsAvg} size={16} />
                <Text style={[styles.text, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700, marginLeft: 6 }]}>
                  {reviewsAvg.toFixed(1)} • {reviewsCount} reviews
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('storereviews', { sellerId })}>
              <Text style={[styles.showAll, { color: COLORS.primary }]}>Show all reviews</Text>
            </TouchableOpacity>
          </View>
          {reviewStats.count ? (
            <>
              <FlatList
                ref={reviewSliderRef}
                data={reviewSlides}
                keyExtractor={(item) => item.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                  if (!Number.isNaN(idx)) setReviewSlideIndex(idx);
                }}
                renderItem={({ item }) => (
                  <View style={[styles.reviewCard, { backgroundColor: dark ? COLORS.dark3 : COLORS.silver, width: width - 32, marginRight: 12 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      {item.userImage ? (
                        <Image source={{ uri: item.userImage }} style={styles.userAvatar} />
                      ) : (
                        <View style={styles.userAvatarFallback}>
                          <Text style={styles.userAvatarText}>{item.userName.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={[styles.reviewName, { color: colors.text }]} numberOfLines={1}>
                          {item.userName}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <StarRating rating={item.rating} size={14} />
                          <Text style={[styles.reviewMeta, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
                            {item.createdAt ? `  ${formatDate(item.createdAt)}` : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {item.comment ? (
                      <Text style={[styles.reviewText, { color: colors.text }]} numberOfLines={3}>
                        {item.comment}
                      </Text>
                    ) : null}
                   
                  </View>
                )}
              />
            </>
          ) : (
            <Text style={[styles.placeholderText, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
              No reviews yet.
            </Text>
          )}
        </View>
      );
    }
    return null;
  };

  const isLoading = loadingStore || loadingProducts;
  const reviewsCount = (store?.reviewsCount ?? 0) || reviewStats.count || 0;
  const reviewsAvg = (store?.averageRating ?? 0) || reviewStats.avg || 0;
  const reviewSlides = useMemo(() => reviewStats.list.slice(0, 5), [reviewStats.list]);
  const renderedSections = sections.map(renderSection).filter(Boolean);

  useEffect(() => {
    reviewIndexRef.current = 0;
    setReviewSlideIndex(0);
    reviewSliderRef.current?.scrollToOffset({ offset: 0, animated: false });
    if (!reviewSlides.length) return;
    const interval = setInterval(() => {
      const next = (reviewIndexRef.current + 1) % reviewSlides.length;
      reviewIndexRef.current = next;
      setReviewSlideIndex(next);
      reviewSliderRef.current?.scrollToOffset({ offset: next * width, animated: true });
    }, 2000);
    return () => clearInterval(interval);
  }, [reviewSlides.length]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, embedded && styles.headerEmbedded]}>
            <TouchableOpacity onPress={() => {
              if (embedded && onClose) return onClose();
              navigation.goBack();
            }}>
              <Image source={icons.back} style={[styles.backIcon, { tintColor: colors.text }]} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{store?.storeName || 'Store'}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={styles.coverWrapper}>
              {coverImage ? (
                <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
              ) : (
                <View style={[styles.coverImage, styles.coverPlaceholder]} />
              )}
            </View>

            <View
              style={[
                styles.profileRow,
                {
                  backgroundColor: dark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.95)',
                  borderColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                },
              ]}
            >
            <View style={styles.logoWrapper}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.logo} resizeMode="cover" />
              ) : (
                <View style={[styles.logo, styles.logoFallback]}>
                  <Text style={styles.avatarText}>{avatarLetter}</Text>
                </View>
              )}
            </View>
            <View style={styles.infoContainer}>
              <Text style={[styles.storeName, { color: colors.text }]} numberOfLines={1}>
                {store?.storeName || 'Store'}
              </Text>
              <Text style={[styles.metaText, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
                {(store?.itemsSold ?? 0)} items sold
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <StarRating rating={reviewsAvg} size={16} />
                <TouchableOpacity onPress={() => navigation.navigate('storereviews', { sellerId })} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.ratingText, { color: colors.text }]}>
                    {reviewsAvg.toFixed(1)} ({reviewsCount} reviews)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.bioBlock}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 6 }]}>Store Bio:</Text>
            <Text style={[styles.text, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
              {store?.storeBio || 'No bio added yet.'}
            </Text>
          </View>

          <View style={styles.tabRow}>
            {(['Store', 'Products', 'Sale'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedTab(tab)}
                style={[styles.tabPill, selectedTab === tab && styles.tabPillActive]}
              >
                <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color={COLORS.primary} />
          ) : (
            <>
              {selectedTab === 'Store' && (
                <View style={{ paddingHorizontal: 16, gap: 16 }}>
                  {renderedSections.length ? (
                    renderedSections
                  ) : (
                    <Text style={[styles.text, { color: colors.text }]}>No store sections configured yet.</Text>
                  )}
                </View>
              )}

              {selectedTab === 'Products' && (
                <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      style={[styles.filterButtonMain, hasProdFilters && styles.filterButtonHalf]}
                      onPress={() => setFilterModalTab('Products')}
                    >
                      <Text style={styles.filterButtonTextMain}>Filter Products</Text>
                    </TouchableOpacity>
                    {hasProdFilters && (
                      <TouchableOpacity
                        style={[styles.filterButtonMain, styles.resetButton, styles.filterButtonHalf]}
                        onPress={resetFilters}
                      >
                        <Text style={[styles.filterButtonTextMain, { color: COLORS.black }]}>Reset</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {products.length === 0 ? (
                    <Text style={[styles.text, { color: colors.text }]}>No products available.</Text>
                  ) : (
                    <FlatList
                      data={applyFilters(products)}
                      keyExtractor={(item) => item._id}
                      renderItem={renderProductCard}
                      numColumns={2}
                      columnWrapperStyle={{ gap: 12 }}
                      contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
                      scrollEnabled={false}
                    />
                  )}
                </View>
              )}

              {selectedTab === 'Sale' && (
                <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      style={[styles.filterButtonMain, hasProdFilters && styles.filterButtonHalf]}
                      onPress={() => setFilterModalTab('Sale')}
                    >
                      <Text style={styles.filterButtonTextMain}>Filter Sale Products</Text>
                    </TouchableOpacity>
                    {hasProdFilters && (
                      <TouchableOpacity
                        style={[styles.filterButtonMain, styles.resetButton, styles.filterButtonHalf]}
                        onPress={resetFilters}
                      >
                        <Text style={[styles.filterButtonTextMain, { color: COLORS.black }]}>Reset</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {saleTabProducts.length === 0 ? (
                    <Text style={[styles.text, { color: colors.text }]}>No sale products.</Text>
                  ) : (
                    <FlatList
                      data={applyFilters(saleTabProducts)}
                      keyExtractor={(item) => item._id}
                      renderItem={renderProductCard}
                      numColumns={2}
                      columnWrapperStyle={{ gap: 12 }}
                      contentContainerStyle={{ gap: 12, paddingBottom: 12 }}
                      scrollEnabled={false}
                    />
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
    {renderFilterModal()}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 18,
  },
  headerEmbedded: {
    paddingTop: 60,
  },
  backIcon: { width: 24, height: 24 },
  headerTitle: { fontSize: 20, fontFamily: 'bold' },
  coverWrapper: {
    position: 'relative',
    width: width,
    height: height * 0.27,
    marginBottom: 12,
    paddingHorizontal: 6
  },
  coverImage: { width: '100%', height: '100%', borderRadius: 16 },
  coverPlaceholder: { backgroundColor: COLORS.silver },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 20,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 0,
    elevation: 4,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginTop: -80,
    borderWidth: 3,
    borderColor: COLORS.black,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  logo: { width: '100%', height: '100%' },
  logoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black },
  avatarText: { fontSize: 28, fontFamily: 'bold', color: COLORS.white },
  infoContainer: { flex: 1, gap: 6, marginTop: -16},
  storeName: { fontSize: 22, fontFamily: 'bold' },
  metaText: { fontSize: 14, fontFamily: 'medium' },
  ratingText: { fontSize: 14, fontFamily: 'medium' },
  bioBlock: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionBlock: { gap: 10 },
  sectionTitle: { marginTop: 20, fontSize: 18, fontFamily: 'bold', textAlign: 'left' },
  text: { fontSize: 15, fontFamily: 'regular' },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewCard: {
    padding: 12,
    borderRadius: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.silver,
  },
  userAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { color: COLORS.white, fontFamily: 'bold', fontSize: 16 },
  reviewName: { fontFamily: 'bold', fontSize: 14 },
  reviewMeta: { fontFamily: 'regular', fontSize: 12 },
  reviewText: { fontFamily: 'regular', fontSize: 13 },
  reviewProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  reviewProductImage: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.silver },
  reviewProductName: { fontFamily: 'regular', fontSize: 12 },
  showAll: { fontFamily: 'medium', fontSize: 13 },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 12,
    gap: 10,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.black,
    backgroundColor: COLORS.white,
  },
  tabPillActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  tabText: { fontSize: 14, fontFamily: 'semiBold', color: COLORS.black },
  tabTextActive: { color: COLORS.white },
  bannerImage: {
    width: width - 32,
    height: 200,
    borderRadius: 12,
    backgroundColor: COLORS.silver,
  },
  placeholderText: { fontSize: 14, fontFamily: 'regular' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.black,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  filterButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.black,
    marginBottom: 12,
    width: '100%',
  },  
  filterButtonMain: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.transparentWhite,
    borderWidth: 1,
    borderColor: COLORS.black,
    marginBottom: 12,
    width: '100%',
  },
  filterButtonHalf: {
    width: '48%',
  },
  resetButton: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.black,
    borderWidth: 1,
  },
  filterButtonText: {
    color: COLORS.white,
    fontFamily: 'bold',
    fontSize: 14,
  },
    filterButtonTextMain: {
    color: COLORS.black,
    fontFamily: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: height * 0.65,
  },
  modalLabel: {
    fontFamily: 'semiBold',
    color: COLORS.black,
    marginBottom: 6,
  },
});

export default StorePreview;
