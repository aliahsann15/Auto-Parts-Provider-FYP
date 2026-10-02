import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useNavigation } from 'expo-router';
import { NavigationProp, usePreventRemove } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, SIZES, icons } from '@/constants';
import { useAuth } from './context/AuthContext';
import Header from '@/components/Header';
import { fetchPromoCodes, createPromoCode, updatePromoCode, deletePromoCode, PromoCode } from '@/utils/api/promocodes';
import { fetchMyProducts, fetchCategories, Product } from '@/utils/api/products';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as Clipboard from 'expo-clipboard';

type Scope = 'all' | 'product' | 'category';
type Type = 'percentage' | 'amount';
type DurationType = 'days' | 'custom' | 'none';

const emptyForm = {
  code: '',
  type: 'percentage' as Type,
  value: '',
  scope: 'all' as Scope,
  products: [] as string[],
  categories: [] as string[],
  active: true,
  durationType: 'none' as DurationType,
  durationDays: '',
  startDate: '',
  endDate: '',
};

const PromoCodesScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [initialForm, setInitialForm] = useState({ ...emptyForm });
  const [datePickerVisible, setDatePickerVisible] = useState<{ field: 'start' | 'end' | null }>({ field: null });
  const [nowTs, setNowTs] = useState(Date.now());
  const isStartActive = datePickerVisible.field === 'start';
  const isEndActive = datePickerVisible.field === 'end';

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      const [promoRes, prodRes] = await Promise.all([
        fetchPromoCodes(token!),
        fetchMyProducts(token!, { page: 1, limit: 200 }),
      ]);
      setPromos(promoRes.promos || []);
      const prodList = prodRes.products || [];
      setProducts(prodList);
      const derivedCats = Array.from(
        new Set(
          prodList
            .flatMap((p: any) => (Array.isArray(p.categories) ? p.categories : []))
            .filter((c: any) => typeof c === 'string' && c.trim())
            .map((c: string) => c.trim())
        )
      );
      setCategories(derivedCats);
    } catch (err: any) {
      console.error('Load promos failed', err?.message);
    }
  };

  const isDirty = useCallback(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);

  const normalizedCode = React.useMemo(() => form.code.trim().toUpperCase(), [form.code]);
  const duplicatePromo = React.useMemo(() => {
    if (!normalizedCode) return null;
    return promos.find(p => p.code === normalizedCode && (!editingId || p._id !== editingId)) || null;
  }, [normalizedCode, promos, editingId]);
  const codeErrorMessage = duplicatePromo ? 'This promo code is already registered, please add a new one.' : null;

  const exitForm = () => {
    setForm(initialForm);
    setViewMode('list');
    setEditingId(null);
    setDatePickerVisible({ field: null });
  };

  const handleBack = () => {
    if (viewMode === 'form') {
      if (isDirty()) {
        Alert.alert('Unsaved changes', 'Save your changes?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => exitForm(),
          },
          {
            text: 'Save',
            onPress: () => onSave().then(() => exitForm()),
          },
        ]);
      } else {
        exitForm();
      }
      return;
    }
    navigation.goBack();
  };

  usePreventRemove(viewMode === 'form', (event: any) => {
    if (viewMode !== 'form' || !event || typeof (event as any).preventDefault !== 'function') return;
    event.preventDefault();
    const action = (event as any).data?.action;
    const proceed = () => {
      exitForm();
      if (action) navigation.dispatch(action);
    };
    if (isDirty()) {
      Alert.alert('Unsaved changes', 'Save your changes?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: proceed,
        },
        {
          text: 'Save',
          onPress: () => onSave().then(proceed),
        },
      ]);
    } else {
      proceed();
    }
  });

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: viewMode !== 'form',
    });
  }, [navigation, viewMode]);

  const onSave = async () => {
    if (!token) return;
    if (!form.code.trim()) {
      Alert.alert('Missing', 'Enter promo code');
      return;
    }
    if (duplicatePromo) {
      Alert.alert('Duplicate promo', 'This promo code is already registered, please add a new one.');
      return;
    }
    if (!form.value) {
      Alert.alert('Missing', 'Enter promo value');
      return;
    }
    if (form.scope === 'category' && (!form.categories || form.categories.length === 0)) {
      Alert.alert('Missing', 'Select at least one category.');
      return;
    }
    if (form.scope === 'product' && (!form.products || form.products.length === 0)) {
      Alert.alert('Missing', 'Select at least one product.');
      return;
    }
    if (form.durationType === 'custom') {
      if (!form.startDate || !form.endDate) {
        Alert.alert('Missing', 'Select start and end date/time');
        return;
      }
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end.getTime() - start.getTime() < 60 * 1000) {
        Alert.alert('Invalid duration', 'End time must be at least 1 minute after start time.');
        return;
      }
    }
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      scope: form.scope,
      products: form.scope === 'product' ? form.products : undefined,
      categories: form.scope === 'category' ? form.categories : undefined,
      durationType: form.durationType === 'custom' ? 'custom' : undefined,
      durationDays: undefined,
      startDate: form.durationType === 'custom' ? form.startDate : undefined,
      endDate: form.durationType === 'custom' ? form.endDate : undefined,
      active: form.active,
    };
    try {
      setLoading(true);
      if (editingId) {
        await updatePromoCode(editingId, payload, token);
      } else {
        await createPromoCode(payload, token);
      }
      setForm({ ...emptyForm });
      setInitialForm({ ...emptyForm });
      setEditingId(null);
      setViewMode('list');
      await loadData();
    } catch (err: any) {
      Alert.alert('Save failed', err?.message || 'Could not save promo');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = (id: string) => {
    Alert.alert('Delete promo', 'Are you sure you want to delete this promo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePromoCode(id, token!);
            await loadData();
            if (editingId === id) {
              setForm({ ...emptyForm });
              setInitialForm({ ...emptyForm });
              setEditingId(null);
              setViewMode('list');
            }
          } catch (err: any) {
            Alert.alert('Delete failed', err?.message || 'Could not delete');
          }
        },
      },
    ]);
  };

  const onEdit = (promo: PromoCode) => {
    setEditingId(promo._id);
    const nextForm = {
      code: (promo.code || '').toUpperCase(),
      type: promo.type,
      value: String(promo.value),
      scope: promo.scope as Scope,
      products: promo.products || [],
      categories: promo.categories || [],
      active: promo.active !== false,
      durationType: (promo as any).durationType || 'none',
      durationDays: '',
      startDate: (promo as any).startDate ? String((promo as any).startDate) : '',
      endDate: (promo as any).endDate ? String((promo as any).endDate) : '',
    };
    setForm(nextForm);
    setInitialForm(nextForm);
    setViewMode('form');
  };

  const renderScopeChip = (label: string, value: Scope) => (
    <TouchableOpacity
      key={value}
      style={[
        styles.chip,
        form.scope === value && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
      ]}
      onPress={() => setForm(prev => ({ ...prev, scope: value }))}
    >
      <Text style={{ color: form.scope === value ? COLORS.white : (dark ? COLORS.white : COLORS.greyscale900), fontFamily: 'medium' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getExpiryInfo = (promo: PromoCode, nowMs: number) => {
    const now = new Date(nowMs);
    let end: Date | null = null;
    const durationType = (promo as any).durationType;
    if (durationType === 'none') {
      return { expired: false, text: 'No expiry set' };
    }
    if (durationType === 'custom' && (promo as any).endDate) {
      end = new Date((promo as any).endDate);
    } else if ((promo as any).durationDays) {
      const start = promo.createdAt ? new Date(promo.createdAt) : now;
      end = new Date(start.getTime() + Number((promo as any).durationDays) * 24 * 60 * 60 * 1000);
    }
    if (!end) return { expired: false, text: 'No expiry set' };
    if (end.getTime() <= now.getTime()) return { expired: true, text: 'Expired' };
    const diffMs = end.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    return { expired: false, text: `${hours}h ${minutes}m remaining` };
  };

  const renderTypeChip = (label: string, value: Type) => (
    <TouchableOpacity
      key={value}
      style={[
        styles.chip,
        form.type === value && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
      ]}
      onPress={() => setForm(prev => ({ ...prev, type: value }))}
    >
      <Text style={{ color: form.type === value ? COLORS.white : (dark ? COLORS.white : COLORS.greyscale900), fontFamily: 'medium' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const filteredProducts = products.filter(p =>
    productSearch
      ? p.name.toLowerCase().startsWith(productSearch.toLowerCase()) && !form.products.includes(p._id)
      : false
  );
  const filteredCategories = categories.filter(c =>
    categorySearch
      ? c.toLowerCase().startsWith(categorySearch.toLowerCase()) && !form.categories.includes(c)
      : false
  );
  const showProductDropdown = !!productSearch;
  const showCategoryDropdown = !!categorySearch;

  const productChips = form.scope === 'product' ? (
    <>
      <TextInput
        placeholder="Search products"
        placeholderTextColor={dark ? COLORS.grayscale200 : COLORS.grayscale700}
        value={productSearch}
        onChangeText={setProductSearch}
        style={[styles.input, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, color: dark ? COLORS.white : COLORS.greyscale900, marginTop: 8 }]}
      />
      {showProductDropdown && (
        <View style={styles.dropdown}>
          {filteredProducts.length === 0 ? (
            <Text style={styles.dropdownEmpty}>No Result Found</Text>
          ) : (
            filteredProducts.map(p => (
              <TouchableOpacity
                key={p._id}
                style={styles.dropdownItem}
                onPress={() => {
                  setForm(prev => ({
                    ...prev,
                    products: prev.products.includes(p._id)
                      ? prev.products
                      : [...prev.products, p._id],
                  }));
                  setProductSearch('');
                }}
              >
                <Text style={{ color: dark ? COLORS.white : COLORS.greyscale900, fontFamily: 'medium' }}>{p.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
      <View style={styles.selectedRow}>
        {form.products.map(id => {
          const prod = products.find(p => p._id === id);
          if (!prod) return null;
          return (
            <View key={id} style={styles.selectedChip}>
              <Text style={{ color: COLORS.white, fontFamily: 'medium' }}>{prod.name}</Text>
              <TouchableOpacity style={styles.removeCircle} onPress={() => setForm(prev => ({ ...prev, products: prev.products.filter(pid => pid !== id) }))}>
                <Text style={{ color: COLORS.white, fontFamily: 'bold' }}>×</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </>
  ) : null;

  const categoryChips = form.scope === 'category' ? (
    <>
      <TextInput
        placeholder="Search categories"
        placeholderTextColor={dark ? COLORS.grayscale200 : COLORS.grayscale700}
        value={categorySearch}
        onChangeText={setCategorySearch}
        style={[styles.input, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, color: dark ? COLORS.white : COLORS.greyscale900, marginTop: 8 }]}
      />
      {showCategoryDropdown && (
        <View style={styles.dropdown}>
          {filteredCategories.length === 0 ? (
            <Text style={styles.dropdownEmpty}>No Result Found</Text>
          ) : (
            filteredCategories.map(c => (
              <TouchableOpacity
                key={c}
                style={styles.dropdownItem}
                onPress={() => {
                  setForm(prev => ({
                    ...prev,
                    categories: prev.categories.includes(c)
                      ? prev.categories
                      : [...prev.categories, c],
                  }));
                  setCategorySearch('');
                }}
              >
                <Text style={{ color: dark ? COLORS.white : COLORS.greyscale900, fontFamily: 'medium' }}>{c}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
      <View style={styles.selectedRow}>
        {form.categories.map(id => {
          const cat = categories.find(c => c === id);
          if (!cat) return null;
          return (
            <View key={id} style={styles.selectedChip}>
              <Text style={{ color: COLORS.white, fontFamily: 'medium' }}>{cat}</Text>
              <TouchableOpacity style={styles.removeCircle} onPress={() => setForm(prev => ({ ...prev, categories: prev.categories.filter(cid => cid !== id) }))}>
                <Text style={{ color: COLORS.white, fontFamily: 'bold' }}>×</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </>
  ) : null;

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={viewMode === 'form' ? `${editingId ? `Edit ${form.code || ''}` : 'Create'} Promo` : 'Promo Codes'} onBackPress={handleBack} />
        {viewMode === 'list' ? (
          <>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              {promos.map(p => {
                const expiry = getExpiryInfo(p, nowTs);
                const expiryColor = expiry.expired ? COLORS.red : (dark ? COLORS.white : COLORS.greyscale900);
                return (
                  <View
                    key={p._id}
                    style={[
                      styles.cardContainer,
                      {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                        borderColor: COLORS.black,
                      },
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardCode, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{p.code}</Text>
                      <Text style={[styles.cardBadge, { backgroundColor: COLORS.tansparentPrimary, color: COLORS.primary }]}>
                        {p.type === 'percentage' ? `${p.value}% off` : `PKR ${p.value} off`}
                      </Text>
                    </View>
                    <Text style={[styles.cardScope, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
                      Scope: {p.scope === 'all' ? 'All products' : p.scope === 'product' ? 'Selected products' : 'Categories'}
                    </Text>
                    <View style={styles.expiryRow}>
                      <Text style={[styles.expiryText, { color: expiryColor }]}>
                        {expiry.text}
                      </Text>
                      <TouchableOpacity
                        style={styles.copyBtn}
                        onPress={() => {
                          Clipboard.setStringAsync(p.code || '');
                          Alert.alert('Copied', 'Promo code copied to clipboard');
                        }}
                      >
                        <Text style={styles.copyText}>Copy Promo Code</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => onEdit(p)} style={[styles.actionBtn, styles.editBtn]}>
                        <Text style={[styles.actionText, styles.editText]}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => onDelete(p._id)} style={[styles.actionBtn, styles.deleteBtn]}>
                        <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              {promos.length === 0 && (
                <Text style={{ marginTop: 12, color: dark ? COLORS.white : COLORS.greyscale900 }}>No promo codes yet.</Text>
              )}
            </ScrollView>
            <View style={styles.bottomButton}>
              <TouchableOpacity style={styles.addCardBtn} onPress={() => { setViewMode('form'); setEditingId(null); setForm({ ...emptyForm }); setInitialForm({ ...emptyForm }); }}>
                <Text style={styles.addCardText}>Add New Promo Code</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Promo Code</Text>
              <TextInput
                value={form.code}
                onChangeText={v => setForm(prev => ({ ...prev, code: v.toUpperCase() }))}
                placeholder="SAVE10"
                placeholderTextColor={dark ? COLORS.grayscale200 : COLORS.grayscale700}
                autoCapitalize="characters"
                style={[
                  styles.input,
                  {
                    backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                    color: dark ? COLORS.white : COLORS.greyscale900,
                    textTransform: 'uppercase',
                  },
                ]}
              />
              {codeErrorMessage && (
                <Text style={[styles.validationText, { color: COLORS.red }]}>{codeErrorMessage}</Text>
              )}

              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900, marginTop: 12 }]}>Type</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {renderTypeChip('Percentage', 'percentage')}
                {renderTypeChip('Amount', 'amount')}
              </View>

              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900, marginTop: 12 }]}>Value</Text>
              <TextInput
                value={form.value}
                onChangeText={v => setForm(prev => ({ ...prev, value: v }))}
                placeholder="10"
                keyboardType="numeric"
                placeholderTextColor={dark ? COLORS.grayscale200 : COLORS.grayscale700}
                style={[styles.input, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, color: dark ? COLORS.white : COLORS.greyscale900 }]}
              />

            <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900, marginTop: 12 }]}>Scope</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {renderScopeChip('All Products', 'all')}
              {renderScopeChip('Category', 'category')}
              {renderScopeChip('Product', 'product')}
            </View>

            {categoryChips}
            {productChips}

              <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900, marginTop: 12 }]}>Duration</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {(['none', 'custom'] as DurationType[]).map(dt => (
                  <TouchableOpacity
                    key={dt}
                    style={[
                      styles.chip,
                      form.durationType === dt && { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
                    ]}
                    onPress={() =>
                      setForm(prev => ({
                        ...prev,
                        durationType: dt,
                        startDate: dt === 'custom' ? prev.startDate : '',
                        endDate: dt === 'custom' ? prev.endDate : '',
                      }))
                    }
                  >
                    <Text style={{ color: form.durationType === dt ? COLORS.white : (dark ? COLORS.white : COLORS.greyscale900), fontFamily: 'medium' }}>
                      {dt === 'none' ? 'No Expiry' : 'Custom'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {form.durationType === 'custom' && (
                <View style={{ marginTop: 0 }}>
                  <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>From</Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                        borderColor: isStartActive ? COLORS.greyscale900 : COLORS.grayscale200,
                      },
                    ]}
                    onPress={() => setDatePickerVisible({ field: 'start' })}
                  >
                    <Text
                      style={{
                        color: isStartActive
                          ? (dark ? COLORS.white : COLORS.greyscale900)
                          : form.startDate
                          ? (dark ? COLORS.white : COLORS.greyscale900)
                          : COLORS.grayscale700,
                        fontFamily: 'regular',
                      }}
                    >
                      {form.startDate ? new Date(form.startDate).toLocaleString() : 'Select start date & time'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.label, { color: dark ? COLORS.white : COLORS.greyscale900, marginTop: 8 }]}>To</Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      {
                        backgroundColor: dark ? COLORS.dark2 : COLORS.white,
                        borderColor: isEndActive ? COLORS.greyscale900 : COLORS.grayscale200,
                      },
                    ]}
                    onPress={() => setDatePickerVisible({ field: 'end' })}
                  >
                    <Text
                      style={{
                        color: isEndActive
                          ? (dark ? COLORS.white : COLORS.greyscale900)
                          : form.endDate
                          ? (dark ? COLORS.white : COLORS.greyscale900)
                          : COLORS.grayscale700,
                        fontFamily: 'regular',
                      }}
                    >
                      {form.endDate ? new Date(form.endDate).toLocaleString() : 'Select end date & time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            </ScrollView>
            <View style={styles.actionsFloating}>
              <TouchableOpacity style={[styles.saveBtn, { opacity: loading ? 0.7 : 1 }]} onPress={onSave} disabled={loading}>
                <Text style={{ color: COLORS.white, fontFamily: 'bold' }}>{editingId ? 'Save' : 'Create'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelBtn, editingId && { borderColor: COLORS.red }]}
                onPress={() => {
                  if (editingId) {
                    onDelete(editingId);
                  } else {
                    setForm({ ...emptyForm });
                    setViewMode('list');
                  }
                }}
              >
                <Text style={{ color: editingId ? COLORS.red : COLORS.greyscale900, fontFamily: 'medium' }}>
                  {editingId ? 'Delete' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
      <DateTimePickerModal
        isVisible={!!datePickerVisible.field}
        mode="datetime"
        date={
          datePickerVisible.field === 'start' && form.startDate
            ? new Date(form.startDate)
            : datePickerVisible.field === 'end' && form.endDate
            ? new Date(form.endDate)
            : new Date()
        }
        minimumDate={
          datePickerVisible.field === 'end'
            ? (form.startDate ? new Date(new Date(form.startDate).getTime() + 60 * 1000) : new Date(new Date().getTime() + 60 * 1000))
            : new Date(new Date().getTime() + 60 * 1000)
        }
        onConfirm={(date) => {
          if (!datePickerVisible.field) return;
          const now = new Date();
          const minStart = new Date(now.getTime() + 60 * 1000);
          const minEnd = form.startDate ? new Date(new Date(form.startDate).getTime() + 60 * 1000) : new Date(now.getTime() + 60 * 1000);
          const safeDate =
            datePickerVisible.field === 'start' && date < minStart
              ? minStart
              : datePickerVisible.field === 'end' && date < minEnd
              ? minEnd
              : date;
          const iso = safeDate.toISOString();
          setForm(prev => ({
            ...prev,
            startDate: datePickerVisible.field === 'start' ? iso : prev.startDate,
            endDate: datePickerVisible.field === 'end' ? iso : prev.endDate,
          }));
          setDatePickerVisible({ field: null });
        }}
        onCancel={() => setDatePickerVisible({ field: null })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  label: { fontFamily: 'semiBold', fontSize: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: 'regular',
    fontSize: 14,
  },
  validationText: {
    fontSize: 12,
    fontFamily: 'regular',
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  actionsFloating: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'space-between',
  },
  saveBtn: {
    flex: 1,
    height: 58,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 58,
    borderRadius: 32,
    borderWidth: 1.4,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cardContainer: {
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCode: { fontFamily: 'bold', fontSize: 16 },
  cardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    fontFamily: 'medium',
    fontSize: 12,
  },
  cardScope: { fontFamily: 'regular', fontSize: 15, marginTop: 8 },
  expiryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  expiryText: { fontFamily: 'medium', fontSize: 13 },
  copyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.greyscale300,
    backgroundColor: COLORS.tansparentPrimary,
  },
  copyText: { fontFamily: 'medium', fontSize: 12, color: COLORS.primary },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayscale200,
  },
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.4,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  editBtn: {
    backgroundColor: 'transparent',
  },
  deleteBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionText: { fontFamily: 'semiBold', fontSize: 16 },
  editText: { color: COLORS.primary },
  deleteText: { color: COLORS.white },
  selectedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  removeCircle: {
    height: 18,
    width: 18,
    borderRadius: 9,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    borderRadius: 10,
    marginTop: 8,
    paddingVertical: 4,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownEmpty: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: COLORS.grayscale700,
    fontFamily: 'regular',
  },
  bottomButton: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  addCardBtn: {
    width: SIZES.width - 32,
    backgroundColor: COLORS.primary,
    borderRadius: 32,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardText: {
    color: COLORS.white,
    fontFamily: 'bold',
    fontSize: 16,
  },
});

export default PromoCodesScreen;
