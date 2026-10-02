import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, TabBar } from 'react-native-tab-view';
import { NavigationProp } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons, images, SIZES } from '@/constants';
import { useNavigation } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from './context/AuthContext';
import {
  addReply,
  deleteReply,
  deleteReview,
  fetchSellerReviews,
  Review,
  updateReply,
} from '@/utils/api/reviews';
import { API_BASE_URL } from '@/utils/api/client';

type ReviewItem = Review & { product?: any };

const SellerReviews = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const layout = useWindowDimensions();
  const { dark, colors } = useTheme();
  const { token, user } = useAuth();
  const apiBase = API_BASE_URL.replace(/\/api$/, '');

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'first', title: 'Not Replied' },
    { key: 'second', title: 'Replied' },
  ]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);

  const sellerId = user?.id || (user as any)?._id || '';

  const loadReviews = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchSellerReviews(token);
      setReviews(res.reviews || []);
    } catch (err: any) {
      Alert.alert('Reviews', err?.message || 'Could not load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [token]);

  const hasSellerReply = (r: ReviewItem) =>
    (r.replies || []).some(
      rep =>
        (rep as any)?.seller?._id === sellerId ||
        (rep as any)?.seller === sellerId,
    );

  const notReplied = useMemo(
    () => reviews.filter(r => !hasSellerReply(r)),
    [reviews, sellerId],
  );
  const replied = useMemo(
    () => reviews.filter(r => hasSellerReply(r)),
    [reviews, sellerId],
  );

  const handleReply = async (reviewId: string, comment: string) => {
    if (!token) return;
    try {
      const res = await addReply(reviewId, comment, token);
      setReviews(prev =>
        prev.map(r => (r._id === reviewId ? { ...r, ...(res.review as any) } : r)),
      );
    } catch (err: any) {
      Alert.alert('Reply failed', err?.message || 'Could not add reply');
    }
  };

  const handleUpdateReply = async (reviewId: string, replyId: string, comment: string) => {
    if (!token) return;
    try {
      const res = await updateReply(reviewId, replyId, comment, token);
      setReviews(prev =>
        prev.map(r => (r._id === reviewId ? { ...r, ...(res.review as any) } : r)),
      );
    } catch (err: any) {
      Alert.alert('Update failed', err?.message || 'Could not update reply');
    }
  };

  const handleDeleteReply = async (reviewId: string, replyId: string) => {
    if (!token) return;
    try {
      const res = await deleteReply(reviewId, replyId, token);
      setReviews(prev =>
        prev.map(r => (r._id === reviewId ? { ...r, ...(res.review as any) } : r)),
      );
    } catch (err: any) {
      Alert.alert('Delete failed', err?.message || 'Could not delete reply');
    }
  };

  const ReviewCard = ({ item, mode }: { item: ReviewItem; mode: 'notReplied' | 'replied' }) => {
    const product: any = (item as any).product || {};
    const firstImage = Array.isArray(product.images) ? product.images[0] : undefined;
    const image = firstImage
      ? firstImage.startsWith('http')
        ? firstImage
        : `${apiBase}${firstImage}`
      : images.store;
    const sellerReply = (item.replies || []).find(
      rep =>
        (rep as any)?.seller?._id === sellerId ||
        (rep as any)?.seller === sellerId,
    );

    const [showReplyModal, setShowReplyModal] = useState(false);
    const [replyText, setReplyText] = useState(sellerReply?.comment || '');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    return (
      <View style={[styles.cardContainer, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
        <View style={styles.detailsContainer}>
          <View style={[styles.productImageContainer, { backgroundColor: dark ? COLORS.dark3 : COLORS.silver }]}>
            <Image source={{ uri: image }} resizeMode="cover" style={styles.productImage} />
          </View>
          <View style={styles.detailsRightContainer}>
            <View style={styles.priceContainer}>
              <Text style={[styles.name, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>
                {product.name || 'Product'}
              </Text>
              <View
                style={[
                  styles.statusContainer,
                  { borderColor: dark ? COLORS.dark3 : COLORS.primary, backgroundColor: dark ? COLORS.dark3 : 'transparent' },
                ]}
              >
                <FontAwesome name="star" size={12} color="orange" />
                <Text style={styles.rating}>{item.rating}</Text>
              </View>
            </View>
              <Text style={[styles.totalPrice, { color: dark ? COLORS.white : COLORS.primary }]}>
              From {(item.user as any)?.name || 'Buyer'}
            </Text>
            <Text style={[styles.address, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
              {item.comment}
            </Text>
          
            {mode === 'replied' && sellerReply && (
              <View style={{ marginTop: 8 }}>
                <Text style={[styles.replyLabel, { color: dark ? COLORS.white : COLORS.black }]}>Your reply:</Text>
                <Text style={[styles.address, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
                  {sellerReply.comment}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View
          style={[
            styles.separateLine,
            { marginVertical: 10, backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200 },
          ]}
        />

        <View style={styles.buttonContainer}>
          {mode === 'notReplied' ? (
            <TouchableOpacity
              onPress={() => setShowReplyModal(true)}
              style={[
                styles.receiptBtn,
                {
                  flex: 1,
                  backgroundColor: dark ? COLORS.dark3 : COLORS.primary,
                  borderColor: dark ? COLORS.dark3 : COLORS.primary,
                  width: '100%',
                },
              ]}
            >
              <Text style={styles.receiptBtnText}>Reply</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setShowReplyModal(true)}
                style={[
                  styles.receiptBtn,
                  { flex: 1, backgroundColor: dark ? COLORS.dark3 : COLORS.primary, borderColor: dark ? COLORS.dark3 : COLORS.primary },
                ]}
              >
                <Text style={styles.receiptBtnText}>Edit Reply</Text>
              </TouchableOpacity>
              {sellerReply && (
                <TouchableOpacity
                  onPress={() => handleDeleteReply(item._id, (sellerReply as any)?._id || '')}
                  style={[styles.cancelBtn, { flex: 1, borderColor: dark ? COLORS.white : COLORS.primary }]}
                >
                  <Text style={[styles.cancelBtnText, { color: dark ? COLORS.white : COLORS.primary }]}>Delete Reply</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Reply modal */}
        <Modal transparent visible={showReplyModal} animationType="fade">
          <TouchableWithoutFeedback onPress={() => setShowReplyModal(false)}>
            <View style={[styles.modalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          </TouchableWithoutFeedback>
          <View style={[styles.modalSubContainer, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
            <Text style={[styles.modalTitle, { color: dark ? COLORS.white : COLORS.primary, textAlign: 'center' }]}>
              {mode === 'notReplied' ? 'Reply to review' : 'Edit your reply'}
            </Text>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder="Write your reply"
              placeholderTextColor={dark ? COLORS.grayscale400 : COLORS.grayscale700}
              style={[
                styles.modalInput,
                {
                  backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                  color: dark ? COLORS.white : COLORS.black,
                  paddingTop: 12,
                  paddingBottom: 12,
                },
              ]}
              multiline
            />
            <View style={styles.replyActions}>
              <TouchableOpacity
                style={[
                  styles.modalActionBtn,
                  { backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary, borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary },
                ]}
                onPress={() => setShowReplyModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: dark ? COLORS.white : COLORS.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                onPress={async () => {
                  setShowReplyModal(false);
                  if (mode === 'notReplied') {
                    await handleReply(item._id, replyText.trim());
                  } else {
                    const replyId = (sellerReply as any)?._id || '';
                    await handleUpdateReply(item._id, replyId, replyText.trim());
                  }
                }}
              >
                <Text style={[styles.receiptBtnText]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    );
  };

  const renderScene = ({ route }: any) => {
    if (route.key === 'first') {
      return (
        <FlatList
          data={notReplied}
          keyExtractor={item => item._id}
          refreshing={loading}
          onRefresh={loadReviews}
          renderItem={({ item }) => <ReviewCard item={item} mode="notReplied" />}
          ListEmptyComponent={
            !loading ? (
              <Text style={[styles.emptyText, { color: dark ? COLORS.white : COLORS.black }]}>
                No pending replies
              </Text>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 16 }}
        />
      );
    }
    if (route.key === 'second') {
      return (
        <FlatList
          data={replied}
          keyExtractor={item => item._id}
          refreshing={loading}
          onRefresh={loadReviews}
          renderItem={({ item }) => <ReviewCard item={item} mode="replied" />}
          ListEmptyComponent={!loading ? (
            <Text style={[styles.emptyText, { color: dark ? COLORS.white : COLORS.black }]}>No replied reviews</Text>
          ) : null}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 16 }}
        />
      );
    }
    return null;
  };

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{
        backgroundColor: dark ? COLORS.white : COLORS.primary,
      }}
      style={{
        backgroundColor: colors.background,
      }}
      renderLabel={({ route, focused }) => (
        <Text
          style={[
            {
              color: focused ? (dark ? COLORS.white : COLORS.primary) : 'gray',
              fontSize: 16,
              fontFamily: 'semiBold',
            },
          ]}
        >
          {route.title}
        </Text>
      )}
    />
  );

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={icons.back}
              resizeMode="contain"
              style={[styles.backIcon, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Reviews</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          renderTabBar={renderTabBar}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    width: SIZES.width - 32,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    color: COLORS.black,
    marginLeft: 16,
  },
  cardContainer: {
    width: SIZES.width - 32,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 16,
  },
  detailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImageContainer: {
    width: 88,
    height: 88,
    borderRadius: 16,
    marginHorizontal: 12,
    backgroundColor: COLORS.silver,
  },
  productImage: {
    width: 88,
    height: 88,
    borderRadius: 16,
  },
  detailsRightContainer: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 17,
    fontFamily: 'bold',
    color: COLORS.greyscale900,
  },
  address: {
    fontSize: 14,
    fontFamily: 'regular',
    color: COLORS.grayscale700,
    marginVertical: 4,
  },
  statusContainer: {
    width: 50,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: COLORS.primary,
    borderWidth: 1,
    flexDirection: 'row',
    

  },
  rating: {
    fontSize: 12,
    fontFamily: 'semiBold',
    color: COLORS.primary,
    marginLeft: 4,
  },
  separateLine: {
    width: '100%',
    height: 0.7,
    backgroundColor: COLORS.greyScale800,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  totalPrice: {
    fontSize: 13,
    fontFamily: 'semiBold',
    color: COLORS.primary,
    textAlign: 'left',
  },
  cancelBtn: {
    width: (SIZES.width - 32) / 2 - 16,
    height: 36,
    borderRadius: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderColor: COLORS.primary,
    borderWidth: 1.4,
    marginBottom: 12,
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    color: COLORS.primary,
  },
  receiptBtn: {
    width: (SIZES.width - 32) / 2 - 16,
    height: 36,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderColor: COLORS.primary,
    borderWidth: 1.4,
    marginBottom: 12,
  },
  receiptBtnText: {
    fontSize: 16,
    fontFamily: 'semiBold',
    color: COLORS.white,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSubContainer: {
    position: 'absolute',
    top: '20%',
    left: 24,
    right: 24,
    borderRadius: 20,
    padding: 16,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'bold',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'regular',
    textAlign: 'center',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  modalInput: {
    width: '100%',
    minHeight: 100,
    backgroundColor: COLORS.tansparentPrimary,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderColor: COLORS.primary,
  },
  replyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    width: '100%',
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.2,
  },
  replyLabel: {
    fontSize: 12,
    fontFamily: 'semiBold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    fontFamily: 'semiBold',
  },
});

export default SellerReviews;
