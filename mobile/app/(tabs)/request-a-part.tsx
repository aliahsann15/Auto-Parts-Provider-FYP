// RequestAPartScreen.tsx
// React Native “Request a Part” form — clean code, comments, best practices

import React, { useCallback, useReducer, useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import HeaderWithSearch from '../../components/HeaderWithSearch';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import icons from '../../constants/icons';
import { illustrations } from '@/constants';
import { commonStyles } from '@/styles/CommonStyles';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import { validateInput } from '@/utils/actions/formActions';
import { reducer as formReducer } from '@/utils/reducers/formReducers';
import { router } from 'expo-router';
import { useAuth } from '@/app/context/AuthContext';
import { submitPartRequest } from '@/utils/api/partsRequests';
import { fetchCarMakes, fetchCarModels, CarModel } from '@/utils/api/carData';
import { categoriesByParts } from '@/data/sellerDashboardData';
import { fetchCategories, Category as ApiCategory } from '@/utils/api/products';


// Initial form state for reducer
const initialState = {
  inputValues: {
    companyName: '',
    carModel: '',
    category: '',
    carVariant: '',
    year: '',
    partName: '',
    description: '',
  },
  inputValidities: {
    companyName: false,
    carModel: false,
    category: false,
    carVariant: true,
    year: false,
    partName: false,
    description: true, // optional
  },
  formIsValid: false,
};

type Nav = { navigate: (screen: string) => void };




const RequestAPartScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  function submitHandler() {
    router.push("/(tabs)/inbox");
  }
  // Local-only state
  const [qty, setQty] = useState(1);
  const [images, setImages] = useState<{ uri: string; name?: string; type?: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectModal, setSelectModal] = useState<{ visible: boolean; type: 'make' | 'model' | 'variant' | 'category' | 'year'; options: string[] }>({ visible: false, type: 'make', options: [] });
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [modelsRaw, setModelsRaw] = useState<CarModel[]>([]);
  const [variants, setVariants] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    categoriesByParts
      .filter(c => c.name.toLowerCase() !== 'all')
      .map(c => ({ id: String(c.id), name: c.name }))
  );
  const [categorySearch, setCategorySearch] = useState('');
  const [loadingOptions, setLoadingOptions] = useState<{ make?: boolean; model?: boolean; variant?: boolean }>({});

  const { dark } = useTheme();
  const { isLoggedIn, token } = useAuth();


  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // Form state managed by reducer
  const [formState, dispatchFormState] = useReducer(formReducer, initialState);

  // Handler for each field change
  const inputChangedHandler = useCallback((field: string, value: string) => {
    const validationResult = validateInput(field, value);
    dispatchFormState({
      type: 'UPDATE',
      inputId: field,
      inputValue: value,
      validationResult,
    });
  }, []);

  // fetch makes once
  useEffect(() => {
    const loadMakes = async () => {
      try {
        setLoadingOptions(prev => ({ ...prev, make: true }));
        const res = await fetchCarMakes();
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
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetchCategories();
        const list = Array.isArray(res)
          ? (res as ApiCategory[]).map(c => ({ id: String(c._id), name: c.name }))
          : [];
        if (list.length) {
          setCategories(list);
          return;
        }
      } catch {
        // ignore
      }
      setCategories(
        categoriesByParts
          .filter(c => c.name.toLowerCase() !== 'all')
          .map(c => ({ id: String(c.id), name: c.name }))
      );
    };
    loadCategories();
  }, []);

  const deriveVariants = useCallback((modelName: string, year?: string | number, source?: CarModel[]) => {
    const list = source || modelsRaw;
    const normalizedYear =
      typeof year === 'number'
        ? String(year)
        : typeof year === 'string' && /^\d{4}$/.test(year)
          ? year
          : undefined;
    const matches = list.filter(
      m => m.modelName === modelName && (!normalizedYear || String(m.year) === normalizedYear)
    );
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
      const res = await fetchCarModels(make);
      const items: CarModel[] = Array.isArray((res as any)?.models) ? (res as any).models : [];
      setModelsRaw(items);
      const names = Array.from(new Set(items.map((m: CarModel) => m.modelName))).sort((a, b) => a.localeCompare(b));
      setModels(names);
      setVariants([]);
      setYears([]);
    } catch (err) {
      console.error('fetch car models failed', err);
      setModels([]);
      setVariants([]);
      setYears([]);
    } finally {
      setLoadingOptions(prev => ({ ...prev, model: false }));
    }
  }, [deriveYears]);

  useEffect(() => {
    if (formState.inputValues.carModel) {
      setVariants(deriveVariants(formState.inputValues.carModel, formState.inputValues.year));
      setYears(deriveYears(formState.inputValues.carModel, formState.inputValues.carVariant));
    } else {
      setVariants([]);
      setYears([]);
    }
  }, [formState.inputValues.carModel, formState.inputValues.year, formState.inputValues.carVariant, deriveVariants, deriveYears]);

  // Open image picker
  const handleImageUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.8
    });

    if (result.canceled) return;

    const picked = (result.assets || []).map((asset, idx) => ({
      uri: asset.uri,
      name: asset.fileName || `photo-${Date.now()}-${idx}.jpg`,
      type: asset.mimeType || 'image/jpeg'
    }));

    setImages(prev => [...prev, ...picked].slice(0, 8));
  };

  // Submit form to backend
  const handleSubmit = async () => {
    if (!isLoggedIn || !token) {
      Alert.alert('Login required', 'Please sign in to submit a request.');
      return;
    }

    const companyName = formState.inputValues.companyName?.trim();
    const carName = formState.inputValues.carModel?.trim();
    const category = formState.inputValues.category?.trim();
    const variant = formState.inputValues.carVariant?.trim();
    const year = formState.inputValues.year?.trim();
    const partName = formState.inputValues.partName?.trim();
    const description = formState.inputValues.description?.trim();

    if (!companyName || !carName || !partName || !category) {
      Alert.alert('Missing info', 'Company, car model, category, and part name are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await submitPartRequest(
        {
          companyName,
          carName,
          category,
          variant,
          partName,
          year,
          description,
          quantity: qty,
          images
        },
        token
      );

      setModalVisible(true);
      dispatchFormState({ type: 'RESET', initialState });
      setQty(1);
      setImages([]);
    } catch (err: any) {
      Alert.alert('Submit failed', err?.message || 'Could not submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render success modal
  const renderModal = () => (
    <Modal animationType="slide" transparent visible={modalVisible}>
      <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalSubContainer, {
            backgroundColor: dark ? COLORS.dark2 : COLORS.white,
          }]}>
            <View style={styles.backgroundIllustration}>
              <Image
                source={illustrations.background}
                resizeMode="contain"
                style={[styles.modalIllustration, {
                  tintColor: dark ? COLORS.white : COLORS.primary,
                }]}
              />
              <Image
                source={icons.check}
                resizeMode="contain"
                style={[styles.editPencilIcon, {
                  tintColor: dark ? COLORS.dark3 : COLORS.white,
                }]}
              />
            </View>
            <Text style={[styles.modalTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
              Request Successful!
            </Text>
            <Text style={[styles.modalSubtitle, { color: dark ? COLORS.white : COLORS.black }]}>
              You have successfully requested a part.
            </Text>
            <Button
              title="See Requests"
              onPress={() => {
                setModalVisible(false);
                submitHandler();
              }}
              textColor={dark ? COLORS.black : COLORS.white}
              style={{
                width: '100%',
                marginTop: 12,
                borderRadius: 32,
                backgroundColor: dark ? COLORS.dark3 : COLORS.black,
              }}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );



  return (
    <>
      {renderModal()}
      {/* selection modal */}
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
                        : selectModal.type === 'category'
                        ? 'Select Category'
                        : selectModal.type === 'year'
                          ? 'Select Year'
                          : 'Select Variant (Body Style)'}
                </Text>
                <ScrollView style={{ maxHeight: 360 }}>
                  {selectModal.options.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.optionRow}
                      onPress={() => {
                        if (selectModal.type === 'make') {
                          inputChangedHandler('companyName', opt);
                          inputChangedHandler('carModel', '');
                          inputChangedHandler('carVariant', '');
                          inputChangedHandler('year', '');
                          setModels([]);
                          setVariants([]);
                          setYears([]);
                          fetchModels(opt);
                        } else if (selectModal.type === 'model') {
                          inputChangedHandler('carModel', opt);
                          inputChangedHandler('carVariant', '');
                          inputChangedHandler('year', '');
                          const nextVariants = deriveVariants(opt, formState.inputValues.year);
                          setVariants(nextVariants);
                          setYears(deriveYears(opt));
                        } else if (selectModal.type === 'variant') {
                          inputChangedHandler('carVariant', opt);
                          const nextYears = deriveYears(formState.inputValues.carModel, opt);
                          setYears(nextYears);
                          if (!nextYears.includes(formState.inputValues.year)) {
                            inputChangedHandler('year', '');
                          }
                        } else if (selectModal.type === 'category') {
                          inputChangedHandler('category', opt);
                        } else if (selectModal.type === 'year') {
                          inputChangedHandler('year', opt);
                          if (formState.inputValues.carModel) {
                            const nextVariants = deriveVariants(formState.inputValues.carModel, opt);
                            setVariants(nextVariants);
                            if (!nextVariants.includes(formState.inputValues.carVariant)) {
                              inputChangedHandler('carVariant', '');
                            }
                          }
                        }
                        setSelectModal(prev => ({ ...prev, visible: false }));
                      }}
                    >
                      <Text style={{ color: dark ? COLORS.white : COLORS.black, fontFamily: 'medium' }}>
                        {selectModal.type === 'category'
                          ? categories.find(c => c.id === opt)?.name || opt
                          : opt}
                      </Text>
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

      <SafeAreaView style={[styles.area, { backgroundColor: COLORS.white }]}>
        <View style={styles.container}>
          <HeaderWithSearch
            title="Request a Part"
          />
          {isLoggedIn ? (

            <>
              <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <Text style={[commonStyles.inputHeader, commonStyles.inputHeader2, { color: dark ? COLORS.white : COLORS.black }]}>
                  Make *
                </Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setSelectModal({ visible: true, type: 'make', options: makes })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.selectValue, { color: formState.inputValues.companyName ? COLORS.greyscale900 : COLORS.grayTie }]}>
                    {formState.inputValues.companyName || (loadingOptions.make ? 'Loading makes...' : 'Select make')}
                  </Text>
                </TouchableOpacity>
                <Text style={[commonStyles.inputHeader, commonStyles.inputHeader2, { color: dark ? COLORS.white : COLORS.black }]}>
                  Model *
                </Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => {
                    if (!formState.inputValues.companyName) {
                      Alert.alert('Select a make first');
                      return;
                    }
                    setSelectModal({ visible: true, type: 'model', options: models });
                  }}
                  activeOpacity={0.8}
                >

                  <Text style={[styles.selectValue, { color: formState.inputValues.carModel ? COLORS.greyscale900 : COLORS.grayTie }]}>
                    {formState.inputValues.carModel || (loadingOptions.model ? 'Loading models...' : 'Select model')}
                  </Text>
                </TouchableOpacity>
                <Text style={[commonStyles.inputHeader, commonStyles.inputHeader2, { color: dark ? COLORS.white : COLORS.black }]}>
                  Variant (Body Style)
                </Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => {
                    if (!formState.inputValues.carModel) {
                      Alert.alert('Select a model first');
                      return;
                    }
                    setSelectModal({ visible: true, type: 'variant', options: variants });
                  }}
                  activeOpacity={0.8}
                >

                  <Text style={[styles.selectValue, { color: formState.inputValues.carVariant ? COLORS.greyscale900 : COLORS.grayTie }]}>
                    {formState.inputValues.carVariant || 'Select variant/body style'}
                  </Text>
                </TouchableOpacity>

                <Text style={[commonStyles.inputHeader, commonStyles.inputHeader2, { color: dark ? COLORS.white : COLORS.black }]}>
                  Select Year
                </Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => {
                    if (!formState.inputValues.carModel) {
                      Alert.alert('Select a model first');
                      return;
                    }
                    const opts = deriveYears(formState.inputValues.carModel, formState.inputValues.carVariant);
                    if (!opts.length) {
                      Alert.alert('No years available for this selection');
                      return;
                    }
                    setSelectModal({ visible: true, type: 'year', options: opts });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.selectValue, { color: formState.inputValues.year ? COLORS.greyscale900 : COLORS.grayTie }]}>
                    {formState.inputValues.year || 'Select year'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.field}>
                  <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black }]}>
                    Part Name *
                  </Text>
                  <Input
                    id="partName"
                    value={formState.inputValues.partName}
                    onInputChanged={inputChangedHandler}
                    errorText={formState.inputValidities.partName}
                    placeholder="Enter part name"
                    placeholderTextColor={dark ? COLORS.black : COLORS.grayTie}
                  />
                </View>
                <Text style={[commonStyles.inputHeader, commonStyles.inputHeader2, { color: dark ? COLORS.white : COLORS.black }]}>
                  Category *
                </Text>
                <TouchableOpacity
                  style={[
                    styles.selectBox,
                    formState.inputValidities.category ? { borderColor: COLORS.red } : {},
                  ]}
                  onPress={() => {
                    const filtered = categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()));
                    setSelectModal({
                      visible: true,
                      type: 'category',
                      options: filtered.map(c => c.id),
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.selectValue, { color: formState.inputValues.category ? COLORS.greyscale900 : COLORS.grayTie }]}>
                    {categories.find(c => c.id === formState.inputValues.category)?.name || 'Select category'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.labelQty}>
                  Quantity <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.qtyBox}>
                  <TouchableOpacity onPress={() => setQty(q => Math.max(1, q - 1))}>
                    <Text style={styles.qtyText}>−</Text>
                  </TouchableOpacity>
                {formState.inputValidities.category ? (
                  <Text style={styles.errorText}>{formState.inputValidities.category}</Text>
                ) : null}
                  <Text style={styles.qtyText}>{qty}</Text>
                  <TouchableOpacity onPress={() => setQty(q => q + 1)}>
                    <Text style={styles.qtyText}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.field]}>
                  <Text style={[commonStyles.inputHeader, { color: dark ? COLORS.white : COLORS.black, marginBottom: 7, marginTop: 12 }]}>
                    Description (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.textArea,
                      {
                        borderColor: isFocused
                          ? dark ? COLORS.primary100 : COLORS.primary
                          : dark ? COLORS.dark2 : COLORS.greyscale500,
                        backgroundColor: isFocused
                          ? COLORS.tansparentPrimary
                          : dark ? COLORS.dark2 : COLORS.grayscale200,
                        color: dark ? COLORS.white : COLORS.black,
                        flex: 1,
                        fontFamily: 'regular',
                        fontSize: 14,

                      },
                    ]}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholder="Enter description"
                    placeholderTextColor={dark ? COLORS.black : COLORS.grayTie}
                    value={formState.inputValues.description}
                    onChangeText={text => inputChangedHandler('description', text)}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </View>

                <Text style={styles.labelQty}>
                  Upload Images (Optional)
                </Text>
                <View style={styles.uploadRow}>
                  {images.map((img, i) => (
                    <Image key={i} source={{ uri: img.uri }} style={styles.uploadBox} />
                  ))}
                  <TouchableOpacity style={styles.uploadBox} onPress={handleImageUpload}>
                    <Text style={styles.plusSign}>+</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitText}>{isSubmitting ? 'Submitting...' : 'Submit'}</Text>
              </TouchableOpacity></>)
            : (


              <ScrollView
                contentContainerStyle={{
                  flex: 1,
                  backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 16,
                }}
              >

                <TouchableOpacity style={styles.LoginBtn} onPress={() => navigation.navigate("login")}>
                  <Text style={styles.submitText}>Login to View</Text>
                </TouchableOpacity>
              </ScrollView>)





          }
        </View>
      </SafeAreaView>
    </>
  );
};

export default RequestAPartScreen;

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  scroll: { paddingVertical: 20 },
  field: { marginTop: 12 },

  label: { ...FONTS.body4, marginVertical: 4, fontFamily: 'semiBold' },
  labelQty: { ...FONTS.body4, marginTop: 18, fontFamily: 'semiBold' },
  required: { color: COLORS.primary },
  optional: { color: '#666' },

  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 75,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 6,
    marginTop: 9,
    justifyContent: 'center'
  },
  qtyText: { marginHorizontal: 8, fontSize: 16, color: COLORS.primary, fontFamily: 'medium' },

  textArea: {
    height: 100,
    width: '100%',
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.padding2,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 5,

  },

  uploadRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 12, gap: 10 },
  uploadBox: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  plusSign: { fontSize: 32, color: COLORS.primary },
  selectBox: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.greyscale300,
    backgroundColor: COLORS.grayscale200,
    marginTop: 12,
  },
  selectValue: {
    fontSize: 14,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'regular',
    color: COLORS.red,
    marginTop: 6,
  },

  LoginBtn: {
    height: 58,
    width: '70%',
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    backgroundColor: COLORS.black,
    flexDirection: "row",
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 60,
    marginTop: 16
  },
  submitBtn: {
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
    textAlign: "center",
    marginBottom: 50,
    marginTop: 16
  },
  submitText: {
    fontSize: 16,
    fontFamily: "bold",
    color: COLORS.white,
    textAlign: "center",
  },

  // Modal styles
  modalContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSubContainer: { height: 400, width: SIZES.width * 0.9, borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center' },
  backgroundIllustration: { height: 150, width: 150, alignItems: 'center', justifyContent: 'center' },
  modalIllustration: { height: 180, width: 180 },
  editPencilIcon: { position: 'absolute', top: 50, left: 52, width: 52, height: 52, zIndex: 10 },
  modalTitle: { fontSize: 24, fontFamily: 'bold', textAlign: 'center', marginVertical: 12 },
  modalSubtitle: { fontSize: 16, fontFamily: 'regular', textAlign: 'center', marginVertical: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  optionSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  optionTitle: { fontFamily: 'bold', fontSize: 16, marginBottom: 8 },
  optionRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.grayscale200 },
});
