import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { COLORS, SIZES, icons, images } from "../constants";
import Header from "../components/Header";
import { reducer } from "../utils/reducers/formReducers";
import Input from "../components/Input";
import ButtonFilled from "../components/ButtonFilled";
import { useTheme } from "../theme/ThemeProvider";
import { router, useNavigation } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import CnicImagePickerBox from "@/components/CnicImagePickerBox";
import { NavigationProp } from "@react-navigation/native";
import { checkEmail, register as registerApi, verifyEmail } from "@/utils/api/auth";
import { useAuth } from "./context/AuthContext";
import { updateUserProfile as updateUserProfileApi } from "@/utils/api/user";
import { categoriesByParts } from "@/data/sellerDashboardData";
import { fetchCarMakes } from "@/utils/api/carData";
import { fetchCategories, Category as ApiCategory } from "@/utils/api/products";

const steps = ["Personal", "Business", "ID Upload", "Verify", "Makes", "Categories", "Done"];

const SignupSeller: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { colors, dark } = useTheme();
  const { setAuth, user, token, updateUserProfile: syncUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [formState, dispatchFormState] = useReducer(reducer, {
    inputValues: {
      fullName: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirm: '',
      business: '',
      license: '',
      cnic: '',
      businessType: '',
      businessStreet: '',
      businessProvince: '',
      businessCity: '',
    },
    inputValidities: {
      email: false,
      fullName: false,
      phoneNumber: false,
      password: false,
      confirm: false,
      business: false,
      license: false,
      cnic: false,
      businessType: false,
      businessStreet: false,
      businessProvince: false,
      businessCity: false,
    },
    formIsValid: false,
  });
  const [termsChecked, setTermsChecked] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const [availableMakes, setAvailableMakes] = useState<string[]>([]);
  const [selectedMakes, setSelectedMakes] = useState<string[]>([]);
  const [makeSearch, setMakeSearch] = useState("");
  const [isLoadingMakes, setIsLoadingMakes] = useState(false);
  const [hasAttemptedMakes, setHasAttemptedMakes] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>(
    categoriesByParts
      .filter(c => c.name.toLowerCase() !== 'all')
      .map(c => ({ id: String(c.id), name: c.name }))
  );
  const [showBusinessTypeDropdown, setShowBusinessTypeDropdown] = useState(false);
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const provinces: Record<string, string[]> = {
    Punjab: ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot'],
    Sindh: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana'],
    'Khyber Pakhtunkhwa': ['Peshawar', 'Abbottabad', 'Mardan', 'Swat'],
    Balochistan: ['Quetta', 'Gwadar', 'Sibi', 'Turbat'],
    'Islamabad Capital Territory': ['Islamabad'],
    'Gilgit-Baltistan': ['Gilgit', 'Skardu', 'Hunza'],
    'Azad Kashmir': ['Muzaffarabad', 'Mirpur', 'Kotli'],
  };

  const fetchMakes = useCallback(async () => {
    setHasAttemptedMakes(true);
    try {
      setIsLoadingMakes(true);
      const res = await fetchCarMakes();
      const names: string[] = Array.isArray((res as any)?.makes)
        ? (res as any).makes.map((m: any) => String(m))
        : [];
      const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
      setAvailableMakes(unique);
    } catch (err) {
      console.error('fetch makes failed', err);
      if (!availableMakes.length) {
        // Fallback to a small static list so UI stays stable offline
        setAvailableMakes(['Toyota', 'Honda', 'Suzuki', 'Nissan', 'Ford', 'Chevrolet', 'Hyundai', 'Kia', 'BMW', 'Mercedes-Benz']);
      }
    } finally {
      setIsLoadingMakes(false);
    }
  }, [availableMakes.length]);

  useEffect(() => {
    if (currentStep === 4 && !hasAttemptedMakes && !isLoadingMakes) {
      fetchMakes();
    }
  }, [currentStep, hasAttemptedMakes, isLoadingMakes, fetchMakes]);

  useEffect(() => {
    if (user?.sellerMakes?.length) {
      setSelectedMakes(user.sellerMakes);
    }
    if (user?.sellerCategories?.length) {
      setSelectedCategories(user.sellerCategories);
    }
  }, [user?.sellerMakes, user?.sellerCategories]);

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
        // ignore, fallback to static
      }
      setCategoryOptions(
        categoriesByParts
          .filter(c => c.name.toLowerCase() !== 'all')
          .map(c => ({ id: String(c.id), name: c.name }))
      );
    };
    loadCategories();
  }, []);

  const formatCnic = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  };

  const formatPhone = (value: string) => value.replace(/\D/g, '').slice(0, 11);

  const inputChangedHandler = useCallback(
    (id: string, val: string) => {
      const nextVal = id === 'cnic' ? formatCnic(val) : id === 'phoneNumber' ? formatPhone(val) : val;
      dispatchFormState({
        type: 'UPDATE',
        inputId: id,
        inputValue: nextVal,
        validationResult: true,
      });
    },
    [dispatchFormState]
  );

  const validateStepOne = async () => {
    const email = formState.inputValues.email?.trim();
    const fullName = formState.inputValues.fullName?.trim();
    const phoneNumber = formState.inputValues.phoneNumber?.trim();
    const password = formState.inputValues.password;
    const confirm = formState.inputValues.confirm;
    if (!email || !fullName || !phoneNumber || !password || !confirm) {
      return { ok: false, msg: 'Please fill all required fields.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { ok: false, msg: 'Please enter a valid email.' };
    }
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length !== 11) {
      return { ok: false, msg: 'Please enter an 11 digit phone number.' };
    }
    if (password.length < 6) {
      return { ok: false, msg: 'Password must be at least 6 characters.' };
    }
    if (password !== confirm) {
      return { ok: false, msg: 'Passwords do not match.' };
    }
    try {
      const res = await checkEmail({ email });
      if (res.exists) {
        return { ok: false, msg: 'Email already exists.' };
      }
    } catch (err: any) {
      // If email check fails, don't block progression for connectivity; show warning
      return { ok: false, msg: err?.message || 'Unable to validate email.' };
    }
    return { ok: true };
  };

  const validateStepTwo = () => {
    const { business, license, businessType, businessStreet, businessProvince, businessCity } = formState.inputValues;
    if (!business?.trim() || !license?.trim() || !businessType?.trim()) {
      return { ok: false, msg: 'Please fill all required fields.' };
    }
    if (!businessStreet?.trim() || !businessProvince?.trim() || !businessCity?.trim()) {
      return { ok: false, msg: 'Please add your business address (street, province, city).' };
    }
    return { ok: true };
  };

  const validateStepThree = () => {
    const cnic = formState.inputValues.cnic?.trim();
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnic) return { ok: false, msg: 'Please enter CNIC number.' };
    if (!cnicRegex.test(cnic)) return { ok: false, msg: 'Invalid CNIC format. Use 33102-8116332-5.' };
    if (!frontImage || !backImage) return { ok: false, msg: 'Please upload both front and back CNIC images.' };
    return { ok: true };
  };

  const toggleMake = useCallback((make: string) => {
    setSelectedMakes(prev =>
      prev.includes(make) ? prev.filter(m => m !== make) : [...prev, make]
    );
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }, []);

  const registerSeller = async () => {
    if (registeredEmail) {
      return;
    }
    const email = formState.inputValues.email?.trim();
    const fullName = formState.inputValues.fullName?.trim();
    const phoneNumber = formState.inputValues.phoneNumber?.trim();
    const password = formState.inputValues.password;
    const business = formState.inputValues.business?.trim();
    const license = formState.inputValues.license?.trim();
    const cnic = formState.inputValues.cnic?.trim();
    const businessType = formState.inputValues.businessType?.trim();
    const businessStreet = formState.inputValues.businessStreet?.trim();
    const businessProvince = formState.inputValues.businessProvince?.trim();
    const businessCity = formState.inputValues.businessCity?.trim();
    if (!email || !fullName || !password || !phoneNumber || !business || !license || !cnic || !businessType || !businessStreet || !businessProvince || !businessCity) {
      throw new Error('Missing required fields');
    }
    const digits = phoneNumber.replace(/\D/g, '').slice(0, 11);
    setIsRegistering(true);
    try {
      const res = await registerApi({
        name: fullName,
        email,
        phoneNumber: digits,
        password,
        role: 'Seller',
        cnic,
        businessName: business,
        businessType,
        licenseNumber: license,
        cnicImages: [frontImage, backImage],
        businessStreet,
        businessProvince,
        businessCity,
      });
      setRegisteredEmail(email);
      if (res?.user && res?.token) {
        await setAuth({ user: res.user, token: res.token, remember: true });
      }
      return res;
    } finally {
      setIsRegistering(false);
    }
  };

  const handleVerifyOtp = async () => {
    const email = registeredEmail || formState.inputValues.email?.trim();
    const code = otpValues.join('');
    if (!email) {
      alert('Missing email for verification.');
      return;
    }
    if (code.length !== 6) {
      alert('Enter the 6 digit code sent to your email.');
      return;
    }
    setIsVerifying(true);
    try {
      const verifyRes = await verifyEmail({ email, code });
      const nextToken = (verifyRes as any)?.token || token;
      if (user && nextToken) {
        await setAuth({ user: { ...user, isEmailVerified: true }, token: nextToken, remember: true });
      }
      setCurrentStep(4);
    } catch (err: any) {
      alert(err?.message || 'Invalid code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const persistSellerPreferences = useCallback(async () => {
    if (!user?.id || !token) {
      throw new Error('Login required to save preferences.');
    }
    const updated = await updateUserProfileApi(
      user.id,
      { sellerMakes: selectedMakes, sellerCategories: selectedCategories },
      token
    );
    if (updated) {
      await syncUser(updated);
    }
  }, [selectedMakes, selectedCategories, user?.id, token, syncUser]);

  const goNext = async () => {
    if (currentStep === 0) {
      const check = await validateStepOne();
      if (!check.ok) {
        alert(check.msg);
        return;
      }
      setCurrentStep((s) => s + 1);
      return;
    }
    if (currentStep === 1) {
      const check = validateStepTwo();
      if (!check.ok) {
        alert(check.msg);
        return;
      }
      setCurrentStep((s) => s + 1);
      return;
    }
    if (currentStep === 2) {
      const check = validateStepThree();
      if (!check.ok) {
        alert(check.msg);
        return;
      }
      try {
        await registerSeller();
        setCurrentStep((s) => s + 1);
      } catch (err: any) {
        alert(err?.message || 'Registration failed.');
      }
      return;
    }
    if (currentStep === 3) {
      await handleVerifyOtp();
      return;
    }
    if (currentStep === 4) {
      if (!selectedMakes.length) {
        alert('Select at least one make you deal in.');
        return;
      }
      setCurrentStep((s) => s + 1);
      return;
    }
    if (currentStep === 5) {
      if (!selectedCategories.length) {
        alert('Select at least one category you deal in.');
        return;
      }
      try {
        await persistSellerPreferences();
        setCurrentStep((s) => s + 1);
      } catch (err: any) {
        alert(err?.message || 'Could not save your preferences.');
      }
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const submitHandler = () => {
    router.replace('/sellerOnboarding1');
  };

  const goBackStep = () => {
    if (currentStep === 0) {
      navigation.goBack();
      return;
    }
    if (currentStep > 0 && currentStep < steps.length - 1) {
      setCurrentStep((s) => s - 1);
    }
  };

  const codeInputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const pickImage = async (type: 'front' | 'back') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const selected = result.assets[0].uri;
      type === 'front' ? setFrontImage(selected) : setBackImage(selected);
    }
  };

  const deleteImage = (type: 'front' | 'back') => {
    type === 'front' ? setFrontImage(null) : setBackImage(null);
  };


  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Seller Sign Up" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center", paddingBottom: 140 }}
        >
          {/* Logo */}
          <Image
            source={dark ? images.logoDark : images.logo}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Stepper */}
          <View style={styles.stepper}>
            {steps.map((label, i) => {
              const active = i === currentStep;
              return (
                <React.Fragment key={i}>
                  <View style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        active && { backgroundColor: COLORS.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepCircleText,
                          active && { color: "#fff" },
                        ]}
                      >
                        {i + 1}
                      </Text>
                    </View>
                    <Text
                      style={[styles.stepLabel, active && { color: COLORS.primary }]}
                    >
                      {label}
                    </Text>
                  </View>
                  {i < steps.length - 1 && <View style={styles.stepLine} />}
                </React.Fragment>
              );
            })}
          </View>

          {/* Step Content or Confirmation */}
          {currentStep < steps.length - 1 ? (
            <View style={{ width: '95%', alignItems: 'center' }}>
              {currentStep === 0 && (
                <>
                  <Input
                    id="fullName"
                    icon={icons.user}
                    placeholder="Full Name"
                    value={formState.inputValues.fullName}
                    onInputChanged={inputChangedHandler}
                    placeholderTextColor={COLORS.grayTie}
                  />
                  <Input
                    id="email"
                    icon={icons.email}
                    placeholder="Email"
                    keyboardType="email-address"
                    value={formState.inputValues.email}
                    onInputChanged={inputChangedHandler}
                    placeholderTextColor={COLORS.grayTie}
                  />
                  <Input
                    id="phoneNumber"
                    icon={icons.call}
                    placeholder="Phone Number"
                    keyboardType="phone-pad"
                    maxLength={11}
                    value={formState.inputValues.phoneNumber}
                    onInputChanged={inputChangedHandler}
                    placeholderTextColor={COLORS.grayTie}
                  />
                  <Input
                    id="password"
                    icon={icons.padlock}
                    placeholder="Password"
                    secureTextEntry
                    value={formState.inputValues.password}
                    onInputChanged={inputChangedHandler}
                    placeholderTextColor={COLORS.grayTie}
                  />
                  <Input
                    id="confirm"
                    icon={icons.padlock}
                    placeholder="Confirm Password"
                    secureTextEntry
                    value={formState.inputValues.confirm}
                    onInputChanged={inputChangedHandler}
                    placeholderTextColor={COLORS.grayTie}
                  />
                </>
              )}
              {currentStep === 1 && (
                <>
                  <Input
                    id="business"
                    icon={icons.business}
                    placeholder="Business Name"
                    value={formState.inputValues.business}
                    onInputChanged={inputChangedHandler}
                    placeholderTextColor={COLORS.grayTie}
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.dropdownInput,
                      showBusinessTypeDropdown && { borderColor: COLORS.primary }
                    ]}
                    onPress={() => setShowBusinessTypeDropdown((v) => !v)}
                  >
                    <Image
                      source={icons.bag2}
                      style={[styles.icon, showBusinessTypeDropdown ? { tintColor: COLORS.black } : null]}
                    />
                    <Text style={[styles.dropdownText, { color: formState.inputValues.businessType ? COLORS.black : COLORS.grayTie }]}>
                      {formState.inputValues.businessType || 'Select business type'}
                    </Text>
                    <Text style={styles.dropdownCaret}>{showBusinessTypeDropdown ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {showBusinessTypeDropdown && (
                    <View style={[styles.dropdownList, styles.dropdownListBusinessType]}>
                      {['Wholesale', 'Retail'].map(type => (
                        <TouchableOpacity
                          key={type}
                          style={styles.dropdownItem}
                          onPress={() => {
                            inputChangedHandler('businessType', type);
                            setShowBusinessTypeDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <Input
                    id="license"
                    icon={icons.document}
                    placeholder="Business Registration Number"
                    value={formState.inputValues.license}
                    onInputChanged={inputChangedHandler}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.grayTie}
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.dropdownInput,
                      showProvinceDropdown && { borderColor: COLORS.primary }
                    ]}
                    onPress={() => {
                      setShowProvinceDropdown(v => !v);
                      setShowCityDropdown(false);
                    }}
                  >
                    <Image
                      source={icons.location}
                      style={[styles.icon, showProvinceDropdown ? { tintColor: COLORS.black } : null]}
                    />
                    <Text style={[styles.dropdownText, { color: formState.inputValues.businessProvince ? COLORS.black : COLORS.grayTie }]}>
                      {formState.inputValues.businessProvince || 'Select province'}
                    </Text>
                    <Text style={styles.dropdownCaret}>{showProvinceDropdown ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {showProvinceDropdown && (
                    <View style={[styles.dropdownList, styles.dropdownListProvince]}>
                      {Object.keys(provinces).map(prov => (
                        <TouchableOpacity
                          key={prov}
                          style={styles.dropdownItem}
                          onPress={() => {
                            inputChangedHandler('businessProvince', prov);
                            inputChangedHandler('businessCity', '');
                            setShowProvinceDropdown(false);
                            setShowCityDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{prov}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.dropdownInput,
                      showCityDropdown && { borderColor: COLORS.primary },
                      !formState.inputValues.businessProvince && { opacity: 0.7 }
                    ]}
                    onPress={() => {
                      if (!formState.inputValues.businessProvince) return;
                      setShowCityDropdown(v => !v);
                      setShowProvinceDropdown(false);
                    }}
                  >
                    <Image
                      source={icons.location}
                      style={[styles.icon, showProvinceDropdown ? { tintColor: COLORS.black } : null]}
                    />
                  <Text style={[styles.dropdownText, { color: formState.inputValues.businessCity ? COLORS.black : COLORS.grayTie }]}>
                    {formState.inputValues.businessCity || 'Select city'}
                  </Text>
                    <Text style={styles.dropdownCaret}>{showCityDropdown ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {showCityDropdown && formState.inputValues.businessProvince && (
                    <View style={[styles.dropdownList, styles.dropdownListCity]}>
                      {(provinces[formState.inputValues.businessProvince] || []).map(city => (
                        <TouchableOpacity
                          key={city}
                          style={styles.dropdownItem}
                          onPress={() => {
                            inputChangedHandler('businessCity', city);
                            setShowCityDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{city}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <Input
                    id="businessStreet"
                    icon={icons.location}
                    placeholder="Business address"
                    value={formState.inputValues.businessStreet}
                    onInputChanged={inputChangedHandler}
                    placeholderTextColor={COLORS.grayTie}
                  />
                </>
              )}
              {currentStep === 2 && (
                <>
                  <Text style={styles.subtext}>Upload Front and Back of your ID</Text>
                  <Input
                    id="cnic"
                    icon={icons.document}
                    placeholder="CNIC Number (33102-8116332-5)"
                    value={formState.inputValues.cnic}
                    onInputChanged={inputChangedHandler}
                    keyboardType="number-pad"
                    placeholderTextColor={COLORS.grayTie}
                  />
                  <View style={styles.uploadRow}>
                    <View style={styles.idBox}>
                      <CnicImagePickerBox
                        uri={frontImage || ''}
                        onPick={() => pickImage('front')}
                        onDelete={() => deleteImage('front')}
                        label="Cnic Front "
                      />
                    </View>

                    <View style={styles.idBox}>
                      <CnicImagePickerBox
                        uri={backImage || ''}
                        onPick={() => pickImage('back')}
                        onDelete={() => deleteImage('back')}
                        label="Cnic Back"
                      />
                    </View>
                  </View>

                </>
              )}
              {currentStep === 3 && (
                <>
                  <Text style={styles.subtext}>Enter Verification Code</Text>
                  <Text style={styles.infoText}>Please check your email. We have sent you a verification code on your email.</Text>
                  <View style={styles.codeRow}>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <TextInput
                        key={i}
                        ref={codeInputRefs[i]}
                        style={styles.codeInput}
                        keyboardType="number-pad"
                        maxLength={1}
                        onChangeText={(v) => {
                          const char = v.slice(-1); // take last digit only
                          const next = [...otpValues];
                          next[i] = char;
                          setOtpValues(next);
                          if (char && i < 5) {
                            codeInputRefs[i + 1].current?.focus();
                          }
                          if (!char && i > 0) {
                            codeInputRefs[i - 1].current?.focus();
                          }
                        }}
                        value={otpValues[i]}
                        onKeyPress={({ nativeEvent }) => {
                          if (nativeEvent.key === 'Backspace') {
                            const next = [...otpValues];
                            if (next[i]) {
                              next[i] = '';
                              setOtpValues(next);
                              if (i > 0) {
                                codeInputRefs[i - 1].current?.focus();
                              }
                            } else if (i > 0) {
                              next[i - 1] = '';
                              setOtpValues(next);
                              codeInputRefs[i - 1].current?.focus();
                            }
                          }
                        }}
                      />
                    ))}
                  </View>
                  <ButtonFilled
                    title={isVerifying ? "Verifying..." : "Verify"}
                    onPress={handleVerifyOtp}
                    disabled={isVerifying}
                    style={{ marginTop: 12, paddingHorizontal: 60 }}
                    textColor={COLORS.white}
                  />
                </>
              )}
              {currentStep === 4 && (
                <>
                  <Text style={styles.subtext}>Which makes do you deal in?</Text>
                  <Text style={styles.infoText}>Search and select every make you stock.</Text>
                  <View style={styles.searchBox}>
                    <TextInput
                      placeholder="Search makes"
                      value={makeSearch}
                      onChangeText={setMakeSearch}
                      style={styles.searchInput}
                      placeholderTextColor={COLORS.grayTie}
                    />
                  </View>
                  <View style={styles.chipContainer}>
                    {isLoadingMakes ? (
                      <Text style={styles.helperText}>Loading makes...</Text>
                    ) : (
                      (availableMakes.filter(m => m.toLowerCase().includes(makeSearch.toLowerCase())).slice(0, 200)).map(make => (
                        <TouchableOpacity
                          key={make}
                          style={[
                            styles.chip,
                            selectedMakes.includes(make) && styles.chipActive
                          ]}
                          onPress={() => toggleMake(make)}
                        >
                          <Text style={[
                            styles.chipText,
                            selectedMakes.includes(make) && styles.chipTextActive
                          ]}>
                            {make}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                    {!isLoadingMakes && availableMakes.length === 0 && (
                      <View style={{ width: '100%', marginTop: 8 }}>
                        <Text style={styles.helperText}>No makes found. Check your connection.</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={fetchMakes}>
                          <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  {selectedMakes.length > 0 && (
                    <View style={styles.selectionSummary}>
                      <Text style={styles.summaryLabel}>Selected ({selectedMakes.length}):</Text>
                      <View style={styles.selectionRow}>
                        {selectedMakes.map(make => (
                          <TouchableOpacity
                            key={make}
                            style={styles.pill}
                            onPress={() => toggleMake(make)}
                          >
                            <Text style={styles.pillText}>{make}</Text>
                            <Text style={styles.pillRemove}>✕</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}
              {currentStep === 5 && (
                <>
                  <Text style={styles.subtext}>Which categories do you deal in?</Text>
                  <Text style={styles.infoText}>Pick all applicable part categories.</Text>
                  <View style={styles.searchBox}>
                    <TextInput
                      placeholder="Search categories"
                      value={categorySearch}
                      onChangeText={setCategorySearch}
                      style={styles.searchInput}
                      placeholderTextColor={COLORS.grayTie}
                    />
                  </View>
                  <View style={styles.chipContainer}>
                    {categoryOptions
                      .filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                      .map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.chip,
                            selectedCategories.includes(cat.id) && styles.chipActive
                          ]}
                          onPress={() => toggleCategory(cat.id)}
                        >
                          <Text style={[
                            styles.chipText,
                            selectedCategories.includes(cat.id) && styles.chipTextActive
                          ]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                  {selectedCategories.length > 0 && (
                    <View style={styles.selectionSummary}>
                      <Text style={styles.summaryLabel}>Selected ({selectedCategories.length}):</Text>
                      <View style={styles.selectionRow}>
                        {selectedCategories.map(cat => (
                          <TouchableOpacity
                            key={cat}
                            style={styles.pill}
                            onPress={() => toggleCategory(cat)}
                          >
                            <Text style={styles.pillText}>{categoryOptions.find(c => c.id === cat)?.name || cat}</Text>
                            <Text style={styles.pillRemove}>✕</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* Next / Verify Button */}

            </View>
          ) : (
            // Step 5: Confirmation
            <View style={styles.confirmationContainer}>
              <View style={styles.confirmationMessage}>
                <Svg width={100} height={100} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M10.5 15.25C10.307 15.2353 10.1276 15.1455 9.99998 15L6.99998 12C6.93314 11.8601 6.91133 11.7029 6.93756 11.55C6.96379 11.3971 7.03676 11.2562 7.14643 11.1465C7.2561 11.0368 7.39707 10.9638 7.54993 10.9376C7.70279 10.9114 7.86003 10.9332 7.99998 11L10.47 13.47L19 5.00004C19.1399 4.9332 19.2972 4.91139 19.45 4.93762C19.6029 4.96385 19.7439 5.03682 19.8535 5.14649C19.9632 5.25616 20.0362 5.39713 20.0624 5.54999C20.0886 5.70286 20.0668 5.86009 20 6.00004L11 15C10.8724 15.1455 10.6929 15.2353 10.5 15.25Z"
                    fill={COLORS.primary}
                  />
                  <Path
                    d="M12 21C10.3915 20.9974 8.813 20.5638 7.42891 19.7443C6.04481 18.9247 4.90566 17.7492 4.12999 16.34C3.54037 15.29 3.17596 14.1287 3.05999 12.93C2.87697 11.1721 3.2156 9.39921 4.03363 7.83249C4.85167 6.26578 6.1129 4.9746 7.65999 4.12003C8.71001 3.53041 9.87134 3.166 11.07 3.05003C12.2641 2.92157 13.4719 3.03725 14.62 3.39003C14.7224 3.4105 14.8195 3.45215 14.9049 3.51232C14.9903 3.57248 15.0622 3.64983 15.116 3.73941C15.1698 3.82898 15.2043 3.92881 15.2173 4.03249C15.2302 4.13616 15.2214 4.2414 15.1913 4.34146C15.1612 4.44152 15.1105 4.53419 15.0425 4.61352C14.9745 4.69286 14.8907 4.75712 14.7965 4.80217C14.7022 4.84723 14.5995 4.87209 14.4951 4.87516C14.3907 4.87824 14.2867 4.85946 14.19 4.82003C13.2186 4.52795 12.1987 4.43275 11.19 4.54003C10.193 4.64212 9.22694 4.94485 8.34999 5.43003C7.50512 5.89613 6.75813 6.52088 6.14999 7.27003C5.52385 8.03319 5.05628 8.91361 4.77467 9.85974C4.49307 10.8059 4.40308 11.7987 4.50999 12.78C4.61208 13.777 4.91482 14.7431 5.39999 15.62C5.86609 16.4649 6.49084 17.2119 7.23999 17.82C8.00315 18.4462 8.88357 18.9137 9.8297 19.1953C10.7758 19.4769 11.7686 19.5669 12.75 19.46C13.747 19.3579 14.713 19.0552 15.59 18.57C16.4349 18.1039 17.1818 17.4792 17.79 16.73C18.4161 15.9669 18.8837 15.0864 19.1653 14.1403C19.4469 13.1942 19.5369 12.2014 19.43 11.22C19.4201 11.1169 19.4307 11.0129 19.461 10.9139C19.4914 10.8149 19.5409 10.7228 19.6069 10.643C19.6728 10.5631 19.7538 10.497 19.8453 10.4485C19.9368 10.3999 20.0369 10.3699 20.14 10.36C20.2431 10.3502 20.3471 10.3607 20.4461 10.3911C20.5451 10.4214 20.6372 10.471 20.717 10.5369C20.7969 10.6028 20.863 10.6839 20.9115 10.7753C20.9601 10.8668 20.9901 10.9669 21 11.07C21.1821 12.829 20.842 14.6026 20.0221 16.1695C19.2022 17.7363 17.9389 19.0269 16.39 19.88C15.3288 20.4938 14.1495 20.8755 12.93 21C12.62 21 12.3 21 12 21Z"
                    fill={COLORS.primary}
                  />
                </Svg>
                <Text style={styles.confirmTitle}>Congratulations</Text>
                <Text style={styles.confirmText}>Registration successful.</Text>
                <ButtonFilled
                  title="Go To Dashboard"
                  onPress={submitHandler}
                  style={styles.confirmButton}
                  textColor={COLORS.white}
                />
              </View>

            </View>
          )}

        </ScrollView>
      </View>
      {currentStep < steps.length - 1 && currentStep !== 3 && (
        <View style={[styles.footerBar, { backgroundColor: colors.background }]}>
          {currentStep > 0 && currentStep < steps.length - 1 && currentStep !== 4 && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { marginRight: 8 }]}
              onPress={goBackStep}
            >
              <Text style={[styles.secondaryBtnText, { color: dark ? COLORS.white : COLORS.primary }]}>
                Back
              </Text>
            </TouchableOpacity>
          )}
          <ButtonFilled
            title={
              currentStep === 2
                ? (isRegistering ? "Registering..." : "Register")
                : currentStep === 5
                  ? "Save & Finish"
                  : "Next Step"
            }
            onPress={goNext}
            style={[styles.button, { flex: 1, marginTop: 0 }]}
            disabled={isRegistering}
            textColor={COLORS.white}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  logo: { width: 120, height: 60, alignSelf: "center", marginVertical: 30 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 40,
  },
  stepItem: { alignItems: "center" },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleText: { color: COLORS.primary, fontFamily: 'bold' },
  stepLabel: { fontSize: 11, color: "#555", marginTop: 4, fontFamily: 'regular' },
  stepLine: {
    width: 8,
    height: 2,
    backgroundColor: COLORS.primary,
    marginHorizontal: 4,
  },
  card: {
    width: "95%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  subtext: { fontFamily: 'bold', textAlign: "center", color: "#000", fontSize: 20, marginBottom: 10 },
  infoText: { textAlign: "center", color: "#000", fontSize: 14, marginBottom: 20, fontFamily: 'medium' },
  uploadRow: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: 'center',
    width: '100%',
    alignSelf: 'stretch',
    gap: 12,
    marginTop: 24
  },
  dropdownInput: {
    position: 'relative',
    width: '100%',
    borderWidth: 1.4,
    borderColor: COLORS.greyscale300,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayscale200,
  },
  dropdownText: {
    fontFamily: 'regular',
    fontSize: 14,
    flex: 1
  },
  sectionLabel: {
    fontFamily: 'semiBold',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 4,
  },
  dropdownCaret: {
    fontSize: 12,
    color: COLORS.greyscale600
  },
  dropdownListBusinessType: {
    top: "35%",
  },
  dropdownListProvince: {
    top: "67%",
  },
  dropdownListCity: {
    top: "85%",
  },
  dropdownList: {
    position: 'absolute',
    width: '100%',
    borderRadius: 10,
    backgroundColor: COLORS.greyscale500,
    marginBottom: 12,
    zIndex: 10,
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownItemText: {
    fontFamily: 'regular',
    color: COLORS.black
  },
  uploadBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 6,
    padding: 24,
    alignItems: "center",
    marginHorizontal: 4,
  },
  idBox: {
    width: '100%'
  },
  codeRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 12,
    gap: 10
  },
  codeInput: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    textAlign: "center",
    fontSize: 18,
  },
  button: { marginTop: 12, borderRadius: 30, width: SIZES.width - 80 },
  confirmationContainer: {
    width: "95%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  confirmationMessage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmTitle: {
    fontSize: 22,
    fontFamily: "bold",
    marginTop: 12,
    textAlign: "center",
  },
  confirmText: {
    fontSize: 16,
    fontFamily: "regular",
    textAlign: "center",
    marginVertical: 8,
    color: "#666",
  },
  confirmButton: {
    marginTop: 12,
    width: "60%",
    alignSelf: "center",
  },
  secondaryBtn: {
    minWidth: '30%',
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    borderColor: COLORS.primary,
    borderWidth: 1.4,
    backgroundColor: COLORS.tansparentPrimary,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: "semiBold",
  },
  confirmImage: {
    width: 80,
    height: 80,
    marginLeft: 12,
  },
  searchBox: {
    width: '100%',
  },
  searchInput: {
    borderWidth: 1.4,
    borderColor: COLORS.grayscale200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: COLORS.greyscale500,
    fontFamily: 'regular',
    color: COLORS.black,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
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
  helperText: {
    fontFamily: 'regular',
    color: COLORS.greyscale900,
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  retryText: {
    color: COLORS.white,
    fontFamily: 'semiBold',
  },
  selectionSummary: {
    marginTop: 12,
    width: '100%',
  },
  summaryLabel: {
    fontFamily: 'semiBold',
    color: COLORS.black,
    marginBottom: 8,
  },
  selectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.black,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 6,
  },
  pillText: {
    fontFamily: 'regular',
    color: COLORS.white,
  },
  pillRemove: {
    fontFamily: 'bold',
    color: COLORS.white,
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderColor: COLORS.greyscale500
  },
  icon: {
        marginRight: 10,
        height: 20,
        width: 20,
        tintColor: '#BCBCBC',
    },
});

export default SignupSeller;
