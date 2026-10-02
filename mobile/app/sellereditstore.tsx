import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    TextInput,
    Modal,
    SafeAreaView,
    Alert
} from 'react-native';
import { ListedProductType } from '../data/sellerDashboardData';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, icons, images, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { router, useNavigation } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import ProductSalesCard from '@/components/ProductSalesCard';
import { FlatList } from 'react-native-gesture-handler';
import SubHeaderItem from '@/components/SubHeaderItem';
import { categoriesByParts } from '@/data/sellerDashboardData';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ProductCard from '@/components/ProductCard';
import ButtonFilled from '@/components/ButtonFilled';
import Button from '@/components/Button';
import RBSheet from 'react-native-raw-bottom-sheet';
import { useAuth } from './context/AuthContext';
import { fetchMyStore, updateMyStore, Store } from '@/utils/api/store';
import { uploadProfileImage } from '@/utils/api/user';
import { fetchPublicProducts, Product } from '@/utils/api/products';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import StorePreview from './storepreview';

// 👈 Custom emoji icons

const { width, height } = Dimensions.get('window');

type SectionConfig = { key: string; component: string; visible: boolean };

const SECTION_LABELS: Record<string, string> = {
    banner: 'Banners',
    salesBanner: 'Sales Banners',
    featured: 'Featured Products',
    sale: 'Sale Products',
    best: 'Best Selling Products',
    reviews: 'Reviews',
};

const DEFAULT_SECTIONS: SectionConfig[] = [
    { key: 'banner', component: SECTION_LABELS.banner, visible: true },
    { key: 'salesBanner', component: SECTION_LABELS.salesBanner, visible: true },
    { key: 'featured', component: SECTION_LABELS.featured, visible: true },
    { key: 'sale', component: SECTION_LABELS.sale, visible: true },
    { key: 'best', component: SECTION_LABELS.best, visible: true },
    { key: 'reviews', component: SECTION_LABELS.reviews, visible: true },
];

const normalizeSectionKey = (key: string) => {
    if (!key) return key;
    if (key.toLowerCase() === 'salesbanner' || key === 'sales_banner') return 'salesBanner';
    return key;
};

const buildSectionsState = (order?: string[], visibility?: Record<string, boolean>): SectionConfig[] => {
    const normalizedOrder = (order?.length ? order : DEFAULT_SECTIONS.map(s => s.key)).map(normalizeSectionKey);
    const seen = new Set<string>();

    const sections: SectionConfig[] = normalizedOrder.map(key => {
        const fallback = DEFAULT_SECTIONS.find(s => s.key === key);
        const component = SECTION_LABELS[key] || fallback?.component || key;
        const visKey = normalizeSectionKey(key);
        const visible = typeof visibility?.[visKey] === 'boolean'
            ? visibility![visKey]
            : fallback?.visible ?? true;
        seen.add(key);
        return { key, component, visible };
    });

    DEFAULT_SECTIONS.forEach(sec => {
        if (!seen.has(sec.key)) {
            sections.push({ ...sec, visible: visibility?.[sec.key] ?? sec.visible });
        }
    });

    return sections;
};

const productToListed = (product: Product): ListedProductType => {
    const averagedRating = (product as any).averageRating;
    const reviewAverage = product.reviews && product.reviews.length
        ? product.reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / product.reviews.length
        : 0;
    const vehicleParts = [product.make, (product as any)?.carModel, (product as any)?.variant].filter(Boolean);
    const displayName = [...vehicleParts, product.name].filter(Boolean).join(' ');

    return {
        id: product._id,
        name: displayName || product.name,
        rawName: product.name,
        image: product.images?.[0] ? { uri: product.images[0] } : { uri: '' },
        price: String(product.price ?? ''),
        salePrice: product.salePrice ? String(product.salePrice) : '',
        numReviews: product.reviews?.length || 0,
        rating: averagedRating ?? reviewAverage ?? 0,
        stock: product.stock ?? 0,
        sold: (product as any).itemsSold || 0,
        navigate: '',
        categoryId: product.categories?.[0] || '0',
    };
};

const selectProductsByIds = (ids: string[] = [], products: Product[]) =>
    products.filter(p => ids.includes(p._id)).slice(0, 12).map(productToListed);

const isOnSaleProduct = (p: Product): boolean => {
    const price = Number((p as any)?.price);
    const sale = Number((p as any)?.salePrice);
    return Number.isFinite(price) && Number.isFinite(sale) && sale > 0 && sale < price;
};

const isOnSaleListed = (p: ListedProductType): boolean => {
    const price = Number(p.price);
    const sale = Number(p.salePrice);
    return Number.isFinite(price) && Number.isFinite(sale) && sale > 0 && sale < price;
};

const selectSaleProductsByIds = (ids: string[] = [], products: Product[]) =>
    products.filter(p => ids.includes(p._id) && isOnSaleProduct(p)).slice(0, 12).map(productToListed);



export default function StoreProfileScreen() {
    const { user, token } = useAuth();
    const [store, setStore] = useState<Store | null>(null);
    const [description, setDescription] = useState('');
    const [editing, setEditing] = useState(false);
    const [cover, setCover] = useState<any>(null);
    const [logo, setLogo] = useState<any>(null);
    const [banner, setBanner] = useState<any>(null);
    const [salesBanner, setSalesBanner] = useState<any>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [showPreviewPrompt, setShowPreviewPrompt] = useState(false);
    const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
    const [selectedTab, setSelectedTab] = useState('Store');
    const navigation = useNavigation<NavigationProp<any>>();
    const { dark, colors } = useTheme();
    const params = useLocalSearchParams<{ from?: string }>();
    const [isFocused, setIsFocused] = useState(false);
    const refRBSheet = useRef<any>(null);
    const [selectedCategories, setSelectedCategories] = useState(["0"]);
    const [loadingStore, setLoadingStore] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
    // Toggle category selection
    const toggleCategory = (categoryId: string) => {
        const updatedCategories = [...selectedCategories];
        const index = updatedCategories.indexOf(categoryId);

        if (index === -1) {
            updatedCategories.push(categoryId);
        } else {
            updatedCategories.splice(index, 1);
        }

        setSelectedCategories(updatedCategories);
    };

    const pickImage = async (type: string) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1
        });

        if (!result.canceled && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            if (type === 'cover') setCover({ uri });
            if (type === 'logo') setLogo({ uri });
            if (type === 'banner') setBanner({ uri });
            if (type === 'salesBanner') setSalesBanner({ uri });
            setDirty(true);
        }
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const newList = [...sections];
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === newList.length - 1)) return;
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]];
        setSections(newList);
        setDirty(true);
    };

    const toggleVisibility = (index: number) => {
        const newList = [...sections];
        newList[index].visible = !newList[index].visible;
        setSections(newList);
        setDirty(true);
    };

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
                        Edit Store
                    </Text>
                </View>
                <TouchableOpacity style={styles.previewHeaderBtn} onPress={openPreview}>
                    <Text style={[styles.saveBtnText, { color: COLORS.primary }]}>Preview</Text>
                </TouchableOpacity>

            </View>
        )
    }

    const [search, setSearch] = useState('');
    const [search2, setSearch2] = useState('');
    const [featuredSelected, setFeaturedSelected] = useState<ListedProductType[]>([]);
    const [salesSelected, setSalesSelected] = useState<ListedProductType[]>([]);
    const sellerListedProducts = useMemo(() => sellerProducts.map(productToListed), [sellerProducts]);

    const filteredListed: ListedProductType[] = useMemo(() => {
        return sellerListedProducts.filter(
            (product: any) =>
                product.name.toLowerCase().includes(search.toLowerCase()) &&
                !featuredSelected.some((p) => p.id === product.id)
        );
    }, [sellerListedProducts, search, featuredSelected]);

    const filteredSalesListed: ListedProductType[] = useMemo(() => {
        return sellerListedProducts.filter(
            (product: any) =>
                isOnSaleListed(product) &&
                product.name.toLowerCase().includes(search2.toLowerCase()) &&
                !salesSelected.some((p) => p.id === product.id)
        );
    }, [sellerListedProducts, search2, salesSelected]);


    const handleAddFeatured = (product: ListedProductType) => {
        if (featuredSelected.length >= 12) return;
        setFeaturedSelected([...featuredSelected, product]);
        setDirty(true);
    };

    const handleRemoveFeatured = (productId: string) => {
        setFeaturedSelected(featuredSelected.filter((p) => p.id !== productId));
        setDirty(true);
    };
    const handleAddSales = (product: ListedProductType) => {
        if (salesSelected.length >= 12) return;
        setSalesSelected([...salesSelected, product]);
        setDirty(true);
    };

    const handleRemoveSales = (productId: string) => {
        setSalesSelected(salesSelected.filter((p) => p.id !== productId));
        setDirty(true);
    };
    const renderPopularProducts = () => {
        const filteredProducts = sellerListedProducts;

        return (
            <View style={{ padding: 16 }}>
                <View style={{
                    backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                    marginVertical: 16,
                    paddingBottom: 8
                }}>
                    {filteredProducts.length === 0 ? (
                        <View style={{ padding: 12, gap: 8 }}>
                            <Text style={{ fontFamily: 'regular', color: COLORS.greyscale600 }}>No products yet.</Text>
                            <ButtonFilled title="Add New Product" onPress={handleAddProductFromStore} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredProducts}
                            keyExtractor={item => item.id}
                            numColumns={2}
                            columnWrapperStyle={{ gap: 16 }}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                return (
                                    <ProductCard
                                        name={item.name}
                                        image={item.image}
                                        numSolds={item.itemsSold ?? item.sold ?? item.stock ?? 0}
                                        rating={item.rating}
                                        price={item.price}
                                        salePrice={item.salePrice}
                                        onPress={() => navigation.navigate("cardetails")}
                                    />
                                )
                            }}
                        />
                    )}
                </View>
            </View>
        )
    };

    const renderSalesProducts = () => {
        const filteredProducts = sellerListedProducts.filter(isOnSaleListed);

        return (
            <View style={{ padding: 16 }}>
                <View style={{
                    backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                    marginVertical: 16,
                    paddingBottom: 8
                }}>
                    {filteredProducts.length === 0 ? (
                        <View style={{ padding: 12, gap: 8 }}>
                            <Text style={{ fontFamily: 'regular', color: COLORS.greyscale600 }}>No sale products yet.</Text>
                            <ButtonFilled title="Add New Product" onPress={handleAddProductFromStore} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredProducts}
                            keyExtractor={item => item.id}
                            numColumns={2}
                            columnWrapperStyle={{ gap: 16 }}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                return (
                                    <ProductSalesCard
                                        name={item.name}
                                        image={item.image}
                                        numSolds={item.itemsSold ?? item.sold ?? item.stock ?? 0}
                                        rating={item.rating}
                                        price={item.price}
                                        salesprice={item.salePrice}
                                        onPress={() => navigation.navigate("cardetails")}
                                    />
                                )
                            }}
                        />
                    )}
                </View>
            </View>
        )
    };

    const syncStoreState = (st: Store) => {
        setStore(st);
        setDescription(st.storeBio || '');
        setCover(st.storeCoverImage ? { uri: st.storeCoverImage, url: st.storeCoverImage } : null);
        setLogo(st.storeProfileImage ? { uri: st.storeProfileImage, url: st.storeProfileImage } : null);
        setBanner(st.storeBanners?.[0] ? { uri: st.storeBanners[0], url: st.storeBanners[0] } : null);
        setSalesBanner(st.storeSalesBanners?.[0] ? { uri: st.storeSalesBanners[0], url: st.storeSalesBanners[0] } : null);
        setSections(buildSectionsState(st.sectionsOrder, st.sectionsVisibility));
    };




    useFocusEffect(
        React.useCallback(() => {
            let isActive = true;
            const loadData = async () => {
                if (!token || !user?.id) return;
                setLoadingStore(true);
                try {
                    const res = await fetchMyStore(token);
                    if (!isActive) return;
                    const st = res.store;
                    syncStoreState(st);
                    setDirty(false);
                    setEditing(false);
                    const productsRes = await fetchPublicProducts({ limit: 200 });
                    if (!isActive) return;
                    const mine = productsRes.products.filter(p => (p as any).sellerId === user?.id || (p as any).seller === user?.id);
                    const mineOnSale = mine.filter(isOnSaleProduct);
                    setSellerProducts(mine);
                    setFeaturedSelected(selectProductsByIds(st.featuredProductIds || [], mine));
                    setSalesSelected(selectSaleProductsByIds(st.saleProductIds || [], mineOnSale));
                } catch (err) {
                    console.log('loadStore err', err);
                } finally {
                    if (isActive) setLoadingStore(false);
                }
            };
            loadData();
            return () => { isActive = false; };
        }, [token, user?.id, params?.from])
    );

    const saveStore = async () => {
        if (!token || !user?.id) {
            Alert.alert('Not signed in', 'Please sign in again to save your store.');
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                storeBio: description,
                sectionsOrder: sections.map(s => normalizeSectionKey(s.key)),
                sectionsVisibility: sections.reduce((acc, s) => {
                    const key = normalizeSectionKey(s.key);
                    return { ...acc, [key]: s.visible };
                }, {}),
                featuredProductIds: featuredSelected.map(p => p.id),
                saleProductIds: salesSelected.map(p => p.id),
            };
            if (logo?.uri && !logo.url) {
                payload.storeProfileImage = await uploadProfileImage(logo.uri, token, 'stores');
            } else if (logo?.uri) {
                payload.storeProfileImage = logo.uri;
            }
            if (cover?.uri && !cover.url) {
                payload.storeCoverImage = await uploadProfileImage(cover.uri, token, 'stores');
            } else if (cover?.uri) {
                payload.storeCoverImage = cover.uri;
            }
            if (banner?.uri && !banner.url) {
                payload.storeBanners = [await uploadProfileImage(banner.uri, token, 'store-banners')];
            } else if (banner?.uri) {
                payload.storeBanners = [banner.uri];
            }
            if (salesBanner?.uri && !salesBanner.url) {
                payload.storeSalesBanners = [await uploadProfileImage(salesBanner.uri, token, 'store-sales-banners')];
            } else if (salesBanner?.uri) {
                payload.storeSalesBanners = [salesBanner.uri];
            }

            const res = await updateMyStore(payload, token);
            syncStoreState(res.store);
            setFeaturedSelected(selectProductsByIds(res.store.featuredProductIds || [], sellerProducts));
            const salePool = sellerProducts.filter(isOnSaleProduct);
            setSalesSelected(selectSaleProductsByIds(res.store.saleProductIds || [], salePool));
            setDirty(false);
            Alert.alert('Saved', 'Store updated successfully');
        } catch (err: any) {
            Alert.alert('Save failed', err?.message || 'Could not save store');
        } finally {
            setSaving(false);
        }
    };

    const avatarLetter = (store?.storeName || user?.name || 'S').charAt(0).toUpperCase();
    const hasProducts = sellerProducts.length > 0;

    const handleAddProductFromStore = async () => {
        // autosave before leaving
        if (dirty) {
            await saveStore();
        }
        router.push({ pathname: '/addProduct', params: { fromStore: '1' } });
    };

    const openPreview = () => {
        if (dirty) {
            setShowPreviewPrompt(true);
        } else {
            setPreviewVisible(true);
        }
    };

    const renderPreviewProducts = (items: ListedProductType[], showSalePrice?: boolean) => {
        if (!items.length) {
            return <Text style={styles.previewEmptyText}>No products selected yet.</Text>;
        }

        return (
            <View style={styles.previewGrid}>
                {items.map((product) => (
                    <View
                        key={product.id}
                        style={[
                            styles.container2,
                            { backgroundColor: dark ? COLORS.dark2 : COLORS.white }
                        ]}
                    >
                        <View style={[
                            styles.imageContainer,
                            { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }
                        ]}>
                            <Image
                                source={product.image}
                                resizeMode="cover"
                                style={styles.image}
                            />
                        </View>
                        <Text style={[
                            styles.name,
                            { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }
                        ]}>
                            {product.name}
                        </Text>
                        <View style={styles.viewContainer}>
                            <FontAwesome name="star-half-o" size={14} color={dark ? COLORS.white : COLORS.primary} />
                            <Text style={[
                                styles.location,
                                { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }
                            ]}>
                                {" "}{product.rating} |
                            </Text>
                            <View style={[
                                styles.soldContainer,
                                { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }
                            ]}>
                                <Text style={[
                                    styles.soldText,
                                    { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }
                                ]}>
                                    {product.sold} sold
                                </Text>
                            </View>
                        </View>
                        <View style={styles.bottomPriceContainer}>
                            <View style={styles.priceContainer}>
                                <Text style={[
                                    styles.price,
                                    { color: dark ? COLORS.white : COLORS.primary }
                                ]}>
                                    PKR {showSalePrice && product.salePrice ? product.salePrice : product.price}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderPreviewSection = (section: SectionConfig) => {
        if (!section.visible) return null;
        const headingStyle = [styles.previewSectionTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }];
        if (section.key === 'banner') {
            return (
                <View key={section.key} style={{ gap: 8 }}>
                    <Text style={headingStyle}>{SECTION_LABELS.banner}</Text>
                    {banner?.uri ? (
                        <Image source={banner} resizeMode="cover" style={{ width: '100%', height: 180, borderRadius: 12 }} />
                    ) : (
                        <View style={styles.previewPlaceholder}>
                            <Text style={styles.previewEmptyText}>No banner uploaded.</Text>
                        </View>
                    )}
                </View>
            );
        }
        if (section.key === 'salesBanner') {
            return (
                <View key={section.key} style={{ gap: 8 }}>
                    <Text style={headingStyle}>{SECTION_LABELS.salesBanner}</Text>
                    {salesBanner?.uri ? (
                        <Image source={salesBanner} resizeMode="cover" style={{ width: '100%', height: 180, borderRadius: 12 }} />
                    ) : (
                        <View style={styles.previewPlaceholder}>
                            <Text style={styles.previewEmptyText}>No sales banner uploaded.</Text>
                        </View>
                    )}
                </View>
            );
        }
        if (section.key === 'featured') {
            return (
                <View key={section.key} style={{ gap: 8 }}>
                    <Text style={headingStyle}>{SECTION_LABELS.featured}</Text>
                    {renderPreviewProducts(featuredSelected)}
                </View>
            );
        }
        if (section.key === 'sale') {
            return (
                <View key={section.key} style={{ gap: 8 }}>
                    <Text style={headingStyle}>{SECTION_LABELS.sale}</Text>
                    {renderPreviewProducts(salesSelected, true)}
                </View>
            );
        }
        return (
            <View key={section.key} style={{ gap: 8 }}>
                <Text style={headingStyle}>{SECTION_LABELS[section.key] || section.component || section.key}</Text>
                <Text style={styles.previewEmptyText}>[ Auto-generated by system ]</Text>
            </View>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    {renderHeader()}
                    <ScrollView style={styles.container}>
                        {/* Cover */}
                        <View style={styles.coverWrapper}>
                            {cover?.uri ? (
                                <Image source={cover} style={styles.coverImage} resizeMode="cover" />
                            ) : (
                                <View style={[styles.coverImage, { backgroundColor: COLORS.silver }]} />
                            )}
                            <TouchableOpacity style={styles.editCoverButton} onPress={() => pickImage('cover')}>

                                <Image
                                    source={icons.editPencil}
                                    resizeMode='contain'
                                    style={[styles.pencilIcon, {
                                        tintColor: dark ? COLORS.white : COLORS.white
                                    }]}
                                />
                                <Text style={styles.editCoverText}>Edit Cover</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.logoContainer}>
                                {logo?.uri ? (
                                    <Image source={logo} style={styles.logo} resizeMode="cover" />
                                ) : (
                                    <View style={[styles.logo, { backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' }]}>
                                        <Text style={{ color: COLORS.white, fontFamily: 'bold', fontSize: 18 }}>{avatarLetter}</Text>
                                    </View>
                                )}
                                <TouchableOpacity onPress={() => pickImage('logo')} style={styles.pickImage}>
                                    <MaterialCommunityIcons
                                        name="pencil-outline" size={20} color={COLORS.white} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </View>


                        {/* Store Info */}


                        <View style={styles.infoContainer}>
                            <Text style={styles.storeName}>{store?.storeName || user?.name || 'Store'}</Text>
                            <Text style={styles.secondary}>
                                {(store?.itemsSold ?? 0)} items sold
                            </Text>
                            <Text style={styles.rating}>
                                {("★".repeat(Math.round(store?.averageRating || 0)) || "★")} ({store?.reviewsCount ?? 0} reviews)
                            </Text>

                        </View>

                        {/* Description */}
                        <View style={{ padding: 15 }}>
                            <Text style={styles.secondary}>Store Bio</Text>
                            {editing ? (
                                <TextInput
                                    value={description}
                                    onChangeText={(val) => {
                                        setDescription(val);
                                        setDirty(true);
                                    }}
                                    multiline
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                                        },
                                    ]}
                                />
                            ) : (
                                <TouchableOpacity onPress={() => setEditing(true)}
                                    style={[
                                        styles.textArea,
                                        {
                                            backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                                        },
                                    ]}>
                                    <Text style={styles.text}>{description}</Text>
                                </TouchableOpacity>
                            )}
                        </View>


                        {/* Tabs */}
                        <View style={styles.tabRow}>
                            {['Store', 'Products', 'Sale'].map((tab) => (
                                <TouchableOpacity key={tab} onPress={() => setSelectedTab(tab)}>
                                    <Text style={[styles.tab, selectedTab === tab && styles.activeTab]}>{tab}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {selectedTab === 'Store' && (
                            <>
                                {sections.map((section, index) => (
                                    <View key={section.key} style={styles.sectionBox}>
                                        <View style={styles.sectionHeader}>
                                            <Text style={styles.sectionTitle}>{section.component}</Text>
                                            <View style={styles.iconRow}>
                                                <TouchableOpacity onPress={() => moveSection(index, 'up')}>
                                                    <Image source={icons.arrowUp} resizeMode='contain' style={styles.icon} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => moveSection(index, 'down')}>
                                                    <Image source={icons.arrowDown} resizeMode='contain' style={styles.icon2} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => toggleVisibility(index)}>
                                                    <Image source={section.visible ? icons.show : icons.hide} resizeMode='contain' style={styles.icon2} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>

                                        {section.visible && (
                                            <View style={{ padding: 10 }}>
                                                {/* You can conditionally render content based on section.key */}
                                                {section.key === 'banner' && (
                                                    <View style={{ marginBottom: 0 }}>
                                                        {banner?.uri ? (
                                                            <View style={{ position: 'relative' }}>
                                                                <Image
                                                                    source={banner}
                                                                    resizeMode="cover"
                                                                    style={{
                                                                        width: '100%',
                                                                        height: 200,
                                                                        borderRadius: 10,

                                                                    }}
                                                                />
                                                                <TouchableOpacity
                                                                    onPress={() => pickImage('banner')}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        bottom: 10,
                                                                        right: 10,
                                                                        backgroundColor: '#000',
                                                                        paddingVertical: 6,
                                                                        paddingHorizontal: 12,
                                                                        borderRadius: 6,
                                                                        flexDirection: 'row',
                                                                        alignItems: 'center',
                                                                        gap: 6,
                                                                    }}
                                                                >
                                                                    <Image
                                                                        source={icons.editPencil}
                                                                        resizeMode="contain"
                                                                        style={{ width: 14, height: 14, tintColor: COLORS.white }}
                                                                    />
                                                                    <Text style={{ color: COLORS.white, fontFamily: 'medium' }}>Edit</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        ) : (
                                                            <TouchableOpacity
                                                                onPress={() => pickImage('banner')}
                                                                style={{
                                                                    width: '100%',
                                                                    height: 200,
                                                                    backgroundColor: COLORS.silver,
                                                                    borderRadius: 10,
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                <Text style={{ fontFamily: 'medium', color: '#666' }}>+ Add Banner</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                )}

                                                {section.key === 'featured' && (
                                                    hasProducts ? (
                                                        <View>
                                                            <Text style={[styles.text2, { marginBottom: 6 }]}>Search Products</Text>
                                                            <TextInput
                                                                value={search}
                                                                onChangeText={setSearch}
                                                                placeholder="Search product..."
                                                                placeholderTextColor="gray"
                                                                onFocus={() => setIsFocused(true)}
                                                                onBlur={() => setIsFocused(false)}
                                                                style={[
                                                                    styles.searchInput,
                                                                    isFocused && styles.searchInputFocus
                                                                ]}
                                                            />

                                                            {search.trim().length > 0 && filteredListed.length === 0 && (
                                                                <Text style={{ fontFamily: 'regular', color: COLORS.grayscale700 }}>No products found.</Text>
                                                            )}

                                                            {search.trim().length > 0 && filteredListed.length > 0 && (
                                                                filteredListed.slice(0, 5).map((product) => (
                                                                    <TouchableOpacity
                                                                        key={product.id}
                                                                        onPress={() => handleAddFeatured(product)}
                                                                        style={{
                                                                            flexDirection: 'row',
                                                                            alignItems: 'center',
                                                                            backgroundColor: '#f9f9f9',
                                                                            borderRadius: 8,
                                                                            padding: 8,
                                                                            marginBottom: 8,
                                                                            gap: 10
                                                                        }}
                                                                    >
                                                                        <Image
                                                                            source={product.image}
                                                                            style={{ width: 40, height: 40, borderRadius: 6 }}
                                                                            resizeMode="cover"
                                                                        />
                                                                        <Text style={{ fontFamily: 'regular', flex: 1 }}>{product.name}</Text>
                                                                        <Text style={{ fontFamily: 'bold', color: '#000' }}>+ Add</Text>
                                                                    </TouchableOpacity>
                                                                ))
                                                            )}

                                                            <View style={{ marginTop: 20 }}>
                                                                <Text style={[styles.text2, { fontWeight: 'bold', marginBottom: 10 }]}>
                                                                    Selected Products (Max 12)
                                                                </Text>

                                                                {featuredSelected.length === 0 ? (
                                                                    <Text style={{ fontFamily: 'regular', color: 'gray' }}>No products selected yet.</Text>
                                                                ) : (
                                                                    <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 10 }}>
                                                                        {featuredSelected.map((product) => (

                                                                            <TouchableOpacity
                                                                                key={product.id}
                                                                                style={[
                                                                                    styles.container2,
                                                                                    { backgroundColor: dark ? COLORS.dark2 : COLORS.white }
                                                                                ]}
                                                                            >
                                                                                <View style={[
                                                                                    styles.imageContainer,
                                                                                    { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }
                                                                                ]}>
                                                                                    <Image
                                                                                        source={product.image}
                                                                                        resizeMode="cover"
                                                                                        style={styles.image}
                                                                                    />
                                                                                </View>
                                                                                <TouchableOpacity style={styles.favouriteContainer} onPress={() => handleRemoveFeatured(product.id)}>
                                                                                    <Image
                                                                                        source={icons.cancelSquare}
                                                                                        resizeMode="contain"
                                                                                        style={styles.heartIcon}
                                                                                    />
                                                                                </TouchableOpacity>
                                                                                <Text style={[
                                                                                    styles.name,
                                                                                    { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }
                                                                                ]}>
                                                                                    {product.name}
                                                                                </Text>
                                                                                <View style={styles.viewContainer}>
                                                                                    <FontAwesome name="star-half-o" size={14} color={dark ? COLORS.white : COLORS.primary} />
                                                                                    <Text style={[
                                                                                        styles.location,
                                                                                        { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }
                                                                                    ]}>
                                                                                        {" "}{product.rating} |
                                                                                    </Text>
                                                                                    <View style={[
                                                                                        styles.soldContainer,
                                                                                        { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }
                                                                                    ]}>
                                                                                        <Text style={[
                                                                                            styles.soldText,
                                                                                            { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }
                                                                                        ]}>
                                                                                            {product.sold} sold
                                                                                        </Text>
                                                                                    </View>
                                                                                </View>
                                                                                <View style={styles.bottomPriceContainer}>
                                                                                    <View style={styles.priceContainer}>
                                                                                        <Text style={[
                                                                                            styles.price,
                                                                                            { color: dark ? COLORS.white : COLORS.primary }
                                                                                        ]}>
                                                                                            PKR {product.price}
                                                                                        </Text>
                                                                                    </View>
                                                                                </View>
                                                                            </TouchableOpacity>

                                                                        ))}
                                                                    </View>
                                                                )}
                                                            </View>
                                                        </View>
                                                    ) : (
                                                        <View style={styles.emptyStateCard}>
                                                            <Text style={styles.emptyStateText}>No products yet.</Text>
                                                            <ButtonFilled title="Add New Product" style={{ width: '100%' }} onPress={handleAddProductFromStore} />
                                                        </View>
                                                    )
                                                )}
                                                {section.key === 'salesBanner' && (
                                                    <View>
                                                        {salesBanner?.uri ? (
                                                            <View style={{ position: 'relative' }}>
                                                                <Image
                                                                    source={salesBanner}
                                                                    resizeMode="cover"
                                                                    style={{
                                                                        width: '100%',
                                                                        height: 200,
                                                                        borderRadius: 10,
                                                                    }}
                                                                />
                                                                <TouchableOpacity
                                                                    onPress={() => pickImage('salesBanner')}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        bottom: 10,
                                                                        right: 10,
                                                                        backgroundColor: '#000',
                                                                        paddingVertical: 6,
                                                                        paddingHorizontal: 12,
                                                                        borderRadius: 6,
                                                                        flexDirection: 'row',
                                                                        alignItems: 'center',
                                                                        gap: 6,
                                                                    }}
                                                                >
                                                                    <Image
                                                                        source={icons.editPencil}
                                                                        resizeMode="contain"
                                                                        style={{ width: 14, height: 14, tintColor: COLORS.white }}
                                                                    />
                                                                    <Text style={{ color: COLORS.white, fontFamily: 'medium' }}>Edit</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        ) : (
                                                            <TouchableOpacity
                                                                onPress={() => pickImage('salesBanner')}
                                                                style={{
                                                                    width: '100%',
                                                                    height: 200,
                                                                    backgroundColor: COLORS.silver,
                                                                    borderRadius: 10,
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                <Text style={{ fontFamily: 'medium', color: '#666' }}>+ Add Sales Banner</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                )}

                                                {section.key === 'sale' && (
                                                    hasProducts ? (
                                                        <View>
                                                            <Text style={[styles.text2, { marginBottom: 6 }]}>Search Products</Text>
                                                            <TextInput
                                                                value={search2}
                                                                onChangeText={setSearch2}
                                                                placeholder="Search product..."
                                                                placeholderTextColor="gray"
                                                                onFocus={() => setIsFocused(true)}
                                                                onBlur={() => setIsFocused(false)}
                                                                style={[
                                                                    styles.searchInput,
                                                                    isFocused && styles.searchInputFocus
                                                                ]}
                                                            />

                                                            {search2.trim().length > 0 && filteredSalesListed.length === 0 && (
                                                                <Text style={{ fontFamily: 'regular', color: COLORS.grayscale700 }}>No products found.</Text>
                                                            )}

                                                            {search2.trim().length > 0 && filteredSalesListed.length > 0 && (
                                                                filteredSalesListed.slice(0, 5).map((product) => (
                                                                    <TouchableOpacity
                                                                        key={product.id}
                                                                        onPress={() => handleAddSales(product)}
                                                                        style={{
                                                                            flexDirection: 'row',
                                                                            alignItems: 'center',
                                                                            backgroundColor: '#f9f9f9',
                                                                            borderRadius: 8,
                                                                            padding: 8,
                                                                            marginBottom: 8,
                                                                            gap: 10
                                                                        }}
                                                                    >
                                                                        <Image
                                                                            source={product.image}
                                                                            style={{ width: 40, height: 40, borderRadius: 6 }}
                                                                            resizeMode="cover"
                                                                        />
                                                                        <Text style={{ fontFamily: 'regular', flex: 1 }}>{product.name}</Text>
                                                                        <Text style={{ fontFamily: 'bold', color: '#000' }}>+ Add</Text>
                                                                    </TouchableOpacity>
                                                                ))
                                                            )}

                                                            <View style={{ marginTop: 20 }}>
                                                                <Text style={[styles.text2, { fontWeight: 'bold', marginBottom: 10 }]}>
                                                                    Selected Products (Max 12)
                                                                </Text>

                                                                {salesSelected.length === 0 ? (
                                                                    <Text style={{ fontFamily: 'regular', color: 'gray' }}>No products selected yet.</Text>
                                                                ) : (
                                                                    <View style={{ flexWrap: 'wrap', flexDirection: 'row', gap: 10 }}>
                                                                        {salesSelected.map((product) => (

                                                                            <TouchableOpacity
                                                                                key={product.id}
                                                                                style={[
                                                                                    styles.container2,
                                                                                    { backgroundColor: dark ? COLORS.dark2 : COLORS.white }
                                                                                ]}
                                                                            >
                                                                                <View style={[
                                                                                    styles.imageContainer,
                                                                                    { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }
                                                                                ]}>
                                                                                    <Image
                                                                                        source={product.image}
                                                                                        resizeMode="cover"
                                                                                        style={styles.image}
                                                                                    />
                                                                                </View>
                                                                                <TouchableOpacity style={styles.favouriteContainer} onPress={() => handleRemoveSales(product.id)}>
                                                                                    <Image
                                                                                        source={icons.cancelSquare}
                                                                                        resizeMode="contain"
                                                                                        style={styles.heartIcon}
                                                                                    />
                                                                                </TouchableOpacity>
                                                                                <Text style={[
                                                                                    styles.name,
                                                                                    { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }
                                                                                ]}>
                                                                                    {product.name}
                                                                                </Text>
                                                                                <View style={styles.viewContainer}>
                                                                                    <FontAwesome name="star-half-o" size={14} color={dark ? COLORS.white : COLORS.primary} />
                                                                                    <Text style={[
                                                                                        styles.location,
                                                                                        { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }
                                                                                    ]}>
                                                                                        {" "}{product.rating} |
                                                                                    </Text>
                                                                                    <View style={[
                                                                                        styles.soldContainer,
                                                                                        { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }
                                                                                    ]}>
                                                                                        <Text style={[
                                                                                            styles.soldText,
                                                                                            { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }
                                                                                        ]}>
                                                                                            {product.sold} sold
                                                                                        </Text>
                                                                                    </View>
                                                                                </View>
                                                                                <View style={styles.bottomPriceContainer}>
                                                                                    <View style={styles.priceContainer}>
                                                                                        <Text style={[
                                                                                            styles.price,
                                                                                            { color: dark ? COLORS.white : COLORS.primary }
                                                                                        ]}>
                                                                                            PKR {product.price}
                                                                                        </Text>
                                                                                    </View>
                                                                                </View>
                                                                            </TouchableOpacity>

                                                                        ))}
                                                                    </View>
                                                                )}
                                                            </View>
                                                        </View>
                                                    ) : (
                                                        <View style={styles.emptyStateCard}>
                                                            <Text style={styles.emptyStateText}>No products yet.</Text>
                                                            <ButtonFilled title="Add New Product" style={{ width: '100%' }} onPress={handleAddProductFromStore} />
                                                        </View>
                                                    )
                                                )}
                                                {section.key === 'best' && <Text style={styles.text}>[ Auto-generated by system ]</Text>}
                                                {section.key === 'reviews' && <Text style={styles.text}>[ Auto-generated by system ]</Text>}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </>
                        )}

                        {selectedTab === 'Products' && renderPopularProducts()}
                        {selectedTab === 'Sale' && renderSalesProducts()}





                    </ScrollView>
                    {/* Actions */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.saveBtn}
                            onPress={() => refRBSheet.current.open()}
                        >
                            <Text style={[styles.saveBtnText, { color: COLORS.white }]}>{saving ? 'Saving...' : 'Save'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.cancelBtn, {
                                borderColor: dark ? COLORS.white : COLORS.primary
                            }]}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={[styles.cancelBtnText, {
                                color: dark ? COLORS.white : COLORS.primary,
                            }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <RBSheet
                    ref={refRBSheet}
                    closeOnPressMask={true}
                    height={200}
                    customStyles={{
                        wrapper: {
                            backgroundColor: "rgba(0,0,0,0.5)",
                        },
                        draggableIcon: {
                            backgroundColor: dark ? COLORS.greyscale300 : COLORS.greyscale300,
                        },
                        container: {
                            borderTopRightRadius: 32,
                            borderTopLeftRadius: 32,
                            height: 200,
                            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                            alignItems: "center",
                            width: "100%"
                        }
                    }}>
                    <Text style={[styles.bottomSubtitle, {
                        color: dark ? COLORS.black : COLORS.black
                    }]}>Save Changes</Text>
                    <View style={[styles.separateLine, {
                        backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                    }]} />

                    <View style={styles.selectedCancelContainer}>
                        <Text style={[styles.cancelTitle, {
                            color: dark ? COLORS.secondaryWhite : COLORS.greyscale900
                        }]}>Are you sure you want to save the changes?</Text>

                    </View>

                    <View style={styles.bottomContainer}>
                        <Button
                            title="Cancel"
                            style={{
                                width: (SIZES.width - 32) / 2 - 8,
                                backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                                borderRadius: 32,
                                borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary
                            }}
                            textColor={dark ? COLORS.white : COLORS.primary}
                            onPress={() => refRBSheet.current.close()}
                        />
                        <ButtonFilled
                            title="Yes, Save"
                            style={styles.removeButton}
                            onPress={async () => {
                                refRBSheet.current.close();
                                await saveStore();
                            }}
                        />
                    </View>
                </RBSheet>

                {/* Preview prompt */}
                <Modal
                    transparent
                    visible={showPreviewPrompt}
                    animationType="fade"
                    onRequestClose={() => setShowPreviewPrompt(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
                            <Text style={[styles.modalTitle, { color: dark ? COLORS.white : COLORS.black }]}>Unsaved changes</Text>
                            <Text style={[styles.modalSubtitle, { color: dark ? COLORS.grayscale200 : COLORS.greyscale600 }]}>
                                Save changes before preview?
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                                <Button
                                    title="Undo and Preview"
                                    style={{ flex: 1, backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary, borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary }}
                                    textColor={dark ? COLORS.white : COLORS.primary}
                                    onPress={() => {
                                        setShowPreviewPrompt(false);
                                        if (store) {
                                            syncStoreState(store);
                                            setFeaturedSelected(selectProductsByIds(store.featuredProductIds || [], sellerProducts));
                                            const salePool = sellerProducts.filter(isOnSaleProduct);
                                            setSalesSelected(selectSaleProductsByIds(store.saleProductIds || [], salePool));
                                        }
                                        setDirty(false);
                                        setPreviewVisible(true);
                                    }}
                                />
                                <ButtonFilled
                                    title="Save & Preview"
                                    style={{ flex: 1 }}
                                    onPress={async () => {
                                        await saveStore();
                                        setShowPreviewPrompt(false);
                                        setPreviewVisible(true);
                                    }}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>
                <Modal
                    visible={previewVisible}
                    animationType="slide"
                    onRequestClose={() => setPreviewVisible(false)}
                >
                    <StorePreview sellerId={user?.id || store?._id} embedded onClose={() => setPreviewVisible(false)} />
                </Modal>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.white,


    },
    headerContainer: {
        flexDirection: "row",
        width: SIZES.width - 6,
        justifyContent: "space-between",
        paddingVertical: 16,
        paddingHorizontal: 16,
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
    pencilIcon: {
        height: 14,
        width: 14,
        color: COLORS.white
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'bold',
        color: COLORS.black,
        marginLeft: 16
    },
    previewHeaderBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        backgroundColor: COLORS.white,
        borderColor: COLORS.primary,
        borderWidth: 1.2,
    },
    coverImage: { width: width, height: height * 0.25 },
    logoContainer: { width: 150, flexDirection: 'row', alignItems: 'center', padding: 15, marginTop: -80 },
    logo: {
        width: 150,
        height: 150,
        borderRadius: 100,
        borderWidth: 3,
        borderColor: '#000',
        backgroundColor: COLORS.white
    },
    infoContainer: { marginLeft: 175, marginTop: -30 },
    storeName: { fontSize: 22, fontFamily: 'bold', color: '#000', marginBottom: 5 },
    secondary: { fontFamily: 'medium', fontSize: 14, color: '#000', marginBottom: 10 },
    rating: { fontFamily: 'medium', color: '#000' },
    text: { fontFamily: 'regular', color: '#333', },
    text2: { fontFamily: 'bold', fontSize: 14, color: '#00', },
    textArea: {
        width: "100%",
        backgroundColor: COLORS.tansparentPrimary,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderColor: COLORS.primary,
        paddingVertical: 12

    },
    tabRow: {
        width: '45.8%',
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.black,
        gap: 10,
        alignSelf: 'center',
        backgroundColor: COLORS.tansparentPrimary
    },
    tab: { fontFamily: 'medium', color: '#000', padding: 10 },
    activeTab: {
        backgroundColor: '#000',
        color: '#fff',
        borderRadius: 12
    },
    sectionBox: {
        margin: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10
    },
    sectionCard: {
        marginHorizontal: 15,
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.grayscale200,
    },
    sectionHeader: {
        backgroundColor: '#000',
        padding: 10,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    sectionTitle: { fontFamily: 'bold', color: 'white' },
    sectionSubtitle: {
        fontFamily: 'regular',
        fontSize: 12,
        marginBottom: 12,
    },
    sectionLabel: {
        fontFamily: 'semiBold',
        fontSize: 14,
        marginTop: 8,
        marginBottom: 6,
    },
    iconRow: { flexDirection: 'row', gap: 10 },
    icon: { width: 14, height: 14, tintColor: 'white', marginTop: 2 },
    icon2: { width: 18, height: 18, tintColor: 'white' },
    searchInput: {
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    chip: {
        borderWidth: 1,
        borderColor: COLORS.grayscale200,
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    chipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        fontFamily: 'regular',
        color: COLORS.black,
    },
    chipTextActive: {
        color: COLORS.white,
    },
    selectionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: COLORS.tansparentPrimary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.primary,
        gap: 6,
    },
    pillText: {
        fontFamily: 'regular',
        color: COLORS.primary,
    },
    pillRemove: {
        fontFamily: 'bold',
        color: COLORS.primary,
    },
    previewOverlay: {
        flex: 1,
        backgroundColor: '#000000aa',
        justifyContent: 'center',
        alignItems: 'center'
    },
    previewImage: { width: width * 0.9, height: height * 0.7 },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16
    },
    previewLogoWrapper: {
        position: 'absolute',
        bottom: -40,
        left: 16,
        zIndex: 5,
        alignItems: 'center',
        justifyContent: 'center'
    },
    previewLogo: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: COLORS.white,
        backgroundColor: COLORS.white,
        elevation: 3
    },
    previewInfoContainer: {
        marginLeft: 175,
        marginTop: -30,
        paddingBottom: 12,
    },
    previewSectionTitle: {
        fontFamily: 'bold',
        fontSize: 16,
        color: COLORS.greyscale900
    },
    previewGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    previewPlaceholder: {
        width: '100%',
        height: 180,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.tansparentPrimary
    },
    previewEmptyText: {
        fontFamily: 'regular',
        color: COLORS.grayscale700
    },
    coverWrapper: {
        position: 'relative',
        width: width,
        height: height * 0.3,
    },
    editCoverButton: {
        position: 'absolute',
        bottom: 50,
        right: 10,
        backgroundColor: '#000000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        flexDirection: 'row',
        gap: 5
    },
    editCoverText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: 'medium',
    },
    pickImage: {
        height: 42,
        width: 42,
        borderRadius: 21,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        bottom: 10,
        right: -10,
    },
    input: {
        width: "100%",

        backgroundColor: COLORS.tansparentPrimary,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderColor: COLORS.primary,
        paddingVertical: 12,
        borderWidth: 1
    },
    searchInputFocus: {
        borderWidth: 1,
        borderColor: COLORS.black
    },
    emptyStateCard: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: COLORS.tansparentPrimary,
        alignItems: 'center',
        gap: 8
    },
    emptyStateText: {
        fontFamily: 'regular',
        color: COLORS.grayscale700
    },
    container2: {
        flexDirection: "column",
        width: (SIZES.width - 36) / 2 - 12,
        backgroundColor: COLORS.white,
        padding: 6,
        borderRadius: 16,
        marginBottom: 12,
        marginRight: 4
    },
    imageContainer: {
        width: "100%",
        height: 160,
        borderRadius: 16,
        backgroundColor: COLORS.silver
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 16
    },
    name: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.greyscale900,
        marginVertical: 4
    },
    location: {
        fontSize: 12,
        fontFamily: "regular",
        color: COLORS.grayscale700,
        marginVertical: 4
    },
    bottomPriceContainer: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center"
    },
    price: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.primary,
        marginRight: 8
    },
    heartIcon: {
        width: 16,
        height: 16,
        tintColor: COLORS.white,
    },
    favouriteContainer: {
        position: "absolute",
        top: 16,
        right: 16,
        width: 28,
        height: 28,
        borderRadius: 9999,
        backgroundColor: COLORS.primary,
        zIndex: 999,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center"
    },
    viewContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
        marginBottom: 6,
        gap: 5,
    },
    soldContainer: {
        width: 66,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
        backgroundColor: COLORS.silver
    },
    soldText: {
        fontSize: 12,
        fontFamily: "medium",
        color: COLORS.grayscale700,
        marginVertical: 4
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        // justifyContent: "space-between",
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 24,
        marginBottom: -16


    },
    cancelBtn: {
        width: '50%',
        height: 58,
        borderRadius: 32,
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",

        borderColor: COLORS.primary,
        borderWidth: 1.4,
    },

    cancelBtnText: {
        fontSize: 16,
        fontFamily: "bold",
        color: COLORS.primary,

    },
    previewBtn: {
        width: '30%',
        height: 58,
        borderRadius: 32,
        backgroundColor: COLORS.tansparentPrimary,
        alignItems: "center",
        justifyContent: "center",
        borderColor: COLORS.primary,
        borderWidth: 1.4,
    },
    saveBtn: {
        width: '50%',
        height: 58,
        borderRadius: 32,
        backgroundColor: COLORS.black,
        alignItems: "center",
        justifyContent: "center",

        borderColor: COLORS.primary,
        borderWidth: 1.4,

    },
    saveBtnText: {
        fontSize: 16,
        fontFamily: "bold",
        color: COLORS.white,
    },
    bottomSubtitle: {
        fontSize: 22,
        fontFamily: "bold",

        textAlign: "center",
        marginTop: 12

    },
    selectedCancelContainer: {
        marginVertical: 12,
        paddingHorizontal: 36,
        width: "100%"
    },
    cancelTitle: {
        fontSize: 18,
        fontFamily: "semiBold",
        color: COLORS.greyscale900,
        textAlign: "center",
    },
    cancelSubtitle: {
        fontSize: 14,
        fontFamily: "regular",
        color: COLORS.grayscale700,
        textAlign: "center",
        marginVertical: 8,
        marginTop: 16
    },
    bottomContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginVertical: 12,
        paddingHorizontal: 16,
        width: "100%"
    },
    separateLine: {
        width: "100%",
        height: .7,
        backgroundColor: COLORS.greyScale800,
        marginVertical: 12
    },
    removeButton: {
        width: (SIZES.width - 32) / 2 - 8,
        backgroundColor: COLORS.primary,
        borderRadius: 32
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    modalCard: {
        width: SIZES.width - 48,
        borderRadius: 16,
        padding: 16
    },
    modalTitle: {
        fontFamily: 'bold',
        fontSize: 18
    },
    modalSubtitle: {
        fontFamily: 'regular',
        fontSize: 14,
        marginTop: 6
    }
});
