// screens/EditProductScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { RouteProp, useRoute, NavigationProp, useNavigation } from '@react-navigation/native'
import ImagePickerBox from '@/components/ImagePickerBox'
import Input from '@/components/Input'
import { useTheme } from '@/theme/ThemeProvider'
import { COLORS, icons, SIZES } from '@/constants'
import { commonStyles } from '@/styles/CommonStyles'
import { categoriesByParts } from '@/data/sellerDashboardData'
import RBSheet from 'react-native-raw-bottom-sheet'
import Button from '@/components/Button'
import ButtonFilled from '@/components/ButtonFilled'
import { useAuth } from './context/AuthContext'
import { fetchMyProduct, updateProductAuth } from '@/utils/api/products'
import { CarModel, fetchCarMakes, fetchCarModels } from '@/utils/api/carData'
import { fetchCategories, Category as ApiCategory } from '@/utils/api/products'

/** 
 * Define your navigation params so TypeScript knows
 * that EditProductScreen expects a productId
 */
type RootStackParamList = {
  EditProductScreen: { productId: string }
  // …other screens
}

/** -------------------------
 * 🔖 Product & Form Types
 * ------------------------- */
interface NewProduct {
  id: string
  image: string
  gallery: string[]
  name: string
  company: string
  model: string
  make: string
  variant: string
  year: string
  sku: string
  status: 'Active' | 'Draft'
  originalPrice: number
  salePrice: number
  stock: number
  category: string[]
  description: string
  technicalDescription: string
}

type FormState = Omit<NewProduct, 'sku' | 'originalPrice' | 'salePrice' | 'stock'> & {
  sku: string
  originalPrice: string
  salePrice: string
  stock: string
  width: string
  length: string
  height: string
  warrantyDurationValue: string
  warrantyDurationUnit: 'DAY' | 'MONTH' | 'YEAR'
  returnDays: string
}

const { width } = Dimensions.get('window')

export default function EditProductScreen() {
  const { dark } = useTheme()
  const navigation = useNavigation<NavigationProp<any>>()
  const route = useRoute<RouteProp<RootStackParamList, 'EditProductScreen'>>()
  const productId = route.params.productId
  const { token } = useAuth()

  // Empty form defaults
const emptyForm: FormState = {
    id: '',
    image: '',
    gallery: [],
    name: '',
    company: '',
    model: '',
    make: '',
    variant: '',
    year: '',
    sku: '',
    status: 'Active',
    originalPrice: '',
    salePrice: '',
    stock: '',
    category: [],
    description: '',
    technicalDescription: '',
    width: '',
    length: '',
    height: '',
  warrantyDurationValue: '',
  warrantyDurationUnit: 'MONTH',
  returnDays: '',
}

  // Local state
  const [form, setForm] = useState<FormState>(emptyForm)
  const [hasGalleryPermission, setHasGalleryPermission] = useState<boolean | null>(null)
  const [isDescFocused, setIsDescFocused] = useState(false)
  const [isTechFocused, setIsTechFocused] = useState(false)
  const [selectModal, setSelectModal] = useState<{ visible: boolean; type: 'make' | 'model' | 'variant' | 'year'; options: string[] }>({ visible: false, type: 'make', options: [] });
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [variants, setVariants] = useState<string[]>([])
  const [years, setYears] = useState<string[]>([])
  const [modelsRaw, setModelsRaw] = useState<CarModel[]>([])
  const [loadingOptions, setLoadingOptions] = useState<{ make?: boolean; model?: boolean; variant?: boolean }>({})
  const refRBSheet = useRef<any>(null);
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>(
    categoriesByParts.map(c => ({ id: String(c.id), name: c.name })).filter(c => c.name.toLowerCase() !== 'all')
  );

  // Request media library permission
  useEffect(() => {
    ; (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      setHasGalleryPermission(status === 'granted')
    })()
  }, [])

  useEffect(() => {
    const loadMakes = async () => {
      try {
        setLoadingOptions(prev => ({ ...prev, make: true }))
        const res = await fetchCarMakes(undefined, token)
        const names: string[] = Array.isArray((res as any)?.makes) ? (res as any).makes.map((m: any) => String(m)) : []
        const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
        setMakes(unique)
      } catch (err) {
        console.error('fetch car makes failed', err)
      } finally {
        setLoadingOptions(prev => ({ ...prev, make: false }))
      }
    }
    loadMakes()
  }, [token])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetchCategories();
        const list = Array.isArray(res)
          ? (res as ApiCategory[]).map(c => ({ id: String(c._id), name: c.name }))
          : [];
        if (list.length) {
          setCategoryOptions(list);
          return;
        }
      } catch {
        // ignore, fallback
      }
      setCategoryOptions(categoriesByParts.map(c => ({ id: String(c.id), name: c.name })).filter(c => c.name.toLowerCase() !== 'all'));
    };
    loadCategories();
  }, []);

  const deriveVariants = useCallback((modelName: string, year?: string | number, source?: CarModel[]) => {
    const list = source || modelsRaw
    const target = modelName?.toLowerCase()
    const normalizedYear = typeof year === 'string' && /^\d{4}$/.test(year) ? year : typeof year === 'number' ? String(year) : undefined
    const matches = list.filter(m =>
      (m.modelName || '').toLowerCase() === target &&
      (!normalizedYear || String(m.year) === normalizedYear)
    )
    const next = Array.from(
      new Set(
        matches.flatMap(m => Array.isArray(m.variants) ? m.variants : []).filter(Boolean)
      )
    )
    return next.length ? next.sort((a, b) => a.localeCompare(b)) : (modelName ? [modelName] : [])
  }, [modelsRaw])

  const deriveYears = useCallback((modelName?: string, variant?: string, source?: CarModel[]) => {
    const list = source || modelsRaw
    let filtered = modelName ? list.filter(m => m.modelName === modelName) : list
    if (variant) {
      filtered = filtered.filter(m => Array.isArray(m.variants) && m.variants.includes(variant))
    }
    const yearsOnly = filtered.map(m => Number(m.year)).filter(y => !Number.isNaN(y))
    if (!yearsOnly.length) return []
    const min = Math.min(...yearsOnly)
    const max = Math.max(...yearsOnly)
    return [min === max ? String(min) : `${min}-${max}`]
  }, [modelsRaw])

  const fetchModels = useCallback(async (make: string, existingModel?: string, existingVariant?: string, existingYear?: string) => {
    if (!make) return
    try {
      setLoadingOptions(prev => ({ ...prev, model: true }))
      const res = await fetchCarModels(make, undefined, token)
      const items: CarModel[] = Array.isArray((res as any)?.models) ? (res as any).models : []
      setModelsRaw(items)
      const names: string[] = Array.from(new Set(items.map((m: CarModel) => String(m.modelName)))).sort((a, b) => a.localeCompare(b))
      const maybeCurrent = existingModel?.trim()
      const mergedNames = maybeCurrent && !names.some(n => n.toLowerCase() === maybeCurrent.toLowerCase())
        ? [...names, maybeCurrent]
        : names
      setModels(mergedNames)
      const availableYears = deriveYears(existingModel, existingVariant, items)
      const ensureYears = existingYear
        ? (availableYears.includes(String(existingYear)) ? availableYears : [String(existingYear), ...availableYears])
        : availableYears
      setYears(ensureYears)
      if (existingVariant) {
        const derived = deriveVariants(existingModel || '', existingYear, items)
        const ensureVariant = derived.some(v => v.toLowerCase() === existingVariant.toLowerCase())
          ? derived
          : [...derived, existingVariant]
        setVariants(ensureVariant)
      } else if (existingModel) {
        setVariants(deriveVariants(existingModel, existingYear, items))
      }
      return items
    } catch (err) {
      console.error('fetch car models failed', err)
      setModels([])
      setVariants([])
      setYears([])
      setModelsRaw([])
    } finally {
      setLoadingOptions(prev => ({ ...prev, model: false }))
    }
  }, [token, deriveYears, deriveVariants])

  useEffect(() => {
    if (form.model) {
      const derived = deriveVariants(form.model, form.year)
      const hasCurrentVariant = form.variant
        ? derived.some(v => v.toLowerCase() === form.variant.toLowerCase())
        : true
      setVariants(hasCurrentVariant || !form.variant ? derived : [...derived, form.variant])
    } else {
      setVariants([])
    }
  }, [form.model, form.variant, form.year, deriveVariants])

  useEffect(() => {
    const opts = deriveYears(form.model, form.variant)
    const ensure = form.year && !opts.includes(form.year)
      ? [form.year, ...opts]
      : opts
    setYears(ensure)
  }, [form.model, form.variant, form.year, deriveYears])

  useEffect(() => {
    if (!form.year && years.length === 1) {
      changeField('year', years[0] as any)
    }
  }, [years, form.year])

  // Populate form when existing product is loaded
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!token) return
      try {
        const res = await fetchMyProduct(productId, token)
        const p = res.product
        if (!p || !active) return

        const modelItems = p.make ? await fetchModels(p.make, p.carModel, p.variant, (p as any)?.year) : undefined
        if (!active) return

        const nextVariants = p.carModel ? deriveVariants(p.carModel, (p as any)?.year, modelItems) : []
        const variantVal = p.variant || ''
        const ensureVariant = variantVal && nextVariants.length
          ? (nextVariants.some(v => v.toLowerCase() === variantVal.toLowerCase()) ? nextVariants : [...nextVariants, variantVal])
          : nextVariants
        const normalizedCats = Array.isArray(p.categories)
          ? (p.categories as any[]).map((c: any) => {
            if (!c) return '';
            if (typeof c === 'string') return c;
            return c._id || c.id || c.name || '';
          }).filter(Boolean)
          : [];
        setForm({
          id: p._id,
          image: p.images?.[0] || '',
          gallery: p.images?.slice(1) || [],
          name: p.name || '',
          company: p.brand || '',
          model: p.carModel || '',
          make: p.make || '',
          variant: variantVal,
          year: (p as any)?.year ? String((p as any).year) : '',
          sku: p.sku || '',
          status: p.status === 'draft' ? 'Draft' : 'Active',
          originalPrice: String(p.price ?? ''),
          salePrice: p.salePrice ? String(p.salePrice) : '',
          stock: String(p.stock ?? ''),
          category: normalizedCats,
          description: p.description || '',
          technicalDescription: (p as any).technicalDescription || '',
          width: p.dimensions?.width ? String(p.dimensions.width) : '',
          length: p.dimensions?.length ? String(p.dimensions.length) : '',
          height: p.dimensions?.height ? String(p.dimensions.height) : '',
          warrantyDurationValue:
            typeof (p as any).warrantyDurationValue !== 'undefined' && (p as any).warrantyDurationValue !== null
              ? String((p as any).warrantyDurationValue)
              : '',
          warrantyDurationUnit: (p as any).warrantyDurationUnit || 'MONTH',
          returnDays: typeof (p as any).returnDays !== 'undefined' && (p as any).returnDays !== null
            ? String((p as any).returnDays)
            : '',
        })
        const derivedYears = deriveYears(p.carModel, p.variant, modelItems)
        const ensureYears = (p as any)?.year
          ? (derivedYears.includes(String((p as any).year)) ? derivedYears : [String((p as any).year), ...derivedYears])
          : derivedYears
        setYears(ensureYears)
        setVariants(ensureVariant)
      } catch (err: any) {
        if (active) {
          Alert.alert('Load failed', err?.message || 'Could not load product')
        }
      }
    }
    load()
    return () => { active = false }
    // deliberately omit fetchModels/derive callbacks to avoid resetting user edits when options change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, token])

  // Generic field updater
  const changeField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const sanitizeNumberInput = (value: string) => value.replace(/[^\d]/g, '')
  const parseReturnDays = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
  }

  // Pick featured image
  const pickFeaturedImage = async () => {
    if (hasGalleryPermission === false) {
      Alert.alert('Permission required', 'Enable photo library permissions in settings.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 })
    if (result.canceled) return
    changeField('image', result.assets[0].uri as any)
  }

  // Pick gallery images (multiple)
  const pickGalleryImage = async () => {
    if (hasGalleryPermission === false) {
      Alert.alert('Permission required', 'Enable photo library permissions in settings.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 0,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    })
    if (result.canceled) return
    const uris = result.assets.map(a => a.uri)
    changeField('gallery', [...form.gallery, ...uris] as any)
  }

  // Toggle category selection
  const toggleCategory = (catName: string) =>
    changeField(
      'category',
      form.category.includes(catName)
        ? form.category.filter(c => c !== catName)
        : [...form.category, catName]
    )

  // Handle Save
  const handleSave = async () => {
    if (!token) {
      Alert.alert('Not signed in', 'Please log in again.');
      return;
    }
    if (!form.name || !form.company || !form.model || !form.make || !form.year || !form.sku || !form.originalPrice) {
      Alert.alert('Missing fields', 'Please fill name, brand, make, model, year, SKU, and price.');
      return;
    }
    const returnDaysValue = parseReturnDays(form.returnDays)
    const payload = {
      name: form.name,
      description: form.description,
      price: Number(form.originalPrice || 0),
      salePrice: form.salePrice ? Number(form.salePrice) : undefined,
      brand: form.company,
      make: form.make,
      carModel: form.model,
      variant: form.variant,
      year: form.year,
      sku: form.sku,
      stock: Number(form.stock || 0),
      technicalDescription: form.technicalDescription,
      status: form.status === 'Draft' ? 'draft' : 'active',
      categories: form.category,
      featuredImage: form.image,
      gallery: form.gallery,
      width: form.width ? Number(form.width) : undefined,
      length: form.length ? Number(form.length) : undefined,
      height: form.height ? Number(form.height) : undefined,
      warrantyDurationValue: form.warrantyDurationValue
        ? Number(form.warrantyDurationValue)
        : undefined,
      warrantyDurationUnit: form.warrantyDurationUnit,
      returnDays: returnDaysValue,
    };
    try {
      await updateProductAuth(productId, payload as any, token);
      Alert.alert('Product updated', 'Changes saved.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Could not update product.');
    }
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={icons.back}
            resizeMode="contain"
            style={[styles.backIcon, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
          Edit Product
        </Text>
      </View>
    </View>
  )

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Modal transparent visible={selectModal.visible} animationType="slide">
        <TouchableWithoutFeedback onPress={() => setSelectModal(prev => ({ ...prev, visible: false }))}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.optionSheet, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
                <Text style={[styles.optionTitle, { color: dark ? COLORS.white : COLORS.black }]}>
                  {selectModal.type === 'make'
                    ? 'Select Make'
                    : selectModal.type === 'model'
                      ? 'Select Model'
                      : selectModal.type === 'variant'
                        ? 'Select Variant'
                        : 'Select Year'}
                </Text>
                <ScrollView style={{ maxHeight: 360 }}>
                  {selectModal.options.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.optionRow}
                      onPress={() => {
                        if (selectModal.type === 'make') {
                          changeField('make', opt as any)
                          changeField('model', '' as any)
                          changeField('variant', '' as any)
                          changeField('year', '')
                          setModels([])
                          setVariants([])
                          setYears([])
                          setModelsRaw([])
                          fetchModels(opt)
                        } else if (selectModal.type === 'model') {
                          changeField('model', opt as any)
                          changeField('variant', '' as any)
                          const nextVariants = deriveVariants(opt, form.year)
                          setVariants(nextVariants)
                          const nextYears = deriveYears(opt)
                          setYears(nextYears)
                          changeField('year', '')
                        } else if (selectModal.type === 'variant') {
                          changeField('variant', opt as any)
                          const nextYears = deriveYears(form.model, opt)
                          setYears(nextYears)
                          if (form.year && !nextYears.includes(form.year)) {
                            changeField('year', '')
                          }
                        } else if (selectModal.type === 'year') {
                          changeField('year', opt)
                          if (form.model) {
                            const nextVariants = deriveVariants(form.model, opt)
                            setVariants(nextVariants)
                            if (form.variant && !nextVariants.some(v => v.toLowerCase() === form.variant.toLowerCase())) {
                              changeField('variant', '' as any)
                            }
                          }
                        }
                        setSelectModal(prev => ({ ...prev, visible: false }))
                      }}
                    >
                      <Text style={{ color: dark ? COLORS.white : COLORS.black, fontFamily: 'medium' }}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                  {selectModal.options.length === 0 && (
                    <Text style={{ padding: 12, color: COLORS.gray }}>No options</Text>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <SafeAreaView style={[styles.area, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
        <View style={[styles.container, { backgroundColor: COLORS.white }]}>
          {renderHeader()}
          <ScrollView contentContainerStyle={styles.scroll}>
            {/* Featured Image */}
            <View style={styles.field}>
              <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black, marginBottom: 12 }]}>
                Featured Image *
              </Text>
              <ImagePickerBox uri={form.image} onPick={pickFeaturedImage} onDelete={() => changeField('image', '')} />
            </View>

            {/* Gallery */}
            <View style={styles.field}>
              <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black, marginBottom: 12 }]}>
                Gallery Images (Optional)
              </Text>
              <View style={styles.uploadRow}>
                {form.gallery.map((uri, i) => (
                  <ImagePickerBox
                    key={uri + i}
                    uri={uri}
                    onPick={() => { }}
                    onDelete={() => changeField('gallery', form.gallery.filter(u => u !== uri))}
                  />
                ))}
                <ImagePickerBox uri={''} onPick={pickGalleryImage} onDelete={() => { }} />
              </View>
            </View>

            {/* Vehicle selectors */}
              <Text style={[commonStyles.inputHeader, commonStyles.inputHeader2, { color: dark ? COLORS.white : COLORS.black }]}>Make *</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setSelectModal({ visible: true, type: 'make', options: makes })}
            >
              <Text style={[styles.selectValue, { color: form.make ? COLORS.greyscale900 : COLORS.grayTie }]}>
                {form.make || (loadingOptions.make ? 'Loading makes...' : 'Select make')}
              </Text>
            </TouchableOpacity>

              <Text style={[commonStyles.inputHeader,commonStyles.inputHeader2, { color: dark ? COLORS.white : COLORS.black }]}>Model *</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => {
                if (!form.make) {
                  Alert.alert('Select a make first');
                  return;
                }
                setSelectModal({ visible: true, type: 'model', options: models });
              }}
            >
              <Text style={[styles.selectValue, { color: form.model ? COLORS.greyscale900 : COLORS.grayTie }]}>
                {form.model || (loadingOptions.model ? 'Loading models...' : 'Select model')}
              </Text>
            </TouchableOpacity>

              <Text style={[commonStyles.inputHeader, commonStyles.inputHeader2, { color: dark ? COLORS.white : COLORS.black }]}>Variant</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => {
                if (!form.model) {
                  Alert.alert('Select a model first');
                  return;
                }
                const opts = deriveVariants(form.model, form.year);
                setVariants(opts);
                setSelectModal({ visible: true, type: 'variant', options: opts });
              }}
            >
              <Text style={[styles.selectValue, { color: form.variant ? COLORS.greyscale900 : COLORS.grayTie }]}>
                {form.variant || 'Select variant'}
              </Text>
            </TouchableOpacity>

            <Text style={[commonStyles.inputHeader, commonStyles.inputHeader2, { color: dark ? COLORS.white : COLORS.black }]}>Year *</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => {
                if (!form.make) {
                  Alert.alert('Select a make first');
                  return;
                }
                const opts = form.model ? deriveYears(form.model, form.variant) : years;
                setSelectModal({ visible: true, type: 'year', options: opts });
              }}
            >
              <Text style={[styles.selectValue, { color: form.year ? COLORS.greyscale900 : COLORS.grayTie }]}>
                {form.year || 'Select year'}
              </Text>
            </TouchableOpacity>

            {/* Text Inputs */}
            {(
              [
                { label: 'Product Name *', key: 'name' },
                { label: 'Company *', key: 'company' },
                { label: 'SKU *', key: 'sku' },
                { label: 'Original Price *', key: 'originalPrice' },
                { label: 'Sale Price (Optional)', key: 'salePrice' },
                { label: 'Stock *', key: 'stock' },
              ] as const
            ).map(({ label, key }) => {
              const isNumeric = ['originalPrice', 'salePrice', 'stock'].includes(key)
              return (
                <View key={key} style={styles.field}>
                  <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black }]}>
                    {label}
                  </Text>
                  <Input
                    id={key}
                    value={form[key] as string}
                    onInputChanged={(id, val) => changeField(key as any, val as any)}
                    style={styles.input}
                    keyboardType={isNumeric ? 'numeric' : 'default'}
                    placeholder={`Enter ${label.replace('*', '').trim().toLowerCase()}`}
                    placeholderTextColor={dark ? COLORS.gray : COLORS.grayTie}
                  />
                </View>
              )
            })}

            {/* Dimensions */}
            <View style={styles.field}>
              <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black }]}>
                Dimensions in Inches *
              </Text>
              <View style={styles.inlineRow}>
                <View style={styles.inlineItem}>
                  <Input
                    id="width"
                    value={form.width}
                    onInputChanged={(id, val) => changeField('width', val)}
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Width"
                    placeholderTextColor={dark ? COLORS.gray : COLORS.grayTie}
                  />
                </View>
                <View style={styles.inlineItem}>
                  <Input
                    id="length"
                    value={form.length}
                    onInputChanged={(id, val) => changeField('length', val)}
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Length"
                    placeholderTextColor={dark ? COLORS.gray : COLORS.grayTie}
                  />
                </View>
                <View style={styles.inlineItem}>
                  <Input
                    id="height"
                    value={form.height}
                    onInputChanged={(id, val) => changeField('height', val)}
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Height"
                    placeholderTextColor={dark ? COLORS.gray : COLORS.grayTie}
                  />
                </View>
              </View>
            </View>

            {/* Warranty duration */}
            <View style={styles.field}>
              <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black }]}>
                Warranty duration *
              </Text>
              <View style={[styles.inlineRow, { alignItems: 'flex-start' }]}>
                <View style={[styles.inlineItem, { flex: 1.2 }]}>
                  <Input
                    id="warrantyDurationValue"
                    value={form.warrantyDurationValue}
                    onInputChanged={(id, val) =>
                      changeField('warrantyDurationValue', sanitizeNumberInput(val))
                    }
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="Duration"
                    placeholderTextColor={dark ? COLORS.gray : COLORS.grayTie}
                  />
                </View>
                <View style={[styles.inlineItem, { flex: 1 }]}>
                  <View style={styles.unitRow}>
                    {([
                      { value: 'DAY', label: 'Days' },
                      { value: 'MONTH', label: 'Months' },
                      { value: 'YEAR', label: 'Years' },
                    ] as const).map(unit => (
                      <TouchableOpacity
                        key={unit.value}
                        style={[
                          styles.unitChip,
                          form.warrantyDurationUnit === unit.value && styles.unitChipActive,
                        ]}
                        onPress={() => changeField('warrantyDurationUnit', unit.value)}
                      >
                        <Text
                          style={[
                            styles.unitText,
                            form.warrantyDurationUnit === unit.value && styles.unitTextActive,
                          ]}
                        >
                          {unit.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black }]}>
                Return window (days)
              </Text>
          <Input
            id="returnDays"
            value={form.returnDays}
            onInputChanged={(id, val) => changeField('returnDays', sanitizeNumberInput(val))}
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 7"
            placeholderTextColor={dark ? COLORS.gray : COLORS.grayTie}
          />
              <Text style={[styles.helperSmall, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                Leave empty if the item is non-returnable.
              </Text>
            </View>

            {/* Categories */}
            <View style={styles.field}>
              <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black }]}>
                Categories *
              </Text>
              <View style={styles.categoriesContainer}>
                {categoryOptions.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.category,
                      form.category.includes(cat.id) && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                    ]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    <Text style={{ color: form.category.includes(cat.id) ? COLORS.white : COLORS.black }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status */}
            <View style={styles.field}>
              <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black, marginBottom: 8 }]}>Status *</Text>
              <View style={{ flexDirection: 'row' }}>
                {['Active', 'Draft'].map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.category,
                      form.status === st && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                    ]}
                    onPress={() => changeField('status', st as any)}
                  >
                    <Text style={{ color: form.status === st ? COLORS.white : COLORS.black }}>{st}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Descriptions */}
            <View style={styles.field}>
              <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black }]}>
                Description (Optional)
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    borderColor: isDescFocused ? (dark ? COLORS.primary100 : COLORS.primary) : (dark ? COLORS.dark2 : COLORS.greyscale500),
                    backgroundColor: isDescFocused ? COLORS.tansparentPrimary : (dark ? COLORS.dark2 : COLORS.greyscale500),
                  },
                ]}
                multiline
                numberOfLines={4}
                placeholder="Enter description"
                placeholderTextColor={dark ? COLORS.grayTie : COLORS.grayTie}
                value={form.description}
                onChangeText={v => changeField('description', v as any)}
                onFocus={() => setIsDescFocused(true)}
                onBlur={() => setIsDescFocused(false)}
              />
            </View>

            <View style={styles.field}>
              <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black }]}>
                Technical Description (Optional)
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    borderColor: isTechFocused ? (dark ? COLORS.primary100 : COLORS.primary) : (dark ? COLORS.dark2 : COLORS.greyscale500),
                    backgroundColor: isTechFocused ? COLORS.tansparentPrimary : (dark ? COLORS.dark2 : COLORS.greyscale500),
                  },
                ]}
                multiline
                numberOfLines={4}
                placeholder="Enter technical description"
                placeholderTextColor={dark ? COLORS.grayTie : COLORS.grayTie}
                value={form.technicalDescription}
                onChangeText={v => changeField('technicalDescription', v as any)}
                onFocus={() => setIsTechFocused(true)}
                onBlur={() => setIsTechFocused(false)}
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.cancelBtn, { borderColor: dark ? COLORS.white : COLORS.primary }]}
            >
              <Text style={[styles.cancelBtnText, { color: dark ? COLORS.white : COLORS.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => refRBSheet.current.open()} style={styles.saveBtn}>
              <Text style={[styles.saveBtnText, { color: COLORS.white }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <RBSheet
          ref={refRBSheet}
          closeOnPressMask={true}
          height={220}
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
              height: 220,
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
              onPress={() => {
                refRBSheet.current.close();
                handleSave();
              }}
            />
          </View>
        </RBSheet>
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  headerContainer: {
    flexDirection: 'row',
    width: width - 32,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backIcon: { width: 24, height: 24, marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scroll: { paddingVertical: 20 },
  field: { marginTop: 12 },
  uploadRow: { flexDirection: 'row', flexWrap: 'wrap' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  selectBox: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    backgroundColor: COLORS.grayscale200,
    marginTop: 12,
  },
  selectValue: {
    fontFamily: 'medium',
    fontSize: 14,
    marginTop: 4,
  },
  inlineRow: { flexDirection: 'column-reverse', gap: 8, marginTop: 8 },
  inlineItem: { flex: 1 },
  unitRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.gray,
    backgroundColor: COLORS.white,
  },
  unitChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitText: { fontFamily: 'medium', color: COLORS.black, fontSize: 12 },
  unitTextActive: { color: COLORS.white },
  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  category: {
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.gray,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  textArea: {
    height: 100,
    width: '100%',
    padding: SIZES.padding,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 5,
  },
  helperSmall: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 24,
    marginBottom: -16
  },
  cancelBtn: {
    width: '48%',
    height: 58,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
  },
  cancelBtnText: { fontSize: 16, fontWeight: 'bold' },
  saveBtn: {
    width: '48%',
    height: 58,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: COLORS.primary,
  },
  saveBtnText: { fontSize: 16, fontWeight: 'bold' },
  bottomSubtitle: {
    fontSize: 22,
    fontFamily: "bold",

    textAlign: "center",
    marginTop: 12

  },
  selectedCancelContainer: {
    marginVertical: 22,
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  optionSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  optionTitle: { fontFamily: 'bold', fontSize: 16, marginBottom: 8 },
  optionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayscale200 },

})
