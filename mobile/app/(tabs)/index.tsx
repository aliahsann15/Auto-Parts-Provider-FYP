import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, TextInput, ListRenderItemInfo, Alert, DeviceEventEmitter, RefreshControl } from 'react-native';
import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, icons, images, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { ratings, categoriesByParts, sorts, categories } from '@/data';
import { useAuth } from '@/app/context/AuthContext';
import { fetchCategories, fetchPublicProducts, Category as ApiCategory, Product } from '@/utils/api/products';
import { images as imageAssets } from '@/constants';
import { API_BASE_URL } from '@/utils/api/client';
import useWishlist from '@/hooks/useWishlist';



const banners: BannerItem[] = [
  {
    id: 1,
    discount: "20%",
    discountName: "Summer Sale",
    bottomTitle: "Limited Time Offer",
    bottomSubtitle: "Shop Now",
  },
  {
    id: 2,
    discount: "30%",
    discountName: "Winter Sale",
    bottomTitle: "Exclusive Deals",
    bottomSubtitle: "Don't Miss Out",
  },
];
import SubHeaderItem from '@/components/SubHeaderItem';
import Category from '@/components/Category';
import ProductCard from '@/components/ProductCard';
import { NavigationProp } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import CartPopup from '@/components/MiniCart';
import { FontAwesome } from '@expo/vector-icons';
import RBSheet from 'react-native-raw-bottom-sheet';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import Button from '@/components/Button';
import { fetchNotifications } from '@/utils/api/notifications';
import { fetchCarMakes } from '@/utils/api/carData';
import { getCart } from '@/utils/api/cart';

interface BannerItem {
  id: number;
  discount: string;
  discountName: string;
  bottomTitle: string;
  bottomSubtitle: string;
}
interface SliderHandleProps {
  enabled: boolean;
  markerStyle: object;
}
const Home = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { dark, colors } = useTheme();
  const refRBSheet = useRef<any>(null);
  const [filterCategories, setFilterCategories] = useState(["all"]);
  const [selectedSorts, setSelectedSorts] = useState(["1"]);
  const [selectedRating, setSelectedRating] = useState(["1"]);
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popularSelectedCategories, setPopularSelectedCategories] = useState(["all"]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const [cartVisible, setCartVisible] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const apiBase = API_BASE_URL.replace(/\/api$/, '');
  const loadCartCount = useCallback(async () => {
    if (!token) {
      setCartCount(0);
      return;
    }
    try {
      const res = await getCart(token);
      const count = (res?.items || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  }, []);
  const { user, token } = useAuth();
  const { isInWishlist, toggle: toggleWishlist, isUpdatingId, items: wishlistItems, refresh: refreshWishlist } = useWishlist();
  const normalizeCategoryIds = useCallback((cats: any[] | undefined) => {
    return (cats || [])
      .map(cat => {
        if (!cat) return '';
        if (typeof cat === 'string') return cat;
        if (typeof cat === 'object') {
          const obj: any = cat;
          if (obj._id) return String(obj._id);
          if (obj.id) return String(obj.id);
          if (obj.slug) return String(obj.slug);
          if (obj.name) return String(obj.name);
        }
        return String(cat);
      })
      .filter(Boolean)
      .map(s => s.toLowerCase());
  }, []);
  const categoryChips = React.useMemo(() => {
    if (apiCategories.length) {
      return [
        { id: 'all', name: 'All' },
        ...apiCategories.map(c => ({ id: String(c._id), name: c.name })),
      ];
    }

    const productCategoryIds = Array.from(
      new Set(products.flatMap(p => normalizeCategoryIds((p as any).categories)))
    );
    if (productCategoryIds.length) {
      return [
        { id: 'all', name: 'All' },
        ...productCategoryIds.map((id, idx) => ({
          id,
          name: categoriesByParts[idx + 1]?.name || `Category ${idx + 1}`,
        })),
      ];
    }

    const fallback = categoriesByParts
      .filter(c => c.name.toLowerCase() !== 'all')
      .map(c => ({
        id: c.id === '0' ? 'all' : String(c.id),
        name: c.name,
      }));
    return [{ id: 'all', name: 'All' }, ...fallback];
  }, [apiCategories, products, normalizeCategoryIds]);
  const selectedCategoryTokens = useMemo(() => {
    const tokens: string[] = [];
    popularSelectedCategories.forEach(id => {
      const match = categoryChips.find(c => c.id === id);
      if (id) tokens.push(id.toLowerCase());
      if (match?.name) tokens.push(match.name.toLowerCase());
    });
    return Array.from(new Set(tokens.filter(Boolean)));
  }, [popularSelectedCategories, categoryChips]);
  const handleSliderChange = (values: number[]) => {
    setPriceRange(values);
  };
  const { isLoggedIn } = useAuth();
  const interests = useMemo(() => {
    if (!Array.isArray(user?.interests)) return [];
    return user.interests
      .flatMap((i: any) => {
        if (!i) return [];
        if (typeof i === 'string') return [i];
        if (typeof i === 'object') return [i.name, i.make, i.slug, i.id, i._id];
        return [String(i)];
      })
      .filter(Boolean)
      .map(v => String(v).toLowerCase().trim());
  }, [user]);

  const productMatchesInterest = useCallback(
    (p: any) => {
      if (!interests.length) return false;
      const candidates = [
        p?.make,
        p?.makeId,
        p?.makeSlug,
        p?.brand,
        p?.company,
      ]
        .filter(Boolean)
        .map((v: any) => String(v).toLowerCase().trim());
      return candidates.some(c => interests.includes(c));
    },
    [interests]
  );

  const prioritizeByInterest = useCallback(
    (list: Product[]) => {
      if (!interests.length) return list;
      const matches: Product[] = [];
      const others: Product[] = [];
      list.forEach((p: any) => {
        if (productMatchesInterest(p)) {
          matches.push(p);
        } else {
          others.push(p);
        }
      });
      return [...matches, ...others];
    },
    [interests, productMatchesInterest]
  );

  const topDeals = useMemo(() => {
    const saleProducts = products.filter(
      p => typeof p.salePrice === 'number' && p.salePrice < (p.price || p.salePrice || 0)
    );
    const prioritized = prioritizeByInterest(saleProducts);
    return prioritized.slice(0, 12);
  }, [products, prioritizeByInterest]);

  // Color palette for makes
  const makesColors = [
    { iconColor: 'rgba(51, 94, 247, 1)', backgroundColor: 'rgba(51, 94, 247, .12)' }, // Mercedes - Blue
    { iconColor: 'rgba(255, 152, 31, 1)', backgroundColor: 'rgba(255, 152, 31, .12)' }, // Tesla - Orange
    { iconColor: 'rgba(26, 150, 240, 1)', backgroundColor: 'rgba(26, 150, 240,.12)' },  // BMW - Light Blue
    { iconColor: 'rgba(255, 192, 45, 1)', backgroundColor: 'rgba(255, 192, 45,.12)' }, // Toyota - Yellow
    { iconColor: 'rgba(245, 67, 54, 1)', backgroundColor: 'rgba(245, 67, 54,.12)' },   // Volvo - Red
    { iconColor: 'rgba(74, 175, 87, 1)', backgroundColor: 'rgba(74, 175, 87,.12)' },   // Bugatti - Green
    { iconColor: 'rgba(0, 188, 211, 1)', backgroundColor: 'rgba(0, 188, 211,.12)' },   // Honda - Cyan
  ];

  // Get icon for a make slug
  const getIconForMake = (slug: string) => {
    switch (slug.toLowerCase()) {
      case 'mercedes': return icons.mercedes;
      case 'tesla': return icons.tesla;
      case 'bmw': return icons.bmw;
      case 'toyota': return icons.toyota;
      case 'volvo': return icons.volvo;
      case 'bugatti': return icons.bugatti;
      case 'honda': return icons.honda;
      default: return icons.more2;
    }
  };

  // Get color for a make by index
  const getColorForMake = (index: number) => {
    return makesColors[index % makesColors.length];
  };

  const CustomSliderHandle: React.FC<SliderHandleProps> = ({ enabled, markerStyle }) => {
    return (
      <View
        style={[
          markerStyle,
          {
            backgroundColor: enabled ? COLORS.primary : 'lightgray',
            borderColor: 'white',
            borderWidth: 2,
            borderRadius: 10,
            width: 20,
            height: 20,
          },
        ]}
      />
    );
  };
  const handleToggleWishlist = useCallback(
    async (productId: string) => {
      try {
        await toggleWishlist(productId);
        navigation.navigate('mywishlist');
      } catch (err: any) {
        Alert.alert('Login required', err?.message || 'Please sign in to manage your wishlist.');
      }
    },
    [toggleWishlist]
  );

  // Toggle sort selection
  const toggleSort = (sortId: string) => {
    const updatedSorts = [...selectedSorts];
    const index = updatedSorts.indexOf(sortId);

    if (index === -1) {
      updatedSorts.push(sortId);
    } else {
      updatedSorts.splice(index, 1);
    }

    setSelectedSorts(updatedSorts);
  };

  // toggle rating selection
  const toggleRating = (ratingId: string) => {
    const updatedRatings = [...selectedRating];
    const index = updatedRatings.indexOf(ratingId);

    if (index === -1) {
      updatedRatings.push(ratingId);
    } else {
      updatedRatings.splice(index, 1);
    }

    setSelectedRating(updatedRatings);
  };

  // Sort item
  const renderSortItem = ({ item }: { item: { id: string; name: string } }) => (
    <TouchableOpacity
      style={{
        backgroundColor: selectedSorts.includes(item.id) ? COLORS.primary : "transparent",
        padding: 10,
        marginVertical: 5,
        borderColor: COLORS.primary,
        borderWidth: 1.3,
        borderRadius: 24,
        marginRight: 12,
      }}
      onPress={() => toggleSort(item.id)}>

      <Text style={{
        color: selectedSorts.includes(item.id) ? COLORS.white : COLORS.primary
      }}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderRatingItem = ({ item }: { item: { id: string; title: string } }) => (
    <TouchableOpacity
      style={{
        backgroundColor: selectedRating.includes(item.id) ? COLORS.primary : "transparent",
        paddingHorizontal: 16,
        paddingVertical: 6,
        marginVertical: 5,
        borderColor: COLORS.primary,
        borderWidth: 1.3,
        borderRadius: 24,
        marginRight: 12,
        flexDirection: "row",
        alignItems: "center",
      }}
      onPress={() => toggleRating(item.id)}>
      <View style={{ marginRight: 6 }}>
        <FontAwesome name="star" size={14} color={selectedRating.includes(item.id) ? COLORS.white : COLORS.primary} />
      </View>
      <Text style={{
        color: selectedRating.includes(item.id) ? COLORS.white : COLORS.primary
      }}>{item.title}</Text>
    </TouchableOpacity>
  );
  /**
   * fetch categories and products
   */
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoadingCategories(true);
        const cats = await fetchCategories();
        const makeRes = await fetchCarMakes();
        const makeList = Array.isArray((makeRes as any)?.makes) ? (makeRes as any).makes : [];
        setApiCategories(cats);
        setMakes(makeList);
      } catch (err: any) {
        setError(err?.message || 'Failed to load categories');
      } finally {
        setLoadingCategories(false);
      }
    };
    load();
  }, []);

  const pageRef = useRef(1);

  React.useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const loadProducts = useCallback(async (pageToLoad: number = 1, append = false) => {
    if (loadingRef.current) return;
    if (append && !hasMoreRef.current) return;

    try {
      loadingRef.current = true;
      append ? setLoadingMoreProducts(true) : setLoadingProducts(true);

      const res = await fetchPublicProducts({ limit, page: pageToLoad, sort: 'popular' });
      const list = (res.products || []).filter(p => (p.status || 'active').toLowerCase() === 'active');

      const pagination = (res as any).pagination || {};
      const total = pagination.total;
      const totalPages = pagination.totalPages;

      setProducts(prev => (append ? [...prev, ...list] : list));

      const nextPage = pagination.page ?? pageToLoad;
      setPage(nextPage);

      // Better hasMore logic
      const more =
        typeof total === 'number'
          ? pageToLoad * limit < total
          : typeof totalPages === 'number'
            ? pageToLoad < totalPages
            : list.length === limit;

      setHasMore(more);
      hasMoreRef.current = more;

    } catch (err: any) {
      if (!append) setProducts([]);
      setError(err?.message || 'Failed to load products');
    } finally {
      append ? setLoadingMoreProducts(false) : setLoadingProducts(false);
      loadingRef.current = false;
    }
  }, [limit]);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadProducts(1, false);
      setPage(1);
      await refreshWishlist();
    } finally {
      setRefreshing(false);
    }
  }, [loadProducts, refreshWishlist]);


  React.useEffect(() => {
    loadProducts(1, false);
  }, []);

  React.useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const loadNotifications = useCallback(async () => {
    try {
      if (!isLoggedIn) {
        setNotificationCount(0);
        return;
      }
      const res = await fetchNotifications(token as string);
      const items = (res as any).items || (res as any).data || [];
      const unread = items.filter((n: any) => !n.isRead);
      setNotificationCount(unread.length);
    } catch {
      setNotificationCount(0);
    }
  }, [isLoggedIn, token]);

  React.useEffect(() => {
    loadNotifications();
    loadCartCount();
  }, [loadNotifications, loadCartCount]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('notifications:updated', (payload: any) => {
      if (typeof payload?.unreadCount === 'number') {
        setNotificationCount(payload.unreadCount);
        return;
      }
      loadNotifications();
    });
    return () => sub.remove();
  }, [loadNotifications]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('notifications:badge', (payload: any) => {
      if (typeof payload?.unreadCount === 'number') {
        setNotificationCount(payload.unreadCount);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('cart:updated', () => {
      loadCartCount();
    });
    return () => sub.remove();
  }, [loadCartCount]);

  /**
  * Render header
  */
  const renderHeader = () => {
    const displayName = user?.name || 'User';
    const greeting = (() => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const pk = new Date(utc + 5 * 60 * 60000);
      const hour = pk.getHours();
      if (hour < 12) return 'Good Morning';
      if (hour < 17) return 'Good Afternoon';
      if (hour < 21) return 'Good Evening';
      return 'Good Night';
    })();

    const renderAvatar = () => {
      if (user?.profileImage) {
        return (
          <Image
            source={{ uri: user.profileImage }}
            resizeMode='cover'
            style={styles.userIcon}
          />
        );
      }
      const initial = displayName.charAt(0).toUpperCase();
      return (
        <View style={[styles.userIcon, { backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: COLORS.white, fontFamily: 'bold', fontSize: 18 }}>{initial}</Text>
        </View>
      );
    };

    return (
      <View style={styles.headerContainer}>
        <View style={styles.viewLeft}>
          {renderAvatar()}
          <View style={styles.viewNameContainer}>
            <Text style={styles.greeeting}>{greeting} 👋</Text>
            <Text style={[styles.title, {
              color: dark ? COLORS.white : COLORS.greyscale900
            }]}>{displayName}</Text>
          </View>
        </View>
        <View style={styles.viewRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate("notifications")}>
            <View>
              <Image
                source={icons.notificationBell2}
                resizeMode='contain'
                style={[styles.bellIcon, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]}
              />
              {notificationCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {Math.min(notificationCount, 99)}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("mywishlist")}>
            <Image
              source={icons.heartOutline}
              resizeMode='contain'
              style={[styles.bookmarkIcon, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCartVisible(true)}
            style={{ position: 'relative' }}>
            <Image
              source={icons.cartOutline}
              resizeMode='contain'
              style={[styles.cartIcon, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]}
            />
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          </TouchableOpacity>
          <CartPopup
            visible={cartVisible}
            onClose={() => setCartVisible(false)}
            onCartCountChange={setCartCount}
          />
        </View>
      </View>
    )
  }

  const renderHeaderGuest = () => {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.viewLeft}>
          <Image
            source={images.guest}
            resizeMode='contain'
            style={styles.userIcon}
          />
          <View style={styles.viewNameContainer}>
            <Text style={styles.greeeting}>Good Morning👋</Text>
            <Text style={[styles.title, {
              color: dark ? COLORS.white : COLORS.greyscale900
            }]}>Hello Guest!</Text>
          </View>
        </View>
        <View style={styles.viewRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate("login")}>
            <Image
              source={icons.logout}
              resizeMode='contain'
              style={[styles.bellIcon, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]}
            />

          </TouchableOpacity>

        </View>
      </View>
    )
  }

  /**
  * Render search bar
  */
  const renderSearchBar = () => {

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("search")}
        style={[styles.searchBarContainer, {
          backgroundColor: dark ? COLORS.dark2 : "#F5F5F5"
        }]}>
        <TouchableOpacity>
          <Image
            source={icons.search2}
            resizeMode='contain'
            style={styles.searchIcon}
          />
        </TouchableOpacity>
        <TextInput
          placeholder='Search'
          placeholderTextColor={COLORS.gray}
          style={styles.searchInput}
          editable={false}
          pointerEvents="none"
        />
        {/* filter icon intentionally removed from search field on index screen */}
      </TouchableOpacity>
    )
  }

  const renderBannerItem = ({ item }: ListRenderItemInfo<BannerItem>) => (
    <View style={[styles.bannerContainer, {
      backgroundColor: dark ? COLORS.dark3 : COLORS.secondary
    }]}>
      <View style={styles.bannerTopContainer}>
        <View>
          <Text style={[styles.bannerDicount, {
            color: dark ? COLORS.white : COLORS.black,
          }]}>{item.discount} OFF</Text>
          <Text style={[styles.bannerDiscountName, {
            color: dark ? COLORS.white : COLORS.black
          }]}>{item.discountName}</Text>
        </View>
        <Text style={[styles.bannerDiscountNum, {
          color: dark ? COLORS.white : COLORS.black
        }]}>{item.discount}</Text>
      </View>
      <View style={styles.bannerBottomContainer}>
        <Text style={[styles.bannerBottomTitle, {
          color: dark ? COLORS.white : COLORS.black
        }]}>{item.bottomTitle}</Text>
        <Text style={[styles.bannerBottomSubtitle, {
          color: dark ? COLORS.white : COLORS.black
        }]}>{item.bottomSubtitle}</Text>
      </View>
    </View>
  );

  const keyExtractor = (item: { id: number | string }) => item.id.toString();

  const handleEndReached = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
  };

  const handleLoadMore = useCallback(() => {
    if (!hasMoreRef.current || loadingRef.current) return;
    loadProducts(pageRef.current + 1, true);
  }, [loadProducts]);

  const renderDot = (index: number) => {
    return (
      <View
        style={[styles.dot, index === currentIndex ? styles.activeDot : null]}
        key={index}
      />
    );
  };

  /**
  * Render banner
  */
  const renderBanner = () => {
    return (
      <View style={[styles.bannerItemContainer, {
        backgroundColor: dark ? COLORS.dark3 : COLORS.secondary
      }]}>
        <FlatList
          data={banners}
          renderItem={renderBannerItem}
          keyExtractor={keyExtractor}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(
              event.nativeEvent.contentOffset.x / SIZES.width
            );
            setCurrentIndex(newIndex);
          }}
        />
        <View style={styles.dotContainer}>
          {banners.map((_, index) => renderDot(index))}
        </View>
      </View>
    )
  }

  /**
  * Render categories
  */
  const renderCategories = () => {
    const topCompanies = makes.slice(0, 6).map((make) => ({
      id: make,
      name: make,
      slug: String(make).toLowerCase(),
    }));

    if (topCompanies.length === 0) {
      return null;
    }

    return (
      <View>
        <SubHeaderItem
          title="Top Makes"
          navTitle="See all"
          onPress={() => navigation.navigate("categories")}
        />
        <FlatList
          data={topCompanies}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 24,
                borderWidth: 1.3,
                borderColor: dark ? COLORS.dark3 : COLORS.primary,
                backgroundColor: dark ? COLORS.dark2 : 'transparent',
              }}
              onPress={() => navigation.navigate('company', { slug: item.slug })}
            >
              <Text style={{ color: dark ? COLORS.white : COLORS.primary, fontFamily: 'medium' }}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    )
  }

  /**
   * render popular products
   */
  const filteredProducts = useMemo(() => {
    const base = prioritizeByInterest(products);
    const byCategory = base.filter(product => {
      if (popularSelectedCategories.includes("all")) return true;
      const productCategoryIds = normalizeCategoryIds((product as any).categories);
      return productCategoryIds.some(catId => selectedCategoryTokens.includes(catId));
    });

    return prioritizeByInterest(byCategory).slice(0, 12);
  }, [products, popularSelectedCategories, selectedCategoryTokens, normalizeCategoryIds, prioritizeByInterest]);

  // Toggle category selection, keeping "all" exclusive for clarity
  const toggleCategory = (categoryId: string) => {
    setPopularSelectedCategories(prev => {
      if (categoryId === 'all') return ['all'];

      const withoutAll = prev.filter(id => id !== 'all');
      if (withoutAll.includes(categoryId)) {
        const next = withoutAll.filter(id => id !== categoryId);
        return next.length ? next : ['all'];
      }
      return [...withoutAll, categoryId];
    });
  };

  // Category item
  const renderCategoryItem = ({ item }: { item: { id: string; name: string } }) => (
    <TouchableOpacity
      style={{
        backgroundColor: popularSelectedCategories.includes(item.id) ? dark ? COLORS.dark3 : COLORS.primary : "transparent",
        padding: 10,
        marginVertical: 5,
        borderColor: dark ? COLORS.dark3 : COLORS.primary,
        borderWidth: 1.3,
        borderRadius: 24,
        marginRight: 12,
      }}
      onPress={() => toggleCategory(item.id)}>
      <Text style={{
        color: popularSelectedCategories.includes(item.id) ? COLORS.white : dark ? COLORS.white : COLORS.primary
      }}>{item.name}</Text>
    </TouchableOpacity>
  );
  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {isLoggedIn ? renderHeader() : renderHeaderGuest()}


        <FlatList
          data={filteredProducts}
          keyExtractor={item => item._id || (item as any).id}
          numColumns={2}
          columnWrapperStyle={{ gap: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          onEndReached={() => {
            if (!hasMoreRef.current || loadingRef.current) return;
            loadProducts((page || 1) + 1, true);
          }}
          onEndReachedThreshold={0.2}
          ListHeaderComponent={
            <View>
              {error ? (
                <Text style={{ color: COLORS.red, marginVertical: 8 }}>{error}</Text>
              ) : null}
              {renderSearchBar()}
              {renderBanner()}
              {renderCategories()}
              <SubHeaderItem
                title="Top Categories"
                navTitle="See All"
                onPress={() => navigation.navigate("topcategories")}
              />
              <FlatList
                data={categoryChips}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                horizontal
                renderItem={renderCategoryItem}
                contentContainerStyle={{ paddingBottom: 12 }}
              />
              <View style={{ backgroundColor: dark ? COLORS.dark1 : COLORS.white, marginVertical: 16 }} />
            </View>
          }
          ListFooterComponent={() => (
            <View>
              {loadingMoreProducts && hasMore && filteredProducts.length ? (
                <Text style={{ color: dark ? COLORS.white : COLORS.black, paddingVertical: 12, textAlign: 'center' }}>Loading more...</Text>
              ) : null}
              {topDeals.length > 0 && (
                <View style={{ marginTop: 12, marginBottom: 24 }}>
                  <SubHeaderItem
                    title="Top Deals"
                    navTitle="See All"
                    onPress={() => navigation.navigate("topdeals")}
                  />
                  <FlatList
                    data={topDeals}
                    keyExtractor={item => item._id || (item as any).id}
                    numColumns={2}
                    columnWrapperStyle={{ gap: 12 }}
                    scrollEnabled={false}
                    renderItem={({ item }) => {
                      const firstImage = item.images?.[0];
                      const resolvedImage =
                        firstImage?.startsWith('http')
                          ? firstImage
                          : firstImage
                            ? `${apiBase}${firstImage}`
                            : imageAssets.bmw1;
                           
                      const rating = item.reviews && item.reviews.length
                        ? item.reviews.reduce((sum: number, r: any) => sum + (r?.rating || 0), 0) / item.reviews.length
                        : (item as any).averageRating || 0;
                      const vehicleLabel = [item.make, item.carModel, item.variant, item.year].filter(Boolean).join(' ');
                      return (
                        <View style={{ flex: 1, marginBottom: 12 }}>
                          <ProductCard
                            name={item.name}
                            image={resolvedImage}
                            numSolds={(item as any)?.itemsSold ?? item.stock ?? 0}
                            rating={Number.isFinite(rating) ? Number(rating.toFixed(1)) : 0}
                            price={item.price}
                            salePrice={item.salePrice}
                            vehicleLabel={vehicleLabel}
                            onPress={() => navigation.navigate("cardetails", { id: item._id })}
                            isWishlisted={isInWishlist(item._id)}
                            onToggleWishlist={() => handleToggleWishlist(item._id)}
                            wishlistLoading={isUpdatingId === item._id}
                      />
                    </View>
                  )
                }}
              />
            </View>
          )}
            </View>
          )}
          extraData={[wishlistItems, isUpdatingId]}
          renderItem={({ item }) => {
            const firstImage = item.images?.[0];
            const resolvedImage =
              firstImage?.startsWith('http')
                ? firstImage
                : firstImage
                  ? `${apiBase}${firstImage}`
                  : imageAssets.bmw1;
                
            const rating = item.reviews && item.reviews.length
              ? item.reviews.reduce((sum: number, r: any) => sum + (r?.rating || 0), 0) / item.reviews.length
              : (item as any).averageRating || 0;
            const vehicleLabel = [item.make, item.carModel, item.variant, item.year].filter(Boolean).join(' ');
            return (
              <ProductCard
                name={item.name}
                image={resolvedImage}
                numSolds={(item as any)?.itemsSold ?? item.stock ?? 0}
                rating={Number.isFinite(rating) ? Number(rating.toFixed(1)) : 0}
                price={item.price}
                salePrice={item.salePrice}
                vehicleLabel={vehicleLabel}
                onPress={() => navigation.navigate("cardetails", { id: item._id })}
                isWishlisted={isInWishlist(item._id)}
                onToggleWishlist={() => handleToggleWishlist(item._id)}
                wishlistLoading={isUpdatingId === item._id}
              />
            )
          }}
          ListEmptyComponent={
            loadingProducts ? (
              <Text style={{ color: dark ? COLORS.white : COLORS.black, paddingVertical: 12, textAlign: 'center' }}>Loading products...</Text>
            ) : (
              <Text style={{ color: dark ? COLORS.white : COLORS.black, paddingVertical: 12, textAlign: 'center' }}>No products found.</Text>
            )
          }
        />
        <RBSheet
          ref={refRBSheet}
          closeOnPressMask={true}
          height={580}
          customStyles={{
            wrapper: {
              backgroundColor: "rgba(0,0,0,0.5)",
            },
            draggableIcon: {
              backgroundColor: dark ? COLORS.dark3 : "#000",
            },
            container: {
              borderTopRightRadius: 32,
              borderTopLeftRadius: 32,
              height: 580,
              backgroundColor: dark ? COLORS.dark2 : COLORS.white,
              alignItems: "center",
            }
          }}>
          <Text style={[styles.bottomTitle, {
            color: dark ? COLORS.white : COLORS.greyscale900
          }]}>Filter</Text>
          <View style={styles.separateLine} />
          <View style={{ width: SIZES.width - 32 }}>
            <Text style={[styles.sheetTitle, {
              color: dark ? COLORS.white : COLORS.greyscale900
            }]}>Category</Text>
            <FlatList
              data={categoryChips}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              horizontal
              renderItem={renderCategoryItem}
            />
            <Text style={[styles.sheetTitle, {
              color: dark ? COLORS.white : COLORS.greyscale900
            }]}>Filter</Text>
            <MultiSlider
              values={priceRange}
              sliderLength={SIZES.width - 32}
              onValuesChange={handleSliderChange}
              min={0}
              max={100}
              step={1}
              allowOverlap={false}
              snapped
              minMarkerOverlapDistance={40}
              customMarker={CustomSliderHandle}
              selectedStyle={{ backgroundColor: COLORS.primary }}
              unselectedStyle={{ backgroundColor: 'lightgray' }}
              containerStyle={{ height: 40 }}
              trackStyle={{ height: 3 }}
            />
            <Text style={[styles.sheetTitle, {
              color: dark ? COLORS.white : COLORS.greyscale900
            }]}>Sort by</Text>
            <FlatList
              data={sorts}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              horizontal
              renderItem={renderSortItem}
            />
            <Text style={[styles.sheetTitle, {
              color: dark ? COLORS.white : COLORS.greyscale900
            }]}>Rating</Text>
            <FlatList
              data={ratings}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              horizontal
              renderItem={renderRatingItem}
            />
          </View>

          <View style={styles.separateLine} />

          <View style={styles.bottomContainer}>
            <Button
              title="Reset"
              style={{
                width: (SIZES.width - 32) / 2 - 8,
                backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                borderRadius: 32,
                borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary
              }}
              textColor={dark ? COLORS.white : COLORS.primary}
              onPress={() => refRBSheet.current.close()}
            />
            <Button
              title="Filter"
              filled
              style={styles.logoutButton}
              onPress={() => refRBSheet.current.close()}
            />
          </View>
        </RBSheet>
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
  headerContainer: {
    flexDirection: "row",
    width: SIZES.width - 32,
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: 32
  },
  viewLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  greeeting: {
    fontSize: 12,
    fontFamily: "regular",
    color: "gray",
    marginBottom: 4
  },
  title: {
    fontSize: 20,
    fontFamily: "bold",
    color: COLORS.greyscale900
  },
  viewNameContainer: {
    marginLeft: 12
  },
  viewRight: {
    flexDirection: "row",
    alignItems: "center"
  },
  bellIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
    marginRight: 8
  },
  bellBadge: {
    position: 'absolute',
    top: -6,
    right: 3,
    backgroundColor: COLORS.black,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bellBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: 'bold'
  },
  bookmarkIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black
  },
  cartIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
    marginLeft: 5,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: COLORS.white,
    fontFamily: 'bold',
    fontSize: 10,
  },
  searchBarContainer: {
    width: SIZES.width - 32,
    backgroundColor: COLORS.secondaryWhite,
    padding: 16,
    borderRadius: 12,
    height: 52,
    marginVertical: 16,
    flexDirection: "row",
    alignItems: "center"
  },
  searchIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.gray
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "regular",
    marginHorizontal: 8
  },
  filterIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.primary
  },
  bannerContainer: {
    width: SIZES.width - 32,
    height: 154,
    paddingHorizontal: 28,
    paddingTop: 28,
    borderRadius: 32,
    backgroundColor: COLORS.secondary
  },
  bannerTopContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  bannerDicount: {
    fontSize: 12,
    fontFamily: "medium",
    color: COLORS.black,
    marginBottom: 4
  },
  bannerDiscountName: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.black
  },
  bannerDiscountNum: {
    fontSize: 46,
    fontFamily: "bold",
    color: COLORS.black
  },
  bannerBottomContainer: {
    marginTop: 8
  },
  bannerBottomTitle: {
    fontSize: 14,
    fontFamily: "medium",
    color: COLORS.black
  },
  bannerBottomSubtitle: {
    fontSize: 14,
    fontFamily: "medium",
    color: COLORS.black,
    marginTop: 4
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 999
  },
  firstName: {
    fontSize: 16,
    fontFamily: "semiBold",
    color: COLORS.dark2,
    marginTop: 6
  },
  bannerItemContainer: {
    width: "100%",
    paddingBottom: 10,
    backgroundColor: COLORS.secondary,
    height: 170,
    borderRadius: 32,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: COLORS.black,
  },
  cancelButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.tansparentPrimary,
    borderRadius: 32
  },
  logoutButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.primary,
    borderRadius: 32
  },
  bottomTitle: {
    fontSize: 24,
    fontFamily: "semiBold",
    color: COLORS.black,
    textAlign: "center",
    marginTop: 12
  },
  separateLine: {
    height: .4,
    width: SIZES.width - 32,
    backgroundColor: COLORS.greyscale300,
    marginVertical: 12
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.black,
    marginVertical: 12
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingHorizontal: 16,
    width: SIZES.width
  },
})

export default Home
