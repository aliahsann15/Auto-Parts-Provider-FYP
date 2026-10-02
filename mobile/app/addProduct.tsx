// AddProductScreen.tsx

import React, { useState, useEffect, useCallback } from 'react'
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
import { useTheme } from '@/theme/ThemeProvider'
import { COLORS, icons, SIZES } from '@/constants'
import { NavigationProp, useNavigation } from '@react-navigation/native'
import { categoriesByParts } from '@/data/sellerDashboardData'
import { FONTS } from '@/constants/theme'
import Input from '@/components/Input'
import * as ImagePicker from 'expo-image-picker';
import ImagePickerBox from '@/components/ImagePickerBox'
import { useAuth } from './context/AuthContext';
import { createProduct } from '@/utils/api/products';
import { fetchCategories, Category as ApiCategory } from '@/utils/api/products';
import { router, useLocalSearchParams } from 'expo-router'
import { commonStyles } from '@/styles/CommonStyles';
import { CarModel, fetchCarMakes, fetchCarModels } from '@/utils/api/carData';



interface NewProduct {
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

// 1) New form state type: everything as string except booleans/enums
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
const BOX = 80

const emptyForm: FormState = {
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


export default function AddProductScreen() {
  const { dark } = useTheme()
  const { token } = useAuth()
  const navigation = useNavigation<NavigationProp<any>>()
  const params = useLocalSearchParams<{ fromStore?: string }>()
  const [isDescFocused, setIsDescFocused] = useState(false)
  const [isTechFocused, setIsTechFocused] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectModal, setSelectModal] = useState<{ visible: boolean; type: 'make' | 'model' | 'variant' | 'year'; options: string[] }>({ visible: false, type: 'make', options: [] });
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [variants, setVariants] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [modelsRaw, setModelsRaw] = useState<CarModel[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<{ make?: boolean; model?: boolean; variant?: boolean }>({});
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>(
    categoriesByParts.map(c => ({ id: String(c.id), name: c.name })).filter(c => c.name.toLowerCase() !== 'all')
  );

  // Removed redundant pickGalleryImage declaration

  // at the top of your component
  const [hasGalleryPermission, setHasGalleryPermission] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasGalleryPermission(status === 'granted');
    })();
  }, []);


  const pickFeaturedImage = async () => {
    if (hasGalleryPermission === false) {
      Alert.alert(
        'Permission required',
        'Please enable photo library permissions in your device settings to select images.'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    changeField('image', uri);
  };

  const pickGalleryImage = async () => {
    if (hasGalleryPermission === false) {
      Alert.alert(
        'Permission required',
        'Please enable photo library permissions in your device settings to select images.'
      );
      return;
    }

    // allow multiple selection
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 0, // 0 means unlimited
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (result.canceled) return;

    // `result.assets` is now an array of { uri, ... }
    const uris = result.assets.map(asset => asset.uri);
    changeField('gallery', [...form.gallery, ...uris]);
  };


  // Reset form on mount
  useEffect(() => {
    setForm(emptyForm)
  }, [])

  // Fetch categories from backend
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
        // fallback to static
      }
      setCategoryOptions(categoriesByParts.map(c => ({ id: String(c.id), name: c.name })).filter(c => c.name.toLowerCase() !== 'all'));
    };
    loadCategories();
  }, []);

  // fetch car makes from our API
  useEffect(() => {
    const loadMakes = async () => {
      try {
        setLoadingOptions(prev => ({ ...prev, make: true }));
        const res = await fetchCarMakes(undefined, token);
        const names: string[] = Array.isArray((res as any)?.makes)
          ? (res as any).makes.map((m: any) => String(m))
          : [];
        const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
        setMakes(unique);
      } catch (err) {
        console.error('fetch car makes failed', err);
      } finally {
        setLoadingOptions(prev => ({ ...prev, make: false }));
      }
    };
    loadMakes();
  }, [token]);

  const deriveVariants = useCallback((modelName: string, year?: string | number, source?: CarModel[]) => {
    const list = source || modelsRaw;
    const normalizedYear = typeof year === 'string' && /^\d{4}$/.test(year) ? year : typeof year === 'number' ? String(year) : undefined;
    const matches = list.filter(m => m.modelName === modelName && (!normalizedYear || String(m.year) === normalizedYear));
    const next = Array.from(
      new Set(
        matches.flatMap(m => Array.isArray(m.variants) ? m.variants : []).filter(Boolean)
      )
    );
    return next.length ? next.sort((a, b) => a.localeCompare(b)) : (modelName ? [modelName] : []);
  }, [modelsRaw]);

  const deriveYears = useCallback((modelName?: string, variant?: string, source?: CarModel[]) => {
    const list = source || modelsRaw;
    let filtered = modelName ? list.filter(m => m.modelName === modelName) : list;
    if (variant) {
      filtered = filtered.filter(m => Array.isArray(m.variants) && m.variants.includes(variant));
    }
    const yearsOnly = filtered.map(m => Number(m.year)).filter(y => !Number.isNaN(y));
    if (!yearsOnly.length) return [];
    const min = Math.min(...yearsOnly);
    const max = Math.max(...yearsOnly);
    return [min === max ? String(min) : `${min}-${max}`];
  }, [modelsRaw]);

  const fetchModels = useCallback(async (make: string) => {
    if (!make) return;
    try {
      setLoadingOptions(prev => ({ ...prev, model: true }));
      const res = await fetchCarModels(make, undefined, token);
      const items: CarModel[] = Array.isArray((res as any)?.models) ? (res as any).models : [];
      setModelsRaw(items);
      const names: string[] = Array.from(new Set(items.map((m: CarModel) => String(m.modelName)))).sort((a, b) => a.localeCompare(b));
      setModels(names);
      setVariants([]);
      setYears(deriveYears(undefined, undefined, items));
      return items;
    } catch (err) {
      console.error('fetch car models failed', err);
      setModels([]);
      setVariants([]);
    } finally {
      setLoadingOptions(prev => ({ ...prev, model: false }));
    }
  }, [form.year, token, deriveYears]);

  useEffect(() => {
    if (form.make) {
      fetchModels(form.make);
    }
  }, [form.make, fetchModels]);

  useEffect(() => {
    if (form.model) {
      setVariants(deriveVariants(form.model, form.year));
    } else {
      setVariants([]);
    }
  }, [form.model, form.year, deriveVariants]);

  const goBack = () => {
    if (params.fromStore) {
      router.back()
      return
    }
    navigation.goBack()
  }

  // Generic change handler
  const changeField = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const sanitizeNumberInput = (value: string) => value.replace(/[^\d]/g, '')
  const parseReturnDays = (input: string) => {
    const trimmed = input.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
  }

  const toggleCategory = (catName: string) =>
    setForm(prev => ({
      ...prev,
      category: prev.category.includes(catName)
        ? prev.category.filter(c => c !== catName)
        : [...prev.category, catName],
    }))

  // 2) On save, parse strings back into numbers
  const handleSave = async () => {
    if (isSaving) return;
    if (!token) {
      Alert.alert('Not signed in', 'Please log in again.');
      return;
    }
    if (!form.image) {
      Alert.alert('Missing image', 'Please add a featured image.');
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
      setIsSaving(true);
      await createProduct(payload as any, token);
      Alert.alert('Product added', 'Your product has been created.');
      if (params.fromStore) {
        router.replace({
          pathname: '/seller/products',
          params: { refresh: Date.now().toString() },
        });
      } else {
        navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Could not save product.');
    } finally {
      setIsSaving(false);
    }
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={goBack}>
          <Image
            source={icons.back}
            resizeMode="contain"
            style={[
              styles.backIcon,
              { tintColor: dark ? COLORS.white : COLORS.greyscale900 },
            ]}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: dark ? COLORS.white : COLORS.greyscale900 },
          ]}
        >
          Add Product
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
                          changeField('make', opt);
                          changeField('model', '');
                          changeField('variant', '');
                          changeField('year', '');
                          setModels([]);
                          setVariants([]);
                          setYears([]);
                        } else if (selectModal.type === 'model') {
                          changeField('model', opt);
                          changeField('variant', '');
                          changeField('year', '');
                          const nextVariants = deriveVariants(opt, form.year);
                          setVariants(nextVariants);
                          setYears(deriveYears(opt));
                        } else if (selectModal.type === 'variant') {
                          changeField('variant', opt);
                          const nextYears = deriveYears(form.model, opt);
                          setYears(nextYears);
                          if (!nextYears.includes(form.year)) {
                            changeField('year', '');
                          }
                        } else if (selectModal.type === 'year') {
                          changeField('year', opt);
                          if (form.model) {
                            const nextVariants = deriveVariants(form.model, opt);
                            setVariants(nextVariants);
                            if (!nextVariants.includes(form.variant)) {
                              changeField('variant', '');
                            }
                          } else {
                            setVariants([]);
                          }
                        }
                        setSelectModal(prev => ({ ...prev, visible: false }));
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
      <SafeAreaView
        style={[styles.area, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}
      >
        <View style={[styles.container, { backgroundColor: COLORS.white }]}>
          {renderHeader()}

          <ScrollView contentContainerStyle={styles.scroll}>
            {/* Featured Image */}
            {/* Featured Image */}
            <View style={styles.field}>
              <Text
                style={[
                  commonStyles.inputHeader,
                  { color: dark ? COLORS.white : COLORS.black, marginBottom: 12 },
                ]}
              >
                Featured Image *
              </Text>
              <ImagePickerBox
                uri={form.image}
                onPick={pickFeaturedImage}
                onDelete={() => changeField('image', '')}
              />
            </View>




            {/* Gallery Images */}
            <View style={styles.field}>
              <Text
                style={[
                  commonStyles.inputHeader,
                  { color: dark ? COLORS.white : COLORS.black, marginBottom: 12 },
                ]}
              >
                Gallery Images (Optional)
              </Text>

              <View style={styles.uploadRow}>
                {form.gallery.map((uri, i) => (
                  <ImagePickerBox
                    key={uri + i}
                    uri={uri}
                    onPick={() => {/* maybe open preview instead */ }}
                    onDelete={() =>
                      changeField(
                        'gallery',
                        form.gallery.filter(u => u !== uri)
                      )
                    }
                  />
                ))}
                {/* the “+” to add more */}
                <ImagePickerBox
                  uri={''}
                  onPick={pickGalleryImage}
                  onDelete={() => { }}
                />
              </View>

            </View>



            {/* Vehicle selectors */}
            <Text style={[commonStyles.inputHeader, commonStyles.inputHeader2, { color: dark ? COLORS.white : COLORS.black }]}>Make *</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setSelectModal({ visible: true, type: 'make', options: makes })}
            >
              <Text style={[styles.selectValue, { color: form.make ? COLORS.greyscale900 : COLORS.grayTie }]}>
                {form.make || (loadingOptions.make ? 'Loading...' : 'Select make')}
              </Text>
            </TouchableOpacity>

            <Text style={[commonStyles.inputHeader, commonStyles.inputHeader2, { color: dark ? COLORS.white : COLORS.black }]}>Model *</Text>
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
                {form.model || 'Select model'}
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

            {/* Text Fields */}
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
                  <Text
                    style={[
                      commonStyles.inputHeader,
                      { color: dark ? COLORS.white : COLORS.black },
                    ]}
                  >
                    {label}
                  </Text>
                  <Input
                    id={key}
                    value={form[key]}
                    onInputChanged={(id, val) =>
                      changeField(key as any, val as any)
                    }
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
              <Text
                style={[
                  commonStyles.inputHeader,
                  { color: dark ? COLORS.white : COLORS.black },
                ]}
              >
                Dimensions in Inches *
              </Text>
              <View style={styles.inlineRow2}>
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
              <Text
                style={[
                  commonStyles.inputHeader,
                  { color: dark ? COLORS.white : COLORS.black },
                ]}
              >
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
              <Text
                style={[
                  commonStyles.inputHeader,
                  { color: dark ? COLORS.white : COLORS.black },
                ]}
              >
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
              <Text style={[styles.helperText, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                Leave empty if this product is non-returnable.
              </Text>
            </View>

            {/* Categories */}
            <View style={styles.field}>
              <Text
                style={[
                  commonStyles.inputHeader,
                  { color: dark ? COLORS.white : COLORS.black },
                ]}
              >
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
                    <Text
                      style={{
                        color: form.category.includes(cat.id)
                          ? COLORS.white
                          : COLORS.black, fontFamily: "regular",
                      }}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status */}
            <View style={styles.field}>
              <Text
                style={[
                  commonStyles.inputHeader,
                  { color: dark ? COLORS.white : COLORS.black },
                ]}
              >
                Status *
              </Text>
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
                    <Text
                      style={{
                        color: form.status === st ? COLORS.white : COLORS.black, fontFamily: "regular"
                      }}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text
                style={[
                  commonStyles.inputHeader,
                  { color: dark ? COLORS.white : COLORS.black , marginTop: 8},
                ]}
              >
                Description * 
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    borderColor: isDescFocused
                      ? dark ? COLORS.primary100 : COLORS.primary
                      : dark ? COLORS.dark2 : COLORS.greyscale500,
                    backgroundColor: isDescFocused
                      ? COLORS.tansparentPrimary
                      : dark ? COLORS.dark2 : COLORS.greyscale500,
                    color: COLORS.black,
                    flex: 1,
                    fontFamily: 'regular',
                    fontSize: 14,
                  },
                ]}
                multiline
                numberOfLines={4}
                placeholder="Enter description"
                placeholderTextColor={dark ? COLORS.grayTie : COLORS.grayTie}
                value={form.description}
                onChangeText={v => changeField('description', v)}
                onFocus={() => setIsDescFocused(true)}
                onBlur={() => setIsDescFocused(false)}
              />
            </View>

            {/* Technical Description */}
            <View style={styles.field}>
              <Text
                style={[
                  commonStyles.inputHeader,
                  { color: dark ? COLORS.white : COLORS.black },
                ]}
              >
                Technical Description (Optional)
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    borderColor: isTechFocused
                      ? dark ? COLORS.primary100 : COLORS.primary
                      : dark ? COLORS.dark2 : COLORS.greyscale500,
                    backgroundColor: isTechFocused
                      ? COLORS.tansparentPrimary
                      : dark ? COLORS.dark2 : COLORS.greyscale500,
                    color: COLORS.black,
                    flex: 1,
                    fontFamily: 'regular',
                    fontSize: 14,
                  },
                ]}
                multiline
                numberOfLines={4}
                placeholder="Enter tehcnical description"
                placeholderTextColor={dark ? COLORS.grayTie : COLORS.grayTie}
                value={form.technicalDescription}
                onChangeText={v => changeField('technicalDescription', v)}
                onFocus={() => setIsTechFocused(true)}
                onBlur={() => setIsTechFocused(false)}
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={goBack} style={[styles.cancelBtn, {
              borderColor: dark ? COLORS.white : COLORS.primary
            }]}>
              <Text style={[styles.cancelBtnText, {
                color: dark ? COLORS.white : COLORS.primary,
              }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
            >
              <Text style={[styles.saveBtnText, { color: COLORS.white }]}>
                {isSaving ? 'Adding...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  uploadRow: { flexDirection: 'row', flexWrap: 'wrap', },
  uploadBox: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',

  },
  plusSign: { fontSize: 32, color: COLORS.primary },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  selectBox: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: COLORS.grayscale200,
    marginTop: 6,
  },
  selectValue: {
    fontFamily: 'medium',
    fontSize: 14,
    marginTop: 4,
  },
  inlineRow: { flexDirection: 'column-reverse', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 16, marginTop: 8 },
  inlineRow2: { flexDirection: 'column-reverse', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 16, },
  inlineItem: { flex: 1},
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
    marginTop: 8,
    fontFamily: "semiBold",
  },
  textArea: {
    height: 100,
    width: '100%',
    padding: SIZES.padding,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 5,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 24,
  
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
  saveBtn: {
    width: '50%',
    height: 58,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
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
  deleteButton: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: COLORS.red,
    width: 20,
    height: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: 'bold',
  },
  boxWrapper: {
    width: BOX,
    height: BOX,

  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  optionSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  optionTitle: { fontFamily: 'bold', fontSize: 16, marginBottom: 8 },
  optionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayscale200 },


})
