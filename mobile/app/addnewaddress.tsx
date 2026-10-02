import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Header from '@/components/Header';
import Input from '@/components/Input';
import ButtonFilled from '@/components/ButtonFilled';
import { COLORS, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from './context/AuthContext';
import { fetchAddresses, upsertAddress } from '@/utils/api/addresses';
import { updateMyStore } from '@/utils/api/store';

type Nav = NavigationProp<any>;

const AddNewAddress = () => {
  const navigation = useNavigation<Nav>();
  const params = useLocalSearchParams<{ data?: string }>();
  const parsedAddress = useMemo(() => {
    try {
      return params.data ? JSON.parse(params.data as string) : null;
    } catch {
      return null;
    }
  }, [params.data]);
  const isEditing = !!parsedAddress;

  const [fullAddress, setFullAddress] = useState(parsedAddress?.fullAddress || '');
  const [city, setCity] = useState(parsedAddress?.city || '');
  const [province, setProvince] = useState(parsedAddress?.province || '');
  const [postalCode, setPostalCode] = useState(parsedAddress?.postalCode || '');
  const [saving, setSaving] = useState(false);
  const [showProvinceList, setShowProvinceList] = useState(false);
  const [showCityList, setShowCityList] = useState(false);
  const [setDefault, setSetDefault] = useState(parsedAddress?.isDefault || !parsedAddress);
  const [existingCount, setExistingCount] = useState<number | null>(null);

  const { colors, dark } = useTheme();
  const { token, user } = useAuth();
  const isMounted = React.useRef(false);

  React.useEffect(() => {
    if (isMounted.current) return;
    isMounted.current = true;
    if (!token) {
      Alert.alert('Login required', 'Please sign in to continue.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('login' as never),
        },
      ]);
    }
  }, [token, navigation]);

  useEffect(() => {
    if (parsedAddress) {
      setFullAddress(parsedAddress.fullAddress || parsedAddress.street || '');
      setCity(parsedAddress.city || '');
      setProvince(parsedAddress.province || '');
      setPostalCode(parsedAddress.postalCode || '');
    }
  }, [parsedAddress]);

  useEffect(() => {
    if (!token || parsedAddress || user?.role === 'Seller') return;
    const loadExisting = async () => {
      try {
        const res = await fetchAddresses(token);
        const count = res.addresses?.length || 0;
        setExistingCount(count);
        if (count === 0) {
          setSetDefault(true);
        }
      } catch {
        setExistingCount(null);
      }
    };
    loadExisting();
  }, [parsedAddress, token, user?.role]);

  const provinces: Record<string, string[]> = {
    Punjab: ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot'],
    Sindh: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana'],
    'Khyber Pakhtunkhwa': ['Peshawar', 'Abbottabad', 'Mardan', 'Swat'],
    Balochistan: ['Quetta', 'Gwadar', 'Sibi', 'Turbat'],
    'Islamabad Capital Territory': ['Islamabad'],
    'Gilgit-Baltistan': ['Gilgit', 'Skardu', 'Hunza'],
    'Azad Kashmir': ['Muzaffarabad', 'Mirpur', 'Kotli'],
  };

  const handleSave = async () => {
    const trimmedAddress = fullAddress.trim();
    const trimmedCity = city.trim();
    const trimmedProvince = province.trim();
    const trimmedPostal = postalCode.trim();

    if (!trimmedAddress || !trimmedCity || !trimmedProvince || !trimmedPostal) {
      Alert.alert('Missing info', 'Please fill Address, Province, City, and Postal Code.');
      return;
    }
    if (!token) {
      Alert.alert('Login required', 'Please sign in to save your store address.');
      navigation.navigate('login' as never);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullAddress: trimmedAddress,
        street: trimmedAddress,
        city: trimmedCity,
        province: trimmedProvince,
        postalCode: trimmedPostal,
        isDefault: (user?.role !== 'Seller' && existingCount === 0) ? true : setDefault,
      };

      if (user?.role === 'Seller') {
        await updateMyStore({ addresses: [payload] }, token);
      } else {
        const idx = parsedAddress ? parsedAddress.idx ?? null : null;
        await upsertAddress(idx, payload, token);
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Failed', err?.message || 'Could not save address.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          title={isEditing ? 'Edit Address' : 'Add Address'}
          onBackPress={() => {
            if ((navigation as any)?.canGoBack?.()) {
              navigation.goBack();
            } else {
              navigation.navigate('index' as never);
            }
          }}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContainer}
          >
            <View
              style={[
                styles.defaultRow,
                { borderColor: dark ? COLORS.grayscale700 : '#e0e0e0', backgroundColor: dark ? COLORS.dark2 : '#f2f2f2' },
              ]}
            >
              <Text style={[styles.label, { marginBottom: 0, color: dark ? COLORS.white : COLORS.grayscale700 }]}>
                Set as default
              </Text>
              <Switch
                value={(!parsedAddress && user?.role !== 'Seller' && existingCount === 0) ? true : setDefault}
                onValueChange={(val) => {
                  if (!parsedAddress && user?.role !== 'Seller' && existingCount === 0) return;
                  setSetDefault(val);
                }}
                disabled={!parsedAddress && user?.role !== 'Seller' && existingCount === 0}
                trackColor={{ false: '#bfbfc0', true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                Address
              </Text>
              <Input
                id="address"
                value={fullAddress}
                onInputChanged={(_, value) => setFullAddress(value)}
                placeholder="Enter address"
                placeholderTextColor={dark ? COLORS.grayTie : COLORS.grayscale700}
                inputContainerStyle={[
                  styles.inputBg,
                  { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: 'transparent' },
                ]}
                inputStyle={{ color: dark ? COLORS.white : COLORS.greyscale900 }}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                Province
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectBox,
                  { borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200, backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100 },
                ]}
                onPress={() => {
                  setShowProvinceList((prev) => !prev);
                  setShowCityList(false);
                }}
              >
                <Text style={[styles.selectText, { color: province ? colors.text : (dark ? COLORS.grayTie : COLORS.grayscale700) }]}>
                  {province || 'Select province'}
                </Text>
              </TouchableOpacity>
              {showProvinceList && (
                <View style={[styles.dropdown, { backgroundColor: colors.background, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}>
                  {Object.keys(provinces).map((prov) => (
                    <Text
                      key={prov}
                      style={[styles.dropdownItem, { color: colors.text }]}
                      onPress={() => {
                        setProvince(prov);
                        setCity('');
                        setShowProvinceList(false);
                        setShowCityList(true);
                      }}
                    >
                      {prov}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                City
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectBox,
                  { borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200, backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100 },
                ]}
                onPress={() => {
                  if (!province) {
                    Alert.alert('Select province first');
                    return;
                  }
                  setShowCityList((prev) => !prev);
                }}
              >
                <Text style={[styles.selectText, { color: city ? colors.text : (dark ? COLORS.grayTie : COLORS.grayscale700) }]}>
                  {city || 'Select city'}
                </Text>
              </TouchableOpacity>
              {showCityList && (
                <View style={[styles.dropdown, { backgroundColor: colors.background, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale700 }]}>
                  {(provinces[province] || []).map((c) => (
                    <Text
                      key={c}
                      style={[styles.dropdownItem, { color: colors.text }]}
                      onPress={() => {
                        setCity(c);
                        setShowCityList(false);
                      }}
                    >
                      {c}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                Postal Code
              </Text>
              <Input
                id="postalCode"
                value={postalCode}
                keyboardType="numeric"
                editable={!isEditing}
                onInputChanged={(_, value) => setPostalCode(value)}
                placeholder="Postal code"
                placeholderTextColor={dark ? COLORS.grayTie : COLORS.grayscale700}
                inputContainerStyle={[
                  styles.inputBg,
                  { backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale100, borderColor: 'transparent' },
                ]}
                inputStyle={{ color: dark ? COLORS.white : COLORS.greyscale900 }}
              />
            </View>

            <ButtonFilled
              title={saving ? 'Saving...' : isEditing ? 'Update Address' : 'Save Address'}
              disabled={saving}
              onPress={handleSave}
              style={styles.submitBtn}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  inputBg: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  formContainer: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  submitBtn: {
    width: SIZES.width - 32,
    alignSelf: 'center',
    marginTop: 8,
  },
  selectBox: {
    width: '100%',
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  selectText: {
    fontFamily: 'regular',
    fontSize: 14,
  },
  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  dropdownItem: {
    fontFamily: 'regular',
    fontSize: 14,
    paddingVertical: 4,
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    justifyContent: 'space-between',
    marginBottom: 16
  },
  toggle: {
    width: 56,
    height: 30,
    borderRadius: 15,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.white,
  },
  toggleOn: {
    marginLeft: 'auto',
  },
  toggleOff: {
    marginLeft: 0,
  },
});

export default AddNewAddress;
