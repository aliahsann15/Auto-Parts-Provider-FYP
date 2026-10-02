import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { COLORS, icons } from '../constants';
import { ScrollView } from 'react-native-virtualized-view';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme/ThemeProvider';
import { FontAwesome, Feather } from "@expo/vector-icons";
import { NavigationProp, useFocusEffect } from '@react-navigation/native';
import AutoSlider from '@/components/AutoSlider';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { FlatList } from 'react-native';
import { fetchPublicProduct, fetchPublicProducts, Product } from '@/utils/api/products';
import { API_BASE_URL } from '@/utils/api/client';
import { addToCart } from '@/utils/api/cart';
import { useAuth } from './context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import useWishlist from '@/hooks/useWishlist';
import { getCart } from '@/utils/api/cart';
import ProductCard from '@/components/ProductCard';
import { fetchStoreBySellerId } from '@/utils/api/store';
import StarRating from '@/components/StarRating';
import { PRODUCT_PLACEHOLDER, resolveProductImageSource } from '@/utils/images';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.48;
const CARD_SPACING = 12;
const REVIEW_SLIDE_WIDTH = SCREEN_WIDTH - 32;
const REVIEW_GAP = 12;

const CarDetails = () => {
    const params = useLocalSearchParams<{ id?: string | string[] }>();
    const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [relatedLoading, setRelatedLoading] = useState(false);
    const [sellerLoading, setSellerLoading] = useState(false);
    const [related, setRelated] = useState<Product[]>([]);
    const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
    const [storeInfo, setStoreInfo] = useState<{ name?: string; image?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigation = useNavigation<NavigationProp<any>>();
    const { dark } = useTheme();
    const refRBSheet = useRef<any>(null);
    const [tab, setTab] = useState<'description' | 'technicalDescription'>('description');
    const [selectedColor, setSelectedColor] = useState<any>(null);
    const [quantity, setQuantity] = useState<number>(1);
    const [cartCount, setCartCount] = useState(0);
    const reviewSliderRef = useRef<FlatList<any>>(null);
    const reviewIndexRef = useRef(0);
    const apiBase = API_BASE_URL.replace(/\/api$/, '');
    const { token, isLoggedIn } = useAuth();
    // const [addCartLoading, setAddCartLoading] = useState(false);
    const { isInWishlist, toggle: toggleWishlist, isUpdatingId, refresh: refreshWishlist } = useWishlist();
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
    }, [token]);

    const loadProduct = useCallback(async (opts?: { skipSpinner?: boolean }) => {
        if (!idParam) {
            setError('Missing product id');
            return;
        }
        try {
            if (!opts?.skipSpinner) setLoading(true);
            const res = await fetchPublicProduct(idParam as string);
            setProduct(res.product);
            setError(null);
        } catch (err: any) {
            setError(err?.message || 'Failed to load product');
        } finally {
            if (!opts?.skipSpinner) setLoading(false);
        }
    }, [idParam]);

    const loadRelated = useCallback(
        async (baseProduct?: any) => {
            const source = baseProduct || product;
            if (!source) return;

            const categories = (source.categories || []).filter(Boolean).join(',');
            const make = source.make;
            const carModel = source.carModel;
            const variant = source.variant;
            const price = Number(source.salePrice ?? source.price) || 0;

            const attempts: Array<Record<string, any>> = [];
            if (categories) {
                attempts.push({ categories, make, carModel, variant, limit: 8 });
            }
            if (variant) {
                attempts.push({ variant, make, carModel, limit: 8 });
            }
            if (carModel) {
                attempts.push({ carModel, make, limit: 8 });
            }
            if (make) {
                attempts.push({ make, limit: 8 });
            }
            if (price > 0) {
                const minPrice = Math.max(0, price * 0.8);
                const maxPrice = price * 1.2;
                attempts.push({ minPrice, maxPrice, limit: 8 });
            }
            // final broad attempt if nothing else matched
            attempts.push({ limit: 8 });

            try {
                setRelatedLoading(true);
                let found: Product[] = [];
                for (const params of attempts) {
                    try {
                        const res = await fetchPublicProducts(params);
                        const filtered = (res.products || []).filter((p) => p._id !== source._id);
                        if (filtered.length) {
                            found = filtered;
                            break;
                        }
                    } catch {
                        // continue to next attempt
                    }
                }
                if (found.length < 4) {
                    try {
                        const res = await fetchPublicProducts({ limit: 12 });
                        const extras = (res.products || []).filter(
                            (p) => p._id !== source._id && !found.some((f) => f._id === p._id)
                        );
                        found = [...found, ...extras];
                    } catch {
                        // ignore fill errors
                    }
                }
                setRelated(found.slice(0, 4));
            } finally {
                setRelatedLoading(false);
            }
        },
        [product]
    );

    const loadSellerProducts = useCallback(async (baseProduct?: any) => {
        const source = baseProduct || product;
        if (!source?.sellerId && !source?.seller) {
            setSellerProducts([]);
            return;
        }
        try {
            setSellerLoading(true);
            const sellerId = source.sellerId || source.seller;
            const res = await fetchPublicProducts({
                limit: 8,
                status: 'active',
                seller: sellerId,
            });
            const filtered = (res.products || []).filter((p) => p._id !== source._id);
            setSellerProducts(filtered.slice(0, 4));
        } catch {
            setSellerProducts([]);
        } finally {
            setSellerLoading(false);
        }
    }, [product]);

    const reviewStats = useMemo(() => {
        const list = (product?.reviews || []).map((rev: any, idx: number) => {
            const userObj = rev?.user || {};
            const reviewerName = userObj.name || rev?.userName || rev?.name || 'User';
            const reviewerImage = userObj.profileImage || rev?.userImage || '';
            return {
                rating: rev?.rating ?? 0,
                comment: rev?.comment || '',
                createdAt: rev?.createdAt,
                userName: reviewerName,
                userImage: reviewerImage,
                key: `${product?._id || 'p'}-${idx}`,
            };
        });
        const ratings = list.map((r: any) => Number(r.rating) || 0);
        const count = list.length;
        const total = ratings.reduce((sum: any, r: any) => sum + r, 0);
        const avg = count ? total / count : 0;
        return { list, count, avg };
    }, [product?.reviews, product?._id]);
    const reviewSlides = useMemo(() => reviewStats.list.slice(0, 5), [reviewStats.list]);

    const formatDate = useCallback((iso?: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const day = d.getDate();
        const month = d.toLocaleString('default', { month: 'short' });
        const year = d.getFullYear().toString().slice(-2);
        return `${day}-${month}-${year}`;
    }, []);

    useEffect(() => {
        loadProduct();
        loadCartCount();
    }, [loadProduct, loadCartCount]);

    useFocusEffect(
        useCallback(() => {
            loadProduct();
            loadCartCount();
        }, [loadProduct, loadCartCount])
    );

    useEffect(() => {
        reviewIndexRef.current = 0;
        reviewSliderRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, [reviewSlides.length]);

    useEffect(() => {
        if (product) {
            loadRelated(product);
            loadSellerProducts(product);
            if (product?.sellerId || product?.seller) {
                const sellerId = String(product.sellerId || product.seller);
                fetchStoreBySellerId(sellerId)
                    .then((res) => {
                        const img = res.store?.storeProfileImage
                            ? res.store.storeProfileImage.startsWith('http')
                                ? res.store.storeProfileImage
                                : `${apiBase}${res.store.storeProfileImage}`
                            : undefined;
                        setStoreInfo({ name: res.store?.storeName, image: img });
                    })
                    .catch(() => setStoreInfo(null));
            }
        }
    }, [product, loadRelated, loadSellerProducts, apiBase]);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('cart:updated', () => {
            loadCartCount();
        });
        return () => sub.remove();
    }, [loadCartCount]);

    const isWishlisted = useMemo(
        () => isInWishlist(product?._id ?? null),
        [isInWishlist, product?._id]
    );

    const handleToggleWishlist = useCallback(async () => {
        if (!product?._id) return;
        try {
            await toggleWishlist(product._id);
            await refreshWishlist();
            DeviceEventEmitter.emit('wishlist:navigate');
        } catch (err: any) {
            Alert.alert('Login required', err?.message || 'Please sign in to manage your wishlist.');
        }
    }, [product?._id, toggleWishlist, refreshWishlist]);

    const renderSuggestion = ({ item }: { item: Product }) => {
        const vehicleLabel = [item.make, item.carModel, item.variant, (item as any)?.year].filter(Boolean).join(' ');
        const sold = (item as any)?.itemsSold ?? 0;
        const imageUri =
            item.images && item.images.length
                ? resolveProductImageSource(item.images[0])
                : PRODUCT_PLACEHOLDER;

        return (
            <View style={{ width: CARD_WIDTH, marginRight: CARD_SPACING }}>
                <ProductCard
                    name={item.name}
                    image={imageUri}
                    numSolds={sold}
                    price={item.price}
                    salePrice={item.salePrice}
                    rating={item.averageRating ?? item.rating ?? 0}
                    vehicleLabel={vehicleLabel}
                    onPress={() => navigation.navigate('cardetails', { id: item._id })}
                />
            </View>
        );
    };

    const sliderImages = useMemo(() => {
        const imgs: string[] = [];
        if (product?.featuredImage) imgs.push(product.featuredImage);
        if (Array.isArray(product?.images)) imgs.push(...product.images);
        if (Array.isArray((product as any)?.galleryImages)) imgs.push(...(product as any).galleryImages);
        const seen = new Set<string>();
        const normalized = imgs
          .map((img: string) => img?.trim?.() || '')
          .filter(Boolean)
          .map((img: string) => img.startsWith('http') ? img : `${apiBase}${img.startsWith('/') ? '' : '/'}${img}`)
          .filter((uri) => {
            if (seen.has(uri)) return false;
            seen.add(uri);
            return true;
          });
    if (!normalized.length) {
      return [PRODUCT_PLACEHOLDER];
    }
    return normalized.map((uri) => ({ uri }));
    }, [product?.featuredImage, product?.images, (product as any)?.galleryImages, apiBase]);


    const renderHeader = () => {
        return (
            <View style={styles.headerContainer}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}>
                    <Image
                        source={icons.back}
                        resizeMode='contain'
                        style={styles.backIcon}
                    />
                </TouchableOpacity>

                <View style={styles.iconContainer}>
                    <TouchableOpacity
                        onPress={handleToggleWishlist}
                        disabled={!product?._id || isUpdatingId === product?._id}>
                        <Image
                            source={isWishlisted ? icons.heart2 : icons.heart2Outline}
                            resizeMode='contain'
                            style={[styles.bookmarkIcon, isUpdatingId === product?._id && { opacity: 0.5 }]}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ position: 'relative' }}
                        onPress={() => navigation.navigate('(tabs)', { screen: 'cart' })}>
                        <Image
                            source={icons.cartOutline}
                            resizeMode='contain'
                            style={styles.sendIcon}
                        />
                        <View style={styles.cartBadge}>
                            <Text style={styles.cartBadgeText}>{cartCount}</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        )
    }

    const renderContent = () => {
        const increaseQty = () => setQuantity(quantity + 1);
    const decreaseQty = () => { if (quantity > 1) setQuantity(quantity - 1); };
    const handleColorSelect = (color: any) => setSelectedColor(color);
    const renderCheckmark = (color: any) => selectedColor === color ? <FontAwesome name="check" size={18} color="white" /> : null;
    const inStock = (product?.stock ?? 0) > 0;

        return (
            <View style={styles.contentContainer}>
                <View style={styles.contentView}>
                    <Text style={[styles.contentTitle, {
                        color: dark ? COLORS.white : COLORS.black
                    }]}>
                        {[product?.make, product?.carModel, product?.variant, product?.year, product?.name].filter(Boolean).join(' ') || 'Product'}
                    </Text>
                </View>
                <View style={styles.ratingContainer}>
                    <View style={styles.ratingContainerChild}>
                        {/* <View style={[styles.ratingView, {
                            backgroundColor: dark ? COLORS.dark3 : COLORS.silver
                        }]}>
                            <Text style={[styles.ratingViewTitle, {
                                color: dark ? COLORS.white : "#35383F",
                            }]}>SKU: {product?.sku || '---'}</Text>
                        </View> */}
                        <View style={[styles.ratingView, {
                            backgroundColor: dark ? COLORS.dark3 : COLORS.silver
                        }]}>
                            <Text style={[styles.ratingViewTitle, {
                                color: dark ? COLORS.white : "#35383F",
                            }]}>{product?.itemsSold ?? product?.stock ?? 0} sold</Text>
                        </View>
                        <View style={[styles.ratingView, {
                            backgroundColor: inStock ? "#008000" : "#de0a09",
                        }]}>
                            <Text style={[styles.ratingViewTitle, {
                                color: inStock ? COLORS.grayscale200 : COLORS.grayscale200,
                            }]}>{inStock ? 'In stock' : 'Out of stock'}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate("productreviews", { productId: product?._id || idParam })}
                        style={styles.starContainer}>
                        <StarRating rating={(product?.averageRating ?? product?.reviews?.[0]?.rating ?? 0)} size={16} />
                        <Text style={[styles.reviewText, {
                            color: dark ? COLORS.white : COLORS.greyScale800,
                            marginLeft: 8
                        }]}>
                            {(product?.averageRating ?? product?.reviews?.[0]?.rating ?? 0).toFixed(1)} ({product?.totalReviews ?? product?.reviews?.length ?? 0} reviews)
                        </Text>
                    </TouchableOpacity>

                </View>
                <View style={[styles.separateLine, {
                    backgroundColor: dark ? COLORS.greyscale900 : COLORS.grayscale200
                }]} />
                {/* ─── Tabs ─── */}
                <View style={styles.priceContainer}>
                    <View>
                        <Text style={styles.priceLabel}>Price</Text>
                        <Text style={[styles.price, {
                            color: dark ? COLORS.white : COLORS.black
                        }]}>PKR {product?.salePrice || product?.price || 0}</Text>
                    </View>
                    <AddToCartButton
                        productId={product?._id}
                        quantity={quantity}
                        token={token}
                        isLoggedIn={isLoggedIn}
                        onRequireLogin={() => navigation.navigate('login')}
                        onAdded={(qty) => {
                            setCartCount(prev => prev + qty);
                            DeviceEventEmitter.emit('cart:navigate');
                        }}
                        disabled={!inStock}
                    />
                </View>
                {product?.sellerId || product?.sellerName ? (
                    <View style={styles.storeCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            {storeInfo?.image ? (
                                <Image
                                    source={{ uri: storeInfo.image }}
                                    style={styles.storeAvatar}
                                />
                            ) : product?.sellerImage ? (
                                <Image
                                    source={{ uri: product.sellerImage.startsWith('http') ? product.sellerImage : `${apiBase}${product.sellerImage}` }}
                                    style={styles.storeAvatar}
                                />
                            ) : (
                                <View style={[styles.storeAvatar, styles.storeAvatarFallback]}>
                                    <Text style={styles.storeAvatarText}>
                                        {(storeInfo?.name || product?.sellerName || 'S').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={[styles.storeName, { color: dark ? COLORS.white : COLORS.black }]} numberOfLines={1}>
                                    {storeInfo?.name || product?.sellerName || 'Store'}
                                </Text>
                                <Text style={[styles.storeMeta, { color: COLORS.black }]}>
                                    {(product?.totalReviews ?? product?.reviews?.length ?? 0)} reviews • {(product?.averageRating ?? product?.rating ?? 0).toFixed(1)} ★
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('storepreview', { sellerId: product?.sellerId || product?.seller, sellerName: product?.sellerName })}
                            style={styles.visitBtn}
                        >
                            <Text style={styles.visitBtnText}>Visit Store</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            tab === 'description' && styles.tabButtonActive,
                        ]}
                        onPress={() => setTab('description')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                tab === 'description' && styles.tabTextActive,
                            ]}
                        >
                            Description
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            tab === 'technicalDescription' && styles.tabButtonActive,
                        ]}
                        onPress={() => setTab('technicalDescription')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                tab === 'technicalDescription' && styles.tabTextActive,
                            ]}
                        >
                            Technical Details
                        </Text>
                    </TouchableOpacity>
                </View>
                {tab === 'description' ? (
                    <Text style={[styles.descText, {
                        color: dark ? COLORS.grayscale200 : COLORS.black
                    }]}>{product?.description || 'No description provided.'}</Text>
                ) : (
                    <View>
                        {(product?.technicalDescription?.split?.('\n') || []).map((detail: string, index: number) => (
                            <View style={styles.keyFeatures} key={index}>
                                <View style={{
                                    width: 8,
                                    height: 8,
                                    backgroundColor: COLORS.primary,
                                    borderRadius: 999,
                                    marginRight: 12
                                }} />
                                <Text style={[styles.keyFeature, {
                                    color: dark ? COLORS.greyscale300 : COLORS.black
                                }]}>{detail}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        )
    }

    const fallbackSliderImages = useMemo(
        () => [PRODUCT_PLACEHOLDER],
        []
    );

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: COLORS.white }]}>
            <StatusBar
                style='dark'
                translucent={false}
                backgroundColor={COLORS.white}
            />
            <View style={styles.container}>
                {renderHeader()}
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
                ) : error ? (
                    <Text style={{ color: COLORS.red, padding: 16 }}>{error}</Text>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}>
                        <AutoSlider
                            images={
                                sliderImages.length
                                    ? sliderImages
                                    : fallbackSliderImages
                            }
                        />
                        {renderContent()}
                        <View style={styles.technicalContainer}>
                            {/* <Text style={[styles.sectionTitle, {
                                color: dark ? COLORS.white : COLORS.greyscale900
                            }]}>Specification</Text>
                            <View style={[styles.separateLine, {
                                backgroundColor: dark ? COLORS.greyscale900 : COLORS.grayscale200
                            }]} />
                            <View style={{ marginVertical: 12 }}>
                                {(product?.technicalDescription?.split?.('\n') || []).map((detail: string, index: number) => (
                                    <View key={index} style={[styles.itemContainer, {
                                        backgroundColor: dark ? COLORS.dark3 : COLORS.silver
                                    }]}>
                                        <Text style={[styles.itemText, {
                                            color: dark ? COLORS.white : COLORS.black
                                        }]}>{detail}</Text>
                                    </View>
                                ))}
                            </View> */}
                        <View style={styles.suggestionContainer}>
                            <View style={styles.suggestionHeader}>
                                <Text style={styles.suggestionTitle}>Suggestions for you</Text>
                                <TouchableOpacity onPress={() => navigation.navigate("mostpopularproducts")}>
                                    <Text style={styles.suggestionBtnAll}>See All</Text>
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={related}
                                renderItem={renderSuggestion}
                                horizontal
                                keyExtractor={(item) => item._id}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.suggestionList}
                                snapToInterval={CARD_WIDTH + CARD_SPACING}
                                decelerationRate="fast"
                                ListEmptyComponent={
                                    relatedLoading ? (
                                        <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 12 }} />
                                    ) : (
                                        <Text style={{ color: COLORS.grayscale700 }}>No suggestions available.</Text>
                                    )
                                }
                            />
                        </View>
                        {sellerProducts.length > 0 ? (
                            <View style={styles.suggestionContainer}>
                                <View style={styles.suggestionHeader}>
                                    <Text style={styles.suggestionTitle}>More from this seller</Text>
                                </View>
                                <FlatList
                                    data={sellerProducts}
                                    renderItem={renderSuggestion}
                                    horizontal
                                    keyExtractor={(item) => item._id}
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.suggestionList}
                                    snapToInterval={CARD_WIDTH + CARD_SPACING}
                                    decelerationRate="fast"
                                    ListEmptyComponent={
                                        sellerLoading ? (
                                            <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 12 }} />
                                        ) : null
                                    }
                                />
                            </View>
                        ) : null}
                        <View style={[styles.separateLine, {
                                backgroundColor: dark ? COLORS.greyscale900 : COLORS.grayscale200
                            }]} />
                        <View style={styles.reviewSection}>
                                <View style={styles.reviewHeaderRow}>
                                    <View>
                                        <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.black }]}>Reviews</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                            <StarRating rating={reviewStats.avg} size={16} />
                                            <Text style={[styles.reviewMetaText, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
                                                {reviewStats.avg.toFixed(1)} • {reviewStats.count} reviews
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => navigation.navigate("productreviews", { productId: product?._id || idParam })}>
                                        <Text style={[styles.showAll, { color: COLORS.primary }]}>See all reviews</Text>
                                    </TouchableOpacity>
                                </View>
                                {reviewSlides.length ? (
                                    <FlatList
                                        ref={reviewSliderRef}
                                        data={reviewSlides}
                                        keyExtractor={(item) => item.key}
                                        horizontal
                                        pagingEnabled
                                        showsHorizontalScrollIndicator={false}
                                        removeClippedSubviews={false}
                                        scrollEventThrottle={16}
                                        initialNumToRender={reviewSlides.length}
                                        snapToInterval={REVIEW_SLIDE_WIDTH + REVIEW_GAP}
                                        decelerationRate="fast"
                                        ItemSeparatorComponent={() => <View style={{ width: REVIEW_GAP }} />}
                                        getItemLayout={(_, index) => ({
                                            length: REVIEW_SLIDE_WIDTH + REVIEW_GAP,
                                            offset: (REVIEW_SLIDE_WIDTH + REVIEW_GAP) * index,
                                            index,
                                        })}
                                        renderItem={({ item }) => (
                                            <View style={[
                                                styles.reviewCard,
                                                {
                                                    backgroundColor: dark ? COLORS.dark3 : COLORS.silver,
                                                    width: REVIEW_SLIDE_WIDTH
                                                }
                                            ]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                                    {item.userImage ? (
                                                        <Image source={{ uri: item.userImage }} style={styles.userAvatar} />
                                                    ) : (
                                                        <View style={styles.userAvatarFallback}>
                                                            <Text style={styles.userAvatarText}>{item.userName.charAt(0).toUpperCase()}</Text>
                                                        </View>
                                                    )}
                                                    <View style={{ marginLeft: 10, flex: 1 }}>
                                                        <Text style={[styles.reviewName, { color: dark ? COLORS.white : COLORS.black }]} numberOfLines={1}>
                                                            {item.userName}
                                                        </Text>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                                            <StarRating rating={item.rating} size={14} />
                                                            <Text style={[styles.reviewMeta, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700, marginLeft: 6 }]}>
                                                                {item.createdAt ? `${formatDate(item.createdAt)}` : ''}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                {item.comment ? (
                                                    <Text style={[styles.reviewText, { color: dark ? COLORS.white : COLORS.black }]} numberOfLines={3}>
                                                        {item.comment}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        )}
                                    />
                                ) : (
                                    <Text style={[styles.reviewMetaText, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700, marginTop: 8 }]}>
                                        No reviews yet.
                                    </Text>
                                )}
                            </View>
                    </View>
                </ScrollView>
            )}
        </View>
    </SafeAreaView>
    )
};

const AddToCartButton = React.memo(function AddToCartButton({
    productId,
    quantity,
    token,
    isLoggedIn,
    onRequireLogin,
    onAdded,
    disabled,
}: {
    productId?: string;
    quantity: number;
    token: string | null;
    isLoggedIn: boolean;
    onRequireLogin: () => void;
    onAdded: (qty: number) => void;
    disabled?: boolean;
}) {
    const [loading, setLoading] = useState(false);

    const handlePress = useCallback(async () => {
        if (disabled) return;
        if (!isLoggedIn || !token) {
            onRequireLogin();
            return;
        }
        if (!productId) return;

        try {
            setLoading(true);
            await addToCart({ productId, quantity }, token);

            DeviceEventEmitter.emit('cart:updated');
            onAdded(quantity);
        } catch (err: any) {
            alert(err?.message || 'Failed to add to cart');
        } finally {
            setLoading(false);
        }
    }, [disabled, isLoggedIn, token, productId, quantity, onRequireLogin, onAdded]);

    return (
        <TouchableOpacity
            style={[styles.btnContainer, (disabled || loading) && { opacity: 0.6 }]}
            disabled={loading || disabled}
            onPress={handlePress}
        >
            <Text style={styles.btnTitle}>
                {disabled ? 'Out of stock' : loading ? 'Adding...' : 'Add to cart'}
            </Text>
        </TouchableOpacity>
    );
});


const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    storeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        backgroundColor: COLORS.silver,
        marginTop: 8,
        marginBottom: 16,
    },
    storeAvatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.silver,
    },
    storeAvatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    storeAvatarText: {
        fontSize: 18,
        fontFamily: 'bold',
        color: COLORS.black,
    },
    storeName: {
        fontSize: 16,
        fontFamily: 'bold',
    },
    storeMeta: {
        fontSize: 13,
        fontFamily: 'regular',
        marginTop: 2,
    },
    visitBtn: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        marginLeft: 12,
    },
    visitBtnText: {
        color: COLORS.white,
        fontFamily: 'semiBold',
        fontSize: 14,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 16
    },
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginVertical: 12
    },
    backIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.black
    },
    iconContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    bookmarkIcon: {
        width: 20,
        height: 20
    },
    sendIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 48,
        backgroundColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 18
    },
    sendIcon: {
        width: 24,
        height: 24,
        tintColor: COLORS.black
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
    contentContainer: {
        marginVertical: 12
    },
    contentView: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center"
    },
    vehicleText: {
        fontSize: 13,
        fontFamily: 'regular',
        marginTop: 4,
    },
    contentTitle: {
        fontSize: 22,
        fontFamily: "bold",
        color: COLORS.black
    },
    ratingContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 14,
        flexWrap: 'wrap'
    },
    ratingContainerChild: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1
    },
    ratingView: {
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8
    },
    ratingViewTitle: {
        fontSize: 12,
        fontFamily: "semiBold",
        color: COLORS.greyscale900
    },
    starContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 12
    },
    starIcon: {
        width: 24,
        height: 24
    },
    reviewText: {
        fontSize: 14,
        fontFamily: "semiBold",
        color: COLORS.greyScale800
    },
    separateLine: {
        width: "100%",
        height: 1,
        backgroundColor: COLORS.grayscale200,
        marginVertical: 12
    },
    tabsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 16,
        backgroundColor: COLORS.silver,
        marginRight: 8,
    },
    tabButtonActive: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        fontFamily: 'semiBold',
        color: COLORS.black,
    },
    tabTextActive: {
        color: COLORS.white,
    },
    descText: {
        fontSize: 16,
        fontFamily: "regular",
        color: COLORS.black,
        lineHeight: 24
    },
    keyFeatures: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 8
    },
    keyFeature: {
        fontSize: 16,
        fontFamily: "medium",
        color: COLORS.black
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginVertical: 14
    },
    priceLabel: {
        fontSize: 14,
        fontFamily: "medium",
        color: COLORS.gray
    },
    price: {
        fontSize: 24,
        fontFamily: "bold",
        color: COLORS.black
    },
    btnContainer: {
        backgroundColor: COLORS.primary,
        height: 52,
        width: 140,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16
    },
    btnTitle: {
        fontSize: 16,
        fontFamily: "semiBold",
        color: COLORS.white
    },
    technicalContainer: {
        marginVertical: 12
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: "bold",
        color: COLORS.greyscale900
    },
    itemContainer: {
        width: "100%",
        height: 54,
        borderRadius: 16,
        backgroundColor: COLORS.silver,
        paddingHorizontal: 16,
        alignItems: "center",
        flexDirection: "row",
        marginVertical: 6
    },
    itemText: {
        fontSize: 16,
        fontFamily: "medium",
        color: COLORS.black
    },
    suggestionContainer: {
        marginVertical: 16
    },
    suggestionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12
    },
    suggestionTitle: {
        fontSize: 20,
        fontFamily: "bold",
        color: COLORS.greyscale900
    },
    suggestionBtnAll: {
        fontSize: 14,
        fontFamily: "semiBold",
        color: COLORS.primary
    },
    reviewSection: {
        marginTop: 12,
        gap: 10,
    },
    reviewHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reviewMetaText: {
        fontFamily: 'regular',
        fontSize: 13,
        marginLeft: 6,
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
    showAll: { fontFamily: 'medium', fontSize: 13 },
    suggestionList: {
        paddingRight: 24
    },
    suggestionCard: {
        width: CARD_WIDTH,
        marginRight: CARD_SPACING,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2
    },
    suggestionImage: {
        width: '100%',
        height: 150,
    },
    suggestionContent: {
        padding: 12,
    },
    suggestionName: {
        fontSize: 16,
        fontFamily: 'bold',
        color: COLORS.greyscale900,
    },
    suggestionPrice: {
        fontSize: 14,
        fontFamily: 'semiBold',
        color: COLORS.primary,
        marginVertical: 6,
    },
    suggestionBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
    },
    suggestionBtnText: {
        color: COLORS.white,
        fontSize: 14,
        fontFamily: 'semiBold',
    },
    socialContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        width: "100%",
    },
    socialBtn: {
        width: 60,
        height: 60,
        borderRadius: 60,
        backgroundColor: COLORS.silver,
        alignItems: "center",
        justifyContent: "center"
    },
    circle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 4
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.greyscale900
    },
    modalSubtitle: {
        fontSize: 14,
        fontFamily: "regular",
        color: COLORS.greyscale900
    },
    modalBottomTitle: {
        fontSize: 16,
        fontFamily: "regular",
        color: COLORS.black,
        marginVertical: 6
    },
    shareContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
    },
    shareText: {
        fontSize: 14,
        fontFamily: "regular",
        color: COLORS.greyscale900
    },
    shareBtn: {
        width: 52,
        height: 52,
        borderRadius: 12,
        borderColor: COLORS.silver,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center"
    },
    shareIcon: {
        width: 22,
        height: 22
    }
})

export default CarDetails
