import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useLocalSearchParams } from 'expo-router';
import { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { fetchStoreBySellerId } from '@/utils/api/store';
import { fetchPublicProducts, Product } from '@/utils/api/products';
import { COLORS, icons } from '@/constants';
import StarRating from '@/components/StarRating';
import { PRODUCT_PLACEHOLDER, resolveProductImageSource } from '@/utils/images';

const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  const month = d.toLocaleString('default', { month: 'short' });
  const year = d.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

const StoreReviewsScreen = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const params = useLocalSearchParams<{ sellerId?: string; id?: string }>();
  const sellerId = params.sellerId || params.id || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!sellerId) return;
    try {
      setLoading(true);
      // Ensure store exists; ignore result since we only need seller validation
      await fetchStoreBySellerId(String(sellerId));
      const res = await fetchPublicProducts({ seller: String(sellerId), limit: 200 });
      setProducts(res.products || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  const reviewStats = useMemo(() => {
    const list = products.flatMap((p) =>
      (p.reviews || []).map((rev, idx) => ({
        productId: p._id,
        productName: p.name,
        rating: rev?.rating ?? 0,
        comment: (rev as any)?.comment || '',
        createdAt: (rev as any)?.createdAt,
        image: p.images?.[0] ? resolveProductImageSource(p.images[0]) : PRODUCT_PLACEHOLDER,
        userName: (rev as any)?.user?.name || 'User',
        userImage: (rev as any)?.user?.profileImage || '',
        key: `${p._id}-${idx}`,
      }))
    );
    const ratings = list.map((r) => r.rating).filter((r) => typeof r === 'number');
    const count = list.length;
    const total = ratings.reduce((sum, r) => sum + (Number(r) || 0), 0);
    const avg = count ? total / count : 0;
    const sorted = [...list].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
    return { list: sorted, count, avg };
  }, [products]);

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image source={icons.back} style={[styles.backIcon, { tintColor: colors.text }]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Store Reviews</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={[styles.summaryCard, { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Overall Rating</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <StarRating rating={reviewStats.avg} size={16} />
            <Text style={[styles.summaryMeta, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
              {reviewStats.avg.toFixed(1)} • {reviewStats.count} reviews
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 12 }} color={COLORS.primary} />
      ) : reviewStats.count === 0 ? (
        <Text style={[styles.emptyText, { color: colors.text, textAlign: 'center', marginTop: 20 }]}>No reviews yet.</Text>
      ) : (
        <FlatList
          data={reviewStats.list}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }}
          renderItem={({ item }) => (
            <View style={[styles.reviewCard, { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                {item.userImage ? (
                  <Image source={{ uri: item.userImage }} style={styles.userAvatar} />
                ) : (
                  <View style={styles.userAvatarFallback}>
                    <Text style={styles.userAvatarText}>{item.userName.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.reviewName, { color: colors.text }]} numberOfLines={1}>
                    {item.userName}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <StarRating rating={item.rating} size={14} />
                    <Text style={[styles.reviewMeta, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700, marginLeft: 6 }]}>
                      {item.createdAt ? `${formatDate(item.createdAt)}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
              {item.comment ? (
                <Text style={[styles.reviewText, { color: colors.text }]} numberOfLines={4}>
                  {item.comment}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backIcon: { width: 24, height: 24 },
  headerTitle: { fontSize: 20, fontFamily: 'bold' },
  summaryCard: {
    padding: 12,
    borderRadius: 12,
  },
  summaryTitle: { fontFamily: 'bold', fontSize: 16 },
  summaryMeta: { fontFamily: 'regular', fontSize: 13, marginLeft: 8 },
  starRow: { flexDirection: 'row', alignItems: 'center' },
  reviewCard: {
    padding: 12,
    borderRadius: 12,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.silver,
  },
  userAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { color: COLORS.white, fontFamily: 'bold', fontSize: 16 },
  reviewName: { fontFamily: 'bold', fontSize: 14 },
  reviewMeta: { fontFamily: 'regular', fontSize: 12 },
  reviewText: { fontFamily: 'regular', fontSize: 13 },
  reviewProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  reviewProductImage: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.silver },
  reviewProductName: { fontFamily: 'regular', fontSize: 12 },
  emptyText: { fontFamily: 'regular', fontSize: 14 },
});

export default StoreReviewsScreen;
