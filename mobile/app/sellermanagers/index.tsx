import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import Header from '@/components/Header';
import ButtonFilled from '@/components/ButtonFilled';
import { COLORS, icons } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { listStoreManagers, removeStoreManager, StoreManager } from '@/utils/api/store';
import { API_BASE_URL } from '@/utils/api/client';
import { router } from 'expo-router';

const ManagerCard = ({
  manager,
  onRemove,
  dark,
  onEdit,
  onChangePassword,
}: {
  manager: StoreManager;
  onRemove: (id: string) => void;
  onEdit: (manager: StoreManager) => void;
  onChangePassword: (manager: StoreManager) => void;
  dark: boolean;
}) => {
  const initial = (manager.name || manager.email || 'M').charAt(0).toUpperCase();
  return (
    <View style={[styles.card, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, borderColor: dark ? COLORS.grayscale700 : COLORS.grayscale200 }]}>
      <View style={styles.cardRow}>
        {manager.profileImage ? (
          <Image source={{ uri: manager.profileImage }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: dark ? COLORS.gray2 : COLORS.grayscale200, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontFamily: 'bold', color: dark ? COLORS.white : COLORS.greyscale900 }}>{initial}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={[
              styles.name,
              { color: dark ? COLORS.white : COLORS.greyscale900 }
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {manager.name || 'Manager'}
          </Text>
          <Text
            style={[styles.email, { color: dark ? COLORS.gray3 : COLORS.gray }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {manager.email || 'No email provided'}
          </Text>
          {manager.role ? (
            <Text style={[styles.role, { color: dark ? COLORS.grayscale200 : COLORS.gray }]}>
              {manager.role.replace(/([a-z])([A-Z])/g, '$1 $2')}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={() => onRemove(manager.id)} style={styles.trashBtn}>
          <Image source={icons.trash} style={[styles.trashIcon, { tintColor: COLORS.red }]} />
        </TouchableOpacity>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.secondaryBtn, { borderColor: dark ? COLORS.greyscale500 : COLORS.primary }]} onPress={() => onEdit(manager)}>
          <Text style={[styles.secondaryBtnText, { color: dark ? COLORS.white : COLORS.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondaryBtn, { borderColor: dark ? COLORS.greyscale500 : COLORS.primary }]} onPress={() => onChangePassword(manager)}>
          <Text style={[styles.secondaryBtnText, { color: dark ? COLORS.white : COLORS.primary }]}>Change Password</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ManagersScreen() {
  const { dark, colors } = useTheme();
  const { token, user } = useAuth();
  const [managers, setManagers] = useState<StoreManager[]>([]);
  const [loading, setLoading] = useState(false);
  const handleAddManager = () => {
    router.push('/addmanager');
  };
  const handleEditManager = (manager: StoreManager) => {
    router.push({
      pathname: '/editmanager',
      params: { manager: JSON.stringify(manager) },
    });
  };
  const handleChangePassword = (manager: StoreManager) => {
    router.push({
      pathname: '/managerchangepassword',
      params: { manager: JSON.stringify(manager) },
    });
  };

  const isStoreManager = useMemo(() => (user?.role || '').toLowerCase?.() === 'storemanager', [user?.role]);

  const loadManagers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await listStoreManagers(token);
      const base = API_BASE_URL.replace(/\/api$/, '');
      const normalize = (uri?: string) => {
        if (!uri) return undefined;
        if (uri.startsWith('http')) return uri;
        return `${base}${uri.startsWith('/') ? '' : '/'}${uri}`;
      };
      const mapped = (res.managers || []).map(m => ({
        ...m,
        profileImage: normalize(m.profileImage),
      }));
      setManagers(mapped);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not load managers');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  const handleRemove = async (id: string) => {
    if (!token) return;
    Alert.alert('Remove manager?', 'This will revoke their access.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeStoreManager(id, token);
            setManagers(prev => prev.filter(m => m.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not remove manager');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Store Managers" onBackPress={() => router.back()} />
        <View style={styles.headerRow}>
          <Text style={[styles.countText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            {managers.length} Manager{managers.length === 1 ? '' : 's'}
          </Text>
          {!isStoreManager && (
            <ButtonFilled
              title="Add Manager"
              onPress={handleAddManager}
              style={styles.addBtn}
              // textStyle={{ fontSize: 13 }}
            />
          )}
        </View>
        <FlatList
          data={managers}
          keyExtractor={item => item.id}
          refreshing={loading}
          onRefresh={loadManagers}
          contentContainerStyle={{ paddingVertical: 12, gap: 12 }}
          renderItem={({ item }) => (
            <ManagerCard
              manager={item}
              onRemove={handleRemove}
              onEdit={handleEditManager}
              onChangePassword={handleChangePassword}
              dark={dark}
            />
          )}
          ListEmptyComponent={
            !loading ? (
              <Text style={{ textAlign: 'center', marginTop: 24, color: dark ? COLORS.gray3 : COLORS.gray }}>
                No managers yet.
              </Text>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  countText: { fontFamily: 'semiBold', fontSize: 14 },
  addBtn: { height: 36, paddingHorizontal: 14, borderRadius: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 64, height: 64, borderRadius: 12, backgroundColor: COLORS.grayscale200 },
  name: { fontFamily: 'bold', fontSize: 18, flexShrink: 1 },
  email: { fontFamily: 'medium', fontSize: 14, marginTop: 4, flexShrink: 1, flexWrap: 'wrap' },
  role: { fontFamily: 'regular', fontSize: 13, marginTop: 4, color: COLORS.gray },
  trashBtn: { padding: 8, marginLeft: 8 },
  trashIcon: { width: 18, height: 18 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop:12, justifyContent: 'center', borderTopWidth: 1,borderTopColor: COLORS.grayscale200 },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    width: "50%",

    alignItems: "center"
  },
  secondaryBtnText: { fontFamily: 'semiBold', fontSize: 13 },
});
