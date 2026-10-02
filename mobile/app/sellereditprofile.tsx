// sellereditprofile.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { COLORS, SIZES } from '../constants';
import Header from '../components/Header';
import ButtonFilled from '../components/ButtonFilled';
import { useNavigation } from 'expo-router';
import Input from '@/components/Input';
import RBSheet from 'react-native-raw-bottom-sheet';
import Button from '@/components/Button';
import { useAuth } from './context/AuthContext';
import { fetchMyStore, updateMyStore } from '@/utils/api/store';
import { fetchUserRaw, updateUserProfile as updateUserProfileApi } from '@/utils/api/user';
import { fetchCarMakes } from '@/utils/api/carData';
import { fetchCategories, Category as ApiCategory } from '@/utils/api/products';

interface SellerForm {
    storeName: string;
    ownerName: string;
    phone: string;
    email: string;
    businessName: string;
    businessType: string;
    licenseNumber: string;
    cnic: string;
    // kept optional so existing demoSeller shape still fits state, but not editable
    businessCity?: string;
    businessAddress?: string;
    storeImage?: any;
}

const SellerEditProfile = () => {
    const { dark } = useTheme();
    const navigation = useNavigation();
    const refRBSheet = useRef<any>(null);
    const { user, token, updateUserProfile: setAuthUser } = useAuth();
    const isStoreManager = (user?.role || '').toLowerCase?.() === 'storemanager';
    const [form, setForm] = useState<SellerForm>({
        storeName: '',
        ownerName: '',
        phone: '',
        email: '',
        businessName: '',
        businessType: '',
        licenseNumber: '',
        cnic: '',
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [availableMakes, setAvailableMakes] = useState<string[]>([]);
    const [selectedMakes, setSelectedMakes] = useState<string[]>([]);
    const [makesSearch, setMakesSearch] = useState('');
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [categoriesSearch, setCategoriesSearch] = useState('');

    const handleInputChange = (field: keyof SellerForm, value: string) => {
        if (field === 'phone') {
            const digits = value.replace(/\D/g, '').slice(0, 11);
            setForm({ ...form, [field]: digits });
            return;
        }
        setForm({ ...form, [field]: value });
    };

    useEffect(() => {
        const loadData = async () => {
            if (!token || !user?.id) return;
            setLoading(true);
            try {
                const [storeRes, userRes, makesRes, catsRes] = await Promise.all([
                    fetchMyStore(token),
                    fetchUserRaw(user.id, token),
                    fetchCarMakes(),
                    fetchCategories(),
                ]);
                const store = storeRes.store || {};
                const u = (userRes as any)?.user || userRes || {};
                const baseUser = isStoreManager ? user : u;
                setForm({
                    storeName: store.storeName || u.businessName || '',
                    ownerName: baseUser?.name || '',
                    phone: baseUser?.phoneNumber || '',
                    email: baseUser?.email || '',
                    businessName: u.businessName || '',
                    businessType: u.businessType || '',
                    licenseNumber: u.licenseNumber || '',
                    cnic: u.cnic || '',
                });
                const names = Array.isArray((makesRes as any)?.makes) ? ((makesRes as any).makes as unknown[]) : [];
                const uniqueMakes = Array.from(new Set(names.map(n => String(n)))).sort((a, b) => a.localeCompare(b));
                setAvailableMakes(uniqueMakes);
                setSelectedMakes((user?.sellerMakes || u?.sellerMakes || []) as string[]);
                setSelectedCategories((user?.sellerCategories || u?.sellerCategories || []) as string[]);
                const categories = Array.isArray(catsRes)
                  ? (catsRes as ApiCategory[]).map(c => c.name).filter(Boolean)
                  : [];
                setAvailableCategories(categories);
            } catch {
                // ignore load errors for now
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [token, user?.id]);

    const handleSave = async () => {
        if (!token || !user?.id) return;
        setSaving(true);
        try {
            const [storeRes, updatedUser] = await Promise.all([
                updateMyStore({ storeName: form.storeName }, token),
                updateUserProfileApi(user.id, {
                    name: form.ownerName,
                    phoneNumber: form.phone,
                    sellerMakes: selectedMakes,
                    sellerCategories: selectedCategories,
                }, token),
            ]);
            setAuthUser({
                ...user,
                name: updatedUser.name,
                phoneNumber: updatedUser.phoneNumber,
                sellerMakes: updatedUser.sellerMakes,
                sellerCategories: updatedUser.sellerCategories,
            });
            setForm(prev => ({
                ...prev,
                storeName: storeRes.store?.storeName || form.storeName,
                ownerName: updatedUser.name || form.ownerName,
                phone: updatedUser.phoneNumber || form.phone,
            }));
            refRBSheet.current?.close();
        } catch (err: any) {
            alert(err?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
            <View style={[styles.container, { backgroundColor: dark ? COLORS.dark1 : COLORS.white }]}>
                <Header title="Edit Seller Profile" />
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[styles.helpText, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
                        To edit other options, please contact support.
                    </Text>
                    {isStoreManager && (
                      <Text style={[styles.helpText, { color: dark ? COLORS.grayscale400 : COLORS.gray }]}>
                        Signed in as Store Manager ({user?.email || 'N/A'})
                      </Text>
                    )}

                    {/* Profile Fields */}
                    {[
                        { label: 'Store Name', key: 'storeName', editable: true },
                        { label: 'Owner Name', key: 'ownerName', editable: true },
                        { label: 'Phone Number', key: 'phone', editable: true },
                        { label: 'Email', key: 'email', editable: false },
                        { label: 'Business Name', key: 'businessName', editable: false },
                        { label: 'Business Type', key: 'businessType', editable: false },
                        { label: 'License Number', key: 'licenseNumber', editable: false },
                        { label: 'CNIC', key: 'cnic', editable: false },
                    ].map(({ label, key, editable }) => (
                        <View key={label} style={styles.fieldContainer}>
                            <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.black }]}>{label}</Text>
                            <Input
                                id={key}
                                value={form[key as keyof SellerForm]}
                                onInputChanged={(id, text) => handleInputChange(id as keyof SellerForm, text)}
                                placeholder={label}
                                placeholderTextColor={dark ? COLORS.grayTie : COLORS.gray}
                                editable={editable}
                                keyboardType={key === 'phone' ? 'phone-pad' : undefined}
                                maxLength={key === 'phone' ? 11 : undefined}
                            />
                        </View>
                    ))}

                    {/* What you sell */}
                    <View style={styles.sectionCard}>
                <Text style={[styles.sectionTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>What you sell</Text>
                <Text style={[styles.sectionSubtitle, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
                    Update makes and categories you deal in.
                </Text>

                        <Text style={[styles.sectionLabel, { color: dark ? COLORS.white : COLORS.black }]}>Makes</Text>
                        <Input
                            id="makeSearch"
                            value={makesSearch}
                            onInputChanged={(_, val) => setMakesSearch(val)}
                            placeholder="Search makes"
                            placeholderTextColor={dark ? COLORS.grayTie : COLORS.gray}
                        />
                        <View style={styles.chipContainer}>
                            {availableMakes
                                .filter(m => m.toLowerCase().includes(makesSearch.toLowerCase()))
                                .slice(0, 60)
                                .map(make => (
                                    <TouchableOpacity
                                        key={make}
                                        style={[styles.chip, selectedMakes.includes(make) && styles.chipActive]}
                                        onPress={() => {
                                            setSelectedMakes(prev => prev.includes(make) ? prev.filter(m => m !== make) : [...prev, make]);
                                        }}
                                    >
                                        <Text style={[styles.chipText, selectedMakes.includes(make) && styles.chipTextActive]}>{make}</Text>
                                    </TouchableOpacity>
                                ))}
                        </View>
                        {selectedMakes.length > 0 && (
                            <View style={styles.selectionRow}>
                                {selectedMakes.map(make => (
                                    <TouchableOpacity key={make} style={styles.pill} onPress={() => setSelectedMakes(prev => prev.filter(m => m !== make))}>
                                        <Text style={styles.pillText}>{make}</Text>
                                        <Text style={styles.pillRemove}>✕</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <Text style={[styles.sectionLabel, { color: dark ? COLORS.white : COLORS.black, marginTop: 12 }]}>Categories</Text>
                        <Input
                            id="categorySearch"
                            value={categoriesSearch}
                            onInputChanged={(_, val) => setCategoriesSearch(val)}
                            placeholder="Search categories"
                            placeholderTextColor={dark ? COLORS.grayTie : COLORS.gray}
                        />
                        <View style={styles.chipContainer}>
                            {availableCategories
                                .filter(c => c.toLowerCase().includes(categoriesSearch.toLowerCase()))
                                .map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.chip, selectedCategories.includes(cat) && styles.chipActive]}
                                        onPress={() => {
                                            setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
                                        }}
                                    >
                                        <Text style={[styles.chipText, selectedCategories.includes(cat) && styles.chipTextActive]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                        </View>
                        {selectedCategories.length > 0 && (
                            <View style={styles.selectionRow}>
                                {selectedCategories.map(cat => (
                                    <TouchableOpacity key={cat} style={styles.pill} onPress={() => setSelectedCategories(prev => prev.filter(c => c !== cat))}>
                                        <Text style={styles.pillText}>{cat}</Text>
                                        <Text style={styles.pillRemove}>✕</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>


                </ScrollView>
                <View style={styles.bottomContainer}>
                    <ButtonFilled
                        title={saving ? 'Updating...' : 'Update Profile'}
                        disabled={saving}
                        style={styles.updateButton}
                        onPress={() => refRBSheet.current.open()}
                    />
                </View>
            </View>
            <RBSheet
                ref={refRBSheet}
                closeOnPressMask={true}
                height={250}
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
                        height: 250,
                        backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                        alignItems: "center",
                        width: "100%"
                    }
                }}>
                <Text style={[styles.bottomSubtitle, {
                    color: dark ? COLORS.black : COLORS.black
                }]}>Update Profile</Text>
                <View style={[styles.separateLine, {
                    backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
                }]} />

                <View style={styles.selectedCancelContainer}>
                    <Text style={[styles.cancelTitle, {
                        color: dark ? COLORS.secondaryWhite : COLORS.greyscale900
                    }]}>Are you sure you want to save the changes?</Text>

                </View>

                <View style={styles.bottomContainer2}>
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
                        title={saving ? "Saving..." : "Yes, Save"}
                        style={styles.removeButton}
                        disabled={saving}
                        onPress={() => {
                            handleSave();
                        }}
                    />
                </View>
            </RBSheet>
        </SafeAreaView>
    );
};

export default SellerEditProfile;

const styles = StyleSheet.create({
    area: { flex: 1 },
    container: { flex: 1, padding: 16 },
    fieldContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontFamily: 'semiBold',
        marginBottom: 6,
    },
    helpText: {
        fontSize: 12,
        fontFamily: 'regular',
        marginBottom: 16,
    },
    sectionCard: {
        marginVertical: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.grayscale200,
    },
    sectionTitle: {
        fontFamily: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontFamily: 'regular',
        fontSize: 12,
        marginBottom: 10,
    },
    sectionLabel: {
        fontFamily: 'semiBold',
        fontSize: 14,
        marginTop: 4,
        marginBottom: 6,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 6,
    },
    chip: {
        borderWidth: 1,
        borderColor: COLORS.grayscale200,
        borderRadius: 14,
        paddingHorizontal: 10,
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
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.tansparentPrimary,
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
    bottomContainer: {
        paddingTop: 24,

    },
    updateButton: {
        width: '100%',
        borderRadius: 30,
        backgroundColor: COLORS.primary,
    },
    bottomSubtitle: {
        fontSize: 22,
        fontFamily: "bold",

        textAlign: "center",
        marginTop: 12

    },
    separateLine: {
        width: "100%",
        height: .7,
        backgroundColor: COLORS.greyScale800,
        marginVertical: 12
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
    removeButton: {
        width: (SIZES.width - 32) / 2 - 8,
        backgroundColor: COLORS.primary,
        borderRadius: 32
    },
    bottomContainer2: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginVertical: 12,
        paddingHorizontal: 16,
        width: "100%"
    },
});
