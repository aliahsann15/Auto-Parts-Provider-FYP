import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, FlatList, ActivityIndicator, ScrollView, Keyboard, Modal, TouchableWithoutFeedback } from 'react-native';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { COLORS, SIZES, icons, images as imageAssets } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ratings, sorts } from '../data';
import { fetchPublicProducts, Product as ApiProduct, fetchCategories, Category as ApiCategory } from '@/utils/api/products';
import { fetchCarMakes, fetchCarModels, CarModel } from '@/utils/api/carData';
import { API_BASE_URL } from '@/utils/api/client';
import RBSheet from "react-native-raw-bottom-sheet";
import Button from '../components/Button';
import { useTheme } from '../theme/ThemeProvider';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { FontAwesome } from "@expo/vector-icons";
import ProductCard from '../components/ProductCard';
import { NavigationProp } from '@react-navigation/native';
import NotFoundCard from '@/components/NotFoundCard';
import { useNavigation, useRouter } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';

interface SliderHandleProps {
    enabled: boolean;
    markerStyle: object;
}

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

// Map sort ID to backend sort value
const mapSortIdToBackendValue = (sortId: string): string => {
    const sortMap: Record<string, string> = {
        "1": "popular",
        "2": "newest",
        "3": "sale_desc",
        "4": "price_asc",   // low to high
        "5": "price_desc",  // high to low
    };
    return sortMap[sortId] || "popular";
};

// Map rating ID to min/max range
const mapRatingIdToRange = (ratingId: string): { min?: number; max?: number } => {
    const ratingMap: Record<string, { min?: number; max?: number }> = {
        "1": {},                 // All
        "6": { min: 4.5 },                 // rounds to 5
        "5": { min: 3.5, max: 4.4999 },    // rounds to 4
        "4": { min: 2.5, max: 3.4999 },    // rounds to 3
        "3": { min: 1.5, max: 2.4999 },    // rounds to 2
        "2": { min: 0,   max: 1.4999 },    // rounds to 1
    };
    return ratingMap[ratingId] || {};
};


const Search = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const router = useRouter();
    const refRBSheet = useRef<any>(null);
    const { dark, colors } = useTheme();
    const DEFAULT_MIN_PRICE = 0;
    const DEFAULT_MAX_PRICE = 100000;
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedSorts, setSelectedSorts] = useState(["1"]);
    const [selectedRating, setSelectedRating] = useState(["1"]);
    const [priceRange, setPriceRange] = useState<[number, number]>([DEFAULT_MIN_PRICE, DEFAULT_MAX_PRICE]);
    const [priceRangeDirty, setPriceRangeDirty] = useState(false);
    const [priceBounds, setPriceBounds] = useState({ min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState<ApiProduct[]>([]);
    const [resultsCount, setResultsCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [hasMore, setHasMore] = useState(true);
    const [apiCategories, setApiCategories] = useState<ApiCategory[]>([]);
    const [categoryFallbackProducts, setCategoryFallbackProducts] = useState<ApiProduct[]>([]);
    const [makes, setMakes] = useState<string[]>([]);
    const [selectedMake, setSelectedMake] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [selectedVariant, setSelectedVariant] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectModal, setSelectModal] = useState<{ visible: boolean; type: 'make' | 'model' | 'variant' | 'year'; options: { label: string; value: string }[] }>({ visible: false, type: 'make', options: [] });
    const [models, setModels] = useState<string[]>([]);
    const [modelsRaw, setModelsRaw] = useState<CarModel[]>([]);
    const [variants, setVariants] = useState<string[]>([]);
    const [years, setYears] = useState<string[]>([]);
    const [optionSearch, setOptionSearch] = useState('');
    const filtersActive = React.useMemo(() => {
        const anyCategories = selectedCategories.length > 0;
        const anyMakes = !!selectedMake;
        const anyModel = !!selectedModel;
        const anyVariant = !!selectedVariant;
        const anyYear = !!selectedYear;
        const nonDefaultRating = selectedRating[0] !== '1';
        const priceChanged = priceRangeDirty;
        const nonDefaultSort = selectedSorts[0] !== '1';
        const searchSet = !!debouncedQuery;
        return anyCategories || anyMakes || anyModel || anyVariant || anyYear || nonDefaultRating || priceChanged || nonDefaultSort || searchSet;
    }, [selectedCategories, selectedMake, selectedModel, selectedVariant, selectedYear, selectedRating, priceRangeDirty, selectedSorts, debouncedQuery]);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const apiBase = API_BASE_URL.replace(/\/api$/, '');
    const priceRangeRef = useRef<[number, number]>([DEFAULT_MIN_PRICE, DEFAULT_MAX_PRICE]);
    const priceBoundsRef = useRef<{ min: number; max: number }>({ min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE });
    const priceRangeDirtyRef = useRef(false);
    const hasMoreRef = useRef(hasMore);
    const loadingMoreRef = useRef(loadingMore);
    const categoryMapRef = useRef<Record<string, string>>({});
    const { user } = useAuth();
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
        (list: ApiProduct[]) => {
            if (!interests.length) return list;
            const matches: ApiProduct[] = [];
            const others: ApiProduct[] = [];
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

    const filteredModalOptions = useMemo(() => {
        const needle = optionSearch.toLowerCase();
        return selectModal.options.filter(opt => opt.label.toLowerCase().includes(needle));
    }, [selectModal.options, optionSearch]);
    const ratingOptions = useMemo(() => [{ id: '0', title: 'No Rating' }, ...ratings], []);

    const handleSliderChange = (values: number[]) => {
        setPriceRange(values as [number, number]);
        priceRangeRef.current = values as [number, number];
    };

    const handleSliderChangeFinish = (values: number[]) => {
        setPriceRange(values as [number, number]);
        priceRangeRef.current = values as [number, number];
        setPriceRangeDirty(true);
        priceRangeDirtyRef.current = true;
        handleSearch({ page: 1 });
    };

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

    // Perform search via API (memoized to avoid unnecessary re-renders)
    const handleSearch = useCallback(async (opts?: { page?: number }) => {
        const pageToLoad = opts?.page || 1;
        const append = pageToLoad > 1;

        if (append && (loadingMoreRef.current || !hasMoreRef.current)) return;

        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setHasMore(true); // reset for fresh query/filter set
        }

        try {
            const params: any = { page: pageToLoad, limit };
            if (debouncedQuery) params.q = debouncedQuery;
            // also search make/model/variant from query
            // server now searches make/model/variant via q
            
            // Map selected category IDs to database _id values
            if (selectedCategories && selectedCategories.length && !selectedCategories.includes('all')) {
                const mappedCatIds = selectedCategories
                    .map(id => categoryMapRef.current[id] || id)
                    .filter(Boolean);
                if (mappedCatIds.length) {
                    params.categories = mappedCatIds.join(',');
                }
            }
            
            const currentRange = priceRangeRef.current;
            const currentBounds = priceBoundsRef.current;
            if (currentRange && currentRange.length === 2) {
                const [min, max] = currentRange;
                if (min !== currentBounds.min) params.minPrice = min;
                if (max !== currentBounds.max) params.maxPrice = max;
            }
            if (selectedMake) params.make = selectedMake;
            if (selectedModel) params.carModel = selectedModel;
            if (selectedVariant) params.variant = selectedVariant;
            if (selectedYear) params.year = selectedYear;
            if (selectedSorts && selectedSorts.length) {
                params.sort = mapSortIdToBackendValue(selectedSorts[0]);
            }
            const ratingNoRating = selectedRating && selectedRating.length && selectedRating[0] === '0';
            if (selectedRating && selectedRating.length && selectedRating[0] !== '1' && selectedRating[0] !== '0') {
                const range = mapRatingIdToRange(selectedRating[0]);
                if (range.min !== undefined) params.minRating = range.min;
                if (range.max !== undefined) params.maxRating = range.max;
                params.sort = params.sort || (range.min ? 'rating_desc' : 'rating_asc');
            }

            const res = await fetchPublicProducts(params as any);
            let products = (res as any).products || [];
            const getRating = (p: any) => {
                const direct = [p?.avgRating, p?.averageRating, p?.rating].find((v: any) => typeof v === 'number' && Number.isFinite(v));
                if (direct !== undefined) return Number(direct);
                const revs = Array.isArray((p as any)?.reviews) ? (p as any).reviews : [];
                if (!revs.length) return 0;
                const sum = revs.reduce((acc: number, r: any) => acc + (Number(r?.rating) || 0), 0);
                return sum / revs.length;
            };
            // client-side filter for make/model/year
            if (selectedMake) {
                products = products.filter((p: any) => (p.make || '').toLowerCase() === selectedMake.toLowerCase());
            }
            if (selectedModel) {
                products = products.filter((p: any) => (p.carModel || p.model || '').toLowerCase() === selectedModel.toLowerCase());
            }
            if (selectedVariant) {
                products = products.filter((p: any) => (p.variant || '').toLowerCase() === selectedVariant.toLowerCase());
            }
            if (selectedYear) {
                const selectedRange = parseYearRange(selectedYear);
                products = products.filter((p: any) => {
                    const prodRange = parseYearRange((p as any)?.year);
                    if (!prodRange || !selectedRange) return false;
                    return prodRange.max >= selectedRange.min && prodRange.min <= selectedRange.max;
                });
            }
            if (ratingNoRating) {
                products = products.filter((p: any) => {
                    const rating = getRating(p);
                    const hasReviews = Array.isArray((p as any)?.reviews) && (p as any).reviews.length > 0;
                    return !hasReviews || !Number.isFinite(rating) || rating <= 0;
                });
            }
            const pagination = (res as any).pagination || { total: products.length, page: pageToLoad, totalPages: 1 };

            const prioritized = prioritizeByInterest(products);
            let combined: ApiProduct[] = [];
            setFilteredProducts(prev => {
                combined = append ? [...prev, ...prioritized] : prioritized;
                return prioritizeByInterest(combined);
            });
            const isUnfiltered =
                !debouncedQuery &&
                selectedCategories.length === 0 &&
                selectedSorts[0] === '1' &&
                selectedRating[0] === '1' &&
                !priceRangeDirty &&
                !selectedMake &&
                !selectedModel &&
                !selectedVariant &&
                !selectedYear;
            if (!append && isUnfiltered) {
                setCategoryFallbackProducts(products);
            }
            const totalFromApi = (res as any)?.pagination?.total;
            if (typeof totalFromApi === 'number') {
                setResultsCount(totalFromApi);
            } else {
                setResultsCount(prev => append ? (prev || 0) + products.length : (combined.length || products.length));
            }
            setPage(pagination.page || pageToLoad);
            const more = (pagination.page || pageToLoad) < (pagination.totalPages || 1);
            const moreAfterFilter = more && products.length > 0;
            setHasMore(moreAfterFilter);
            hasMoreRef.current = moreAfterFilter;
        } catch (err: any) {
            if (!append) {
                setFilteredProducts([]);
                setResultsCount(0);
                setHasMore(false);
                hasMoreRef.current = false;
                setPriceBounds({ min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE });
                priceBoundsRef.current = { min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE };
            }
        } finally {
            if (append) {
                setLoadingMore(false);
                loadingMoreRef.current = false;
            } else {
                setLoading(false);
            }
        }
    }, [debouncedQuery, selectedCategories, selectedSorts, selectedRating, selectedMake, selectedModel, selectedVariant, selectedYear, priceRangeDirty, limit, parseYearRange, prioritizeByInterest]);

    // Debounce search query (300ms delay)
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300) as any;
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [searchQuery]);

    useEffect(() => {
        hasMoreRef.current = hasMore;
    }, [hasMore]);

    useEffect(() => {
        loadingMoreRef.current = loadingMore;
    }, [loadingMore]);

    useEffect(() => {
        priceRangeRef.current = priceRange;
    }, [priceRange]);

    useEffect(() => {
        priceBoundsRef.current = priceBounds;
    }, [priceBounds]);

    useEffect(() => {
        priceRangeDirtyRef.current = priceRangeDirty;
    }, [priceRangeDirty]);

    // Fetch categories on mount and build category map
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const cats = await fetchCategories();
                setApiCategories(cats);
            } catch (err) {
                // ignore
            }
        };
        loadCategories();
    }, []);

    // Fetch makes on mount (from car-data)
    useEffect(() => {
        const loadMakes = async () => {
            try {
                const res = await fetchCarMakes();
                const names: string[] = (Array.isArray((res as any)?.makes) ? (res as any).makes : []).map((m: any) => String(m));
                const unique: string[] = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
                setMakes(unique);
            } catch {
                // ignore
            }
        };
        loadMakes();
    }, []);

    const deriveVariants = useCallback((modelName: string, year?: string | number, source?: CarModel[]) => {
        const list = source || modelsRaw;
        const target = (modelName || '').toLowerCase();
        const normalizedYear =
            typeof year === 'number'
                ? String(year)
                : typeof year === 'string' && /^\d{4}$/.test(year)
                    ? year
                    : undefined;
        const matches = list.filter(m =>
            (m.modelName || '').toLowerCase() === target &&
            (!normalizedYear || String(m.year) === normalizedYear)
        );
        const uniq = Array.from(new Set(matches.flatMap(m => Array.isArray(m.variants) ? m.variants : []).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        return uniq;
    }, [modelsRaw]);

    const deriveYears = useCallback((modelName?: string, variant?: string, source?: CarModel[]) => {
        const list = source || modelsRaw;
        const targetModel = (modelName || '').toLowerCase();
        const targetVariant = (variant || '').toLowerCase();
        let filtered = modelName ? list.filter(m => (m.modelName || '').toLowerCase() === targetModel) : list;
        if (variant) {
            filtered = filtered.filter(m => Array.isArray(m.variants) && m.variants.some(v => (v || '').toLowerCase() === targetVariant));
        }
        const yearsOnly = filtered.map(m => Number(m.year)).filter(y => !Number.isNaN(y));
        if (!yearsOnly.length) return [];
        const min = Math.min(...yearsOnly);
        const max = Math.max(...yearsOnly);
        return [min === max ? String(min) : `${min}-${max}`];
    }, [modelsRaw]);

    // Fetch models when make changes
    useEffect(() => {
        const loadModels = async () => {
            if (!selectedMake) {
                setModels([]);
                setModelsRaw([]);
                setVariants([]);
                setYears([]);
                return;
            }
            try {
                const res = await fetchCarModels(selectedMake);
                const items = (Array.isArray((res as any)?.models) ? (res as any).models : []) as CarModel[];
                setModelsRaw(items);
                const names = Array.from(new Set(items.map((m: CarModel) => String(m.modelName || '')))).sort((a, b) => a.localeCompare(b));
                setModels(names);
                setVariants([]);
                setYears([]);
            } catch (err) {
                setModels([]);
                setModelsRaw([]);
                setVariants([]);
                setYears([]);
            }
        };
        loadModels();
    }, [selectedMake]);

    // Derive years when model changes
    useEffect(() => {
        if (!selectedModel) {
            setVariants([]);
            setYears([]);
            return;
        }
        const nextVariants = deriveVariants(selectedModel, selectedYear);
        setVariants(nextVariants);
        if (selectedVariant && !nextVariants.includes(selectedVariant)) {
            setSelectedVariant('');
        }
        const nextYears = deriveYears(selectedModel, selectedVariant);
        setYears(nextYears);
        if (selectedYear && !nextYears.includes(selectedYear)) {
            setSelectedYear('');
        }
    }, [selectedModel, selectedVariant, selectedYear, modelsRaw, deriveVariants, deriveYears]);

    const categoryOptions = React.useMemo(() => {
        // derive categories from the initial (unfiltered) product set when available
        const source = categoryFallbackProducts.length ? categoryFallbackProducts : filteredProducts;
        const derived = Array.from(new Set(
            source.flatMap((p: any) => (p?.categories || []).map((c: any) => {
                if (!c) return '';
                if (typeof c === 'object') return c._id || c.id || c.name || '';
                return c;
            }))
        ))
            .filter(Boolean)
            .map(id => String(id));

        if (derived.length) {
            const items = derived
                .map((id, idx) => ({ id, name: id || `Category ${idx + 1}` }))
                .sort((a, b) => a.name.localeCompare(b.name));
            return [{ id: 'all', name: 'All' }, ...items];
        }

        if (apiCategories.length) {
            const items = apiCategories
                .map(cat => ({ id: String(cat._id), name: cat.name }))
                .sort((a, b) => a.name.localeCompare(b.name));
            return [{ id: 'all', name: 'All' }, ...items];
        }

        return [{ id: 'all', name: 'All' }];
    }, [apiCategories, categoryFallbackProducts, filteredProducts]);

    const makeOptions = React.useMemo(() => {
        const fromApi = makes.length ? makes.map(m => ({ id: m, name: m })) : [];
        const derived = Array.from(new Set(
            (categoryFallbackProducts.length ? categoryFallbackProducts : filteredProducts)
                .map((p: any) => p?.make)
                .filter(Boolean)
        )).map((mk, idx) => ({ id: String(mk), name: String(mk) || `Make ${idx + 1}` }));
        const combined = [...fromApi];
        derived.forEach(d => {
            if (!combined.find(c => c.id === d.id)) combined.push(d);
        });
        return [{ id: 'all', name: 'All' }, ...combined];
    }, [makes, filteredProducts, categoryFallbackProducts]);

    const modelOptions = React.useMemo(() => {
        if (models.length) return [{ id: 'all', name: 'All Models' }, ...models.map(m => ({ id: m, name: m }))];
        const source = filteredProducts.length ? filteredProducts : categoryFallbackProducts;
        const derived = Array.from(new Set(
            source
                .filter((p: any) => !selectedMake || (p.make || '').toLowerCase() === selectedMake.toLowerCase())
                .map((p: any) => p.carModel || p.model || '')
        )).filter(Boolean);
        return [{ id: 'all', name: 'All Models' }, ...derived.map((m, idx) => ({ id: String(m), name: String(m) || `Model ${idx + 1}` }))];
    }, [filteredProducts, categoryFallbackProducts, selectedMake, models]);

    useEffect(() => {
        const map: Record<string, string> = {};
        categoryOptions.forEach((cat, idx) => {
            map[String(idx)] = cat.id;
            map[cat.name] = cat.id;
            map[cat.id] = cat.id;
        });
        categoryMapRef.current = map;
    }, [categoryOptions]);

    // Fetch global price bounds once (min/max) to drive the slider
    useEffect(() => {
        const loadPriceBounds = async () => {
            try {
                const getPrice = (p: any) => Number((p?.salePrice ?? p?.price) ?? NaN);
                const minRes = await fetchPublicProducts({ sort: 'price_asc', limit: 1, page: 1 });
                const maxRes = await fetchPublicProducts({ sort: 'price_desc', limit: 1, page: 1 });
                const min = getPrice((minRes as any).products?.[0]);
                const max = getPrice((maxRes as any).products?.[0]);
                if (Number.isFinite(min) && Number.isFinite(max)) {
                    const resolvedMax = min === max ? min + 1 : max;
                    setPriceBounds({ min, max: resolvedMax });
                    priceBoundsRef.current = { min, max: resolvedMax };
                    setPriceRange([min, resolvedMax]);
                    priceRangeRef.current = [min, resolvedMax];
                    setPriceRangeDirty(false);
                    priceRangeDirtyRef.current = false;
                }
            } catch {
                // ignore; fallback to computed bounds from loaded products
            }
        };
        loadPriceBounds();
    }, []);

    // Perform search when debounced query or filters change (after initial load)
    // Also, when search is cleared AND no filters are active, reload all products
    useEffect(() => {
        const hasActiveFilters = selectedCategories.length > 0 || 
                                selectedSorts[0] !== '1' || 
                                selectedRating[0] !== '1' || 
                                priceRangeDirty;
        
        // If there's a search query (even empty string from debounce), search
        if (debouncedQuery || hasActiveFilters) {
            handleSearch({ page: 1 });
        } else {
            // No query and no filters: reset to full product list
            handleSearch({ page: 1 });
        }
    }, [debouncedQuery, selectedCategories, selectedSorts, selectedRating, priceRangeDirty, handleSearch]);

    const loadMore = () => {
        if (!hasMore || loadingMore || loading) return;
        handleSearch({ page: page + 1 });
    };

    /**
    * Render header
    */
    const renderHeader = () => {
        return (
            <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={() => {
                            Keyboard.dismiss();
                            // Prefer native back animation when possible
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                router.replace('/(tabs)');
                            }
                        }}>
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
                        Search
                    </Text>
                </View>
            </View>
        )
    }
    /**
     * Render content
    */
    const renderContent = () => {
        const [selectedTab, setSelectedTab] = useState('row');
        return (
            <View>
                {/* Search bar */}
                <View
                    style={[styles.searchBarContainer, {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.silver
                    }]}>
                    <TouchableOpacity
                        onPress={() => handleSearch()}>
                        <Image
                            source={icons.search2}
                            resizeMode='contain'
                            style={styles.searchIcon}
                        />
                    </TouchableOpacity>
                    <TextInput
                        placeholder='Search'
                        placeholderTextColor={COLORS.gray}
                        style={[styles.searchInput, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}
                        value={searchQuery}
                        onChangeText={(text) => setSearchQuery(text)}
                    />
                    <TouchableOpacity
                        onPress={() => refRBSheet.current.open()}>
                        <Image
                            source={icons.filter}
                            resizeMode='contain'
                            style={[styles.filterIcon, {
                                tintColor: dark ? COLORS.white : COLORS.primary
                            }]}
                        />
                    </TouchableOpacity>
                    {filtersActive && (
                        <TouchableOpacity onPress={resetFilters} style={{ marginLeft: 8 }}>
                            <Text style={{ color: COLORS.primary, textDecorationLine: 'underline', fontFamily: 'medium' }}>Reset</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.reusltTabContainer}>
                    {
                        searchQuery && searchQuery.length > 0 ? (
                            <>
                                <Text style={[styles.tabText, {
                                    color: dark ? COLORS.secondaryWhite : COLORS.black
                                }]}>Result for "{searchQuery}"</Text>
                            </>
                        ) : (
                            <Text style={[styles.tabText, {
                                color: dark ? COLORS.secondaryWhite : COLORS.black
                            }]}>Auto Parts</Text>
                        )
                    }
                    <View>
                        <Text style={[styles.tabText, {
                            color: dark ? COLORS.secondaryWhite : COLORS.black
                        }]}>{resultsCount} founds</Text>
                    </View>
                </View>

                {/* Results container  */}
                <View>
                    {/* result list */}
                    <View style={{
                        backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                        marginVertical: 16
                    }}>
                        {loading ? (
                            <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
                                <ActivityIndicator color={COLORS.primary} />
                                <Text style={{ color: dark ? COLORS.white : COLORS.black, marginTop: 8 }}>Loading products...</Text>
                            </View>
                        ) : resultsCount && resultsCount > 0 ? (
                            <>
                                <FlatList
                                    data={filteredProducts}
                                    keyExtractor={(item) => String((item as any)._id || (item as any).id)}
                                    numColumns={2}
                                    showsVerticalScrollIndicator={false}
                                    columnWrapperStyle={{ gap: 16 }}
                                    contentContainerStyle={{ paddingBottom: 160 }}
                                    onEndReached={loadMore}
                                    onEndReachedThreshold={0.2}
                                    ListFooterComponent={
                                        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                                            {loadingMore ? (
                                                <>
                                                    <ActivityIndicator color={COLORS.primary} />
                                                    <Text style={{ marginTop: 6, color: dark ? COLORS.white : COLORS.black }}>Loading more...</Text>
                                                </>
                                            ) : (
                                                <View style={{ height: 8 }} />
                                            )}
                                        </View>
                                    }
                                    renderItem={({ item }) => {
                                        const rawId = (item as any)._id || (item as any).id || (item as any)._id?.$oid;
                                        const productId = rawId ? String(rawId) : '';
                                        const firstImage = (item as any).images?.[0] || (item as any).image;
                                        const resolvedImage =
                                            firstImage?.startsWith?.('http')
                                                ? firstImage
                                                : firstImage
                                                    ? `${apiBase}${firstImage}`
                                                    : imageAssets.bmw1;
                                        const reviewsArr = (item as any).reviews || [];
                                        const ratingField = [ (item as any).avgRating, (item as any).averageRating, (item as any).rating ]
                                            .find(v => typeof v === 'number' && Number.isFinite(v));
                                        const rating = ratingField !== undefined
                                            ? ratingField
                                            : (reviewsArr.length
                                                ? reviewsArr.reduce((sum: number, r: any) => sum + (r?.rating || 0), 0) / reviewsArr.length
                                                : 0);
                                        const vehicleLabel = [ (item as any).make, (item as any).carModel, (item as any).variant, (item as any).year ].filter(Boolean).join(' ');
                                        if (!productId) return null;
                                        return (
                                            <ProductCard
                                                name={(item as any).name}
                                                image={resolvedImage}
                                                numSolds={(item as any)?.itemsSold ?? (item as any)?.stock ?? 0}
                                                price={(item as any).price}
                                                salePrice={(item as any).salePrice}
                                                rating={Number.isFinite(rating) ? Number(rating.toFixed(1)) : 0}
                                                vehicleLabel={vehicleLabel}
                                                onPress={() => navigation.navigate("cardetails", { id: productId })}
                                            />
                                        )
                                    }}
                                />
                            </>
                        ) : (
                            <NotFoundCard />
                        )}
                    </View>
                </View>
            </View>
        )
    }

    // Toggle category selection
    const toggleCategory = (categoryId: string) => {
        if (categoryId === 'all') {
            setSelectedCategories(['all']);
        } else {
            setSelectedCategories(prev => {
                const withoutAll = prev.filter(id => id !== 'all');
                if (withoutAll.includes(categoryId)) {
                    const next = withoutAll.filter(id => id !== categoryId);
                    return next.length ? next : ['all'];
                }
                return [...withoutAll, categoryId];
            });
        }
        setHasMore(true);
        hasMoreRef.current = true;
        setPage(1);
        handleSearch({ page: 1 });
    };

    const resetFilters = () => {
        setSelectedCategories([]);
        setSelectedSorts(['1']);
        setSelectedRating(['1']);
        setPriceRange([priceBounds.min, priceBounds.max]);
        priceRangeRef.current = [priceBounds.min, priceBounds.max];
        setPriceRangeDirty(false);
        priceRangeDirtyRef.current = false;
        setSelectedMake('');
        setSelectedModel('');
        setSelectedVariant('');
        setSelectedYear('');
        setPage(1);
        handleSearch({ page: 1 });
    };


    // Toggle sort selection (single selection only)
    const toggleSort = (sortId: string) => {
        // Only allow one sort at a time
        setSelectedSorts([sortId]);
    };

    const toggleMake = (makeId: string) => {
        const next = makeId === 'all' ? '' : (selectedMake === makeId ? '' : makeId);
        setSelectedMake(next);
        setSelectedModel('');
        setSelectedVariant('');
        setSelectedYear('');
        setHasMore(true);
        hasMoreRef.current = true;
        setPage(1);
        handleSearch({ page: 1 });
    };

    const toggleModel = (modelId: string) => {
        if (!selectedMake) {
            alert('Select a make first');
            return;
        }
        const next = selectedModel === modelId ? '' : modelId;
        setSelectedModel(next);
        setSelectedVariant('');
        setSelectedYear('');
        setHasMore(true);
        hasMoreRef.current = true;
        setPage(1);
        handleSearch({ page: 1 });
    };

    const toggleVariant = (variant: string) => {
        if (!selectedMake || !selectedModel) {
            alert('Select make and model first');
            return;
        }
        const nextYears = deriveYears(selectedModel, variant);
        setYears(nextYears);
        if (selectedYear && !nextYears.includes(selectedYear)) {
            setSelectedYear('');
        }
        setSelectedVariant(selectedVariant === variant ? '' : variant);
        setHasMore(true);
        hasMoreRef.current = true;
        setPage(1);
        handleSearch({ page: 1 });
    };

    const toggleYear = (year: string) => {
        if (!selectedMake || !selectedModel) {
            alert('Select make and model first');
            return;
        }
        setSelectedYear(selectedYear === year ? '' : year);
        setHasMore(true);
        hasMoreRef.current = true;
        setPage(1);
        handleSearch({ page: 1 });
    };

    const handleOptionSelect = (value: string) => {
        if (value === '__none') {
            setSelectModal(prev => ({ ...prev, visible: false }));
            setOptionSearch('');
            return;
        }
        if (selectModal.type === 'make') {
            setSelectedMake(value === 'all' ? '' : value);
            setSelectedModel('');
            setSelectedVariant('');
            setSelectedYear('');
        } else if (selectModal.type === 'model') {
            setSelectedModel(value === 'all' ? '' : value);
            setSelectedVariant('');
            setSelectedYear('');
        } else if (selectModal.type === 'variant') {
            const nextVal = value === 'all' ? '' : value;
            setSelectedVariant(nextVal);
            const nextYears = deriveYears(selectedModel, value);
            setYears(nextYears);
            if (selectedYear && !nextYears.includes(selectedYear)) {
                setSelectedYear('');
            }
        } else {
            setSelectedYear(value === 'all' ? '' : value);
        }
        setOptionSearch('');
        setSelectModal(prev => ({ ...prev, visible: false }));
        setHasMore(true);
        hasMoreRef.current = true;
        setPage(1);
        handleSearch({ page: 1 });
    };

    const openSelectModal = (type: 'make' | 'model' | 'variant' | 'year', options: { label: string; value: string }[]) => {
        const cleaned = options.filter(opt => opt.value);
        setOptionSearch('');
        setSelectModal({
            visible: true,
            type,
            options: cleaned.length ? cleaned : [{ label: 'No options', value: '__none' }],
        });
    };

    // toggle rating selection
    const toggleRating = (ratingId: string) => {
        setSelectedRating([ratingId]);
        setHasMore(true);
        hasMoreRef.current = true;
        setPage(1);
        handleSearch({ page: 1 });
    };

    // Category item
    const renderCategoryItem = ({ item }: { item: { id: string; name: string } }) => (
        <TouchableOpacity
            style={{
                backgroundColor: selectedCategories.includes(item.id) ? COLORS.primary : "transparent",
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginVertical: 5,
                borderColor: COLORS.primary,
                borderWidth: 1.3,
                borderRadius: 24,
                marginRight: 10,
            }}
            onPress={() => toggleCategory(item.id)}>

            <Text style={{
                color: selectedCategories.includes(item.id) ? COLORS.white : COLORS.primary
            }}>{item.name}</Text>
        </TouchableOpacity>
    );

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

    const renderInlineDropdown = () => (
        <View style={styles.inlineDropdown}>
            <TouchableWithoutFeedback onPress={() => setSelectModal(prev => ({ ...prev, visible: false }))}>
                <View style={{ flex: 1, position: 'absolute', top: -9999, bottom: -9999, left: -9999, right: -9999 }} />
            </TouchableWithoutFeedback>
            <TextInput
                style={[styles.modalSearch, { color: colors.text, borderColor: COLORS.grayscale200, backgroundColor: COLORS.grayscale200 }]}
                placeholder="Search"
                placeholderTextColor={COLORS.gray}
                value={optionSearch}
                onChangeText={setOptionSearch}
                autoFocus
            />
            <ScrollView
                style={{ maxHeight: 240 }}
                nestedScrollEnabled
                scrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
            >
                {filteredModalOptions.map(opt => (
                    <TouchableOpacity
                        key={opt.value}
                        style={styles.modalRow}
                        onPress={() => handleOptionSelect(opt.value)}
                    >
                        <Text style={[styles.modalRowText, { color: colors.text }]}>{opt.label}</Text>
                    </TouchableOpacity>
                ))}
                {filteredModalOptions.length === 0 && (
                    <Text style={{ padding: 12, color: COLORS.gray }}>No options</Text>
                )}
            </ScrollView>
        </View>
    );

    return (
        <>
            <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                {renderHeader()}
                <View>
                    {renderContent()}
                </View>
                <RBSheet
                    ref={refRBSheet}
                    closeOnPressMask={true}
                    height={SIZES.height ? Math.min(SIZES.height * 0.5, 200) : 400}
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
                            height: SIZES.height ? Math.min(SIZES.height * 0.9, 640) : 700,
                            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                            alignItems: "center",
                        }
                    }}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 32, alignItems: 'center' }}
                        style={{ width: '100%' }}
                    >
                        <Text style={[styles.bottomTitle, {
                            color: dark ? COLORS.white : COLORS.greyscale900
                        }]}>Filter</Text>
                        <View style={styles.separateLine} />
                        <View style={{ width: SIZES.width - 32 }}>
                            <Text style={[styles.sheetTitle, {
                                color: dark ? COLORS.white : COLORS.greyscale900
                            }]}>Price</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ color: dark ? COLORS.white : COLORS.black, fontFamily: 'medium' }}>
                                    PKR {Math.round(priceRange[0])}
                                </Text>
                                <Text style={{ color: dark ? COLORS.white : COLORS.black, fontFamily: 'medium' }}>
                                    PKR {Math.round(priceRange[1])}
                                </Text>
                            </View>
                            <MultiSlider
                                values={priceRange}
                                sliderLength={SIZES.width - 32}
                                onValuesChange={handleSliderChange}
                                onValuesChangeFinish={handleSliderChangeFinish}
                                min={priceBounds.min}
                                max={priceBounds.max}
                                step={1}
                                allowOverlap={false}
                                snapped={false}
                                    minMarkerOverlapDistance={40}
                                    customMarker={CustomSliderHandle}
                                    selectedStyle={{ backgroundColor: COLORS.primary }}
                                    unselectedStyle={{ backgroundColor: 'lightgray' }}
                                    containerStyle={{ height: 40 }}
                                    trackStyle={{ height: 3 }}
                                />
                            <Text style={[styles.sheetTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Make</Text>
                            <TouchableOpacity
                                style={styles.selectBox}
                                onPress={() => openSelectModal('make', makeOptions.map(opt => ({ label: opt.name, value: opt.id })))}
                            >
                                <Text style={styles.selectValue}>
                                    {selectedMake ? makeOptions.find(m => m.id === selectedMake)?.name || selectedMake : 'All makes'}
                                </Text>
                            </TouchableOpacity>
                            {selectModal.visible && selectModal.type === 'make' && renderInlineDropdown()}

                            <Text style={[styles.sheetTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Model</Text>
                            <TouchableOpacity
                                style={[styles.selectBox, { opacity: selectedMake ? 1 : 0.5 }]}
                                onPress={() => {
                                    if (!selectedMake) {
                                        alert('Select make first');
                                        return;
                                    }
                                    openSelectModal('model', modelOptions.map(opt => ({ label: opt.name, value: opt.id })));
                                }}
                            >
                                <Text style={styles.selectValue}>
                                    {selectedModel ? modelOptions.find(m => m.id === selectedModel)?.name || selectedModel : 'All models'}
                                </Text>
                            </TouchableOpacity>
                            {selectModal.visible && selectModal.type === 'model' && renderInlineDropdown()}

                            <Text style={[styles.sheetTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Variant</Text>
                            <TouchableOpacity
                                style={[styles.selectBox, { opacity: selectedMake && selectedModel ? 1 : 0.5 }]}
                                onPress={() => {
                                    if (!selectedMake) {
                                        alert('Select make first');
                                        return;
                                    }
                                    if (!selectedModel) {
                                        alert('Select model first');
                                        return;
                                    }
                                    if (!variants.length) {
                                        alert('No variants available for this selection');
                                        return;
                                    }
                                    openSelectModal('variant', [{ label: 'All', value: 'all' }, ...variants.map(v => ({ label: v, value: v }))]);
                                }}
                            >
                                <Text style={styles.selectValue}>
                                    {selectedVariant || 'All variants'}
                                </Text>
                            </TouchableOpacity>
                            {selectModal.visible && selectModal.type === 'variant' && renderInlineDropdown()}

                            <Text style={[styles.sheetTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Year</Text>
                            <TouchableOpacity
                                style={[styles.selectBox, { opacity: selectedMake && selectedModel ? 1 : 0.5 }]}
                                onPress={() => {
                                    if (!selectedMake) {
                                        alert('Select make first');
                                        return;
                                    }
                                    if (!selectedModel) {
                                        alert('Select model first');
                                        return;
                                    }
                                    if (!years.length) {
                                        alert('No years available for this selection');
                                        return;
                                    }
                                    openSelectModal('year', [{ label: 'All', value: 'all' }, ...years.map(y => ({ label: y, value: y }))]);
                                }}
                            >
                                <Text style={styles.selectValue}>
                                    {selectedYear || 'All years'}
                                </Text>
                            </TouchableOpacity>
                            {selectModal.visible && selectModal.type === 'year' && renderInlineDropdown()}
                            <Text style={[styles.sheetTitle, {
                                color: dark ? COLORS.white : COLORS.greyscale900
                            }]}>Categories</Text>
                            <FlatList
                                data={categoryOptions}
                                keyExtractor={item => item.id}
                                showsHorizontalScrollIndicator={false}
                                horizontal
                                contentContainerStyle={{ paddingRight: 16 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: selectedCategories.includes(item.id) ? COLORS.primary : "transparent",
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            marginVertical: 5,
                                            borderColor: COLORS.primary,
                                            borderWidth: 1.3,
                                            borderRadius: 24,
                                            marginRight: 10,
                                        }}
                                        onPress={() => {
                                            setSelectedCategories(prev =>
                                                prev.includes(item.id)
                                                    ? prev.filter(id => id !== item.id)
                                                    : [...prev, item.id]
                                            );
                                            setHasMore(true);
                                            hasMoreRef.current = true;
                                            setPage(1);
                                            handleSearch({ page: 1 });
                                        }}>
                                        <Text style={{
                                            color: selectedCategories.includes(item.id) ? COLORS.white : COLORS.primary
                                        }}>{item.name}</Text>
                                    </TouchableOpacity>
                                )}
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
                                data={ratingOptions}
                                keyExtractor={item => item.id}
                                showsHorizontalScrollIndicator={false}
                                horizontal
                                renderItem={renderRatingItem}
                            />
                        </View>

                        <View style={styles.separateLine} />

                        <View style={[styles.bottomContainer, { paddingHorizontal: 16 }]}>
                            <Button
                                title="Reset"
                                style={{
                                    width: "100%",
                                    backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                                    borderRadius: 32,
                                    borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary
                                }}
                                textColor={dark ? COLORS.white : COLORS.primary}
                                onPress={() => {
                                    resetFilters();
                                    refRBSheet.current.close();
                                }}
                            />
                        </View>
                    </ScrollView>
                </RBSheet>
            </View>
        </SafeAreaView>
        </>
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
        paddingBottom: 32,
        paddingHorizontal: 16
    },
    headerContainer: {
        flexDirection: "row",
        width: SIZES.width - 32,
        justifyContent: "space-between",
        marginBottom: 16
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
    searchBarContainer: {
        width: SIZES.width - 32,
        backgroundColor: COLORS.secondaryWhite,
        padding: 16,
        borderRadius: 12,
        height: 52,
        marginBottom: 16,
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
    selectBox: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.grayscale200,
        backgroundColor: COLORS.white,
        marginTop: 0,
        marginBottom: 0,
    },
    selectValue: {
        fontFamily: 'medium',
        fontSize: 14,
        color: COLORS.greyscale900,
    },
    tabContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: SIZES.width - 32,
        justifyContent: "space-between"
    },
    tabBtn: {
        width: (SIZES.width - 32) / 2 - 6,
        height: 42,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.4,
        borderColor: COLORS.primary,
        borderRadius: 32
    },
    selectedTab: {
        width: (SIZES.width - 32) / 2 - 6,
        height: 42,
        backgroundColor: COLORS.primary,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1.4,
        borderColor: COLORS.primary,
        borderRadius: 32
    },
    tabBtnText: {
        fontSize: 16,
        fontFamily: "semiBold",
        color: COLORS.primary,
        textAlign: "center"
    },
    selectedTabText: {
        fontSize: 16,
        fontFamily: "semiBold",
        color: COLORS.white,
        textAlign: "center"
    },
    resultContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: SIZES.width - 32,
        marginVertical: 16,
    },
    subtitle: {
        fontSize: 18,
        fontFamily: "bold",
        color: COLORS.black,
    },
    subResult: {
        fontSize: 14,
        fontFamily: "semiBold",
        color: COLORS.primary
    },
    resultLeftView: {
        flexDirection: "row"
    },
    modalTitle: {
        fontFamily: 'bold',
        fontSize: 16,
        marginBottom: 8
    },
    inlineDropdown: {
        width: '100%',
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.grayscale200,
        marginTop: -6,
        marginBottom: 12,
    },
    modalSearch: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        fontFamily: 'regular',
        backgroundColor: COLORS.grayscale200,
        borderColor: COLORS.black
    },
    modalRow: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.grayscale200
    },
    modalRowText: {
        fontFamily: 'regular',
        fontSize: 14
    },
    bottomContainer: {
        width: '100%',
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 0,
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
    reusltTabContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: SIZES.width - 32,
        justifyContent: "space-between"
    },
    viewDashboard: {
        flexDirection: "row",
        alignItems: "center",
        width: 36,
        justifyContent: "space-between"
    },
    dashboardIcon: {
        width: 16,
        height: 16,
        tintColor: COLORS.primary
    },
    tabText: {
        fontSize: 20,
        fontFamily: "semiBold",
        color: COLORS.black
    }
})

export default Search
