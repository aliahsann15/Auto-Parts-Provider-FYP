import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, Modal, TouchableWithoutFeedback, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-virtualized-view';
import { Fontisto, FontAwesome } from "@expo/vector-icons";
import { COLORS, SIZES, icons, illustrations } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import Button from '../components/Button';
import ButtonFilled from '../components/ButtonFilled';
import { NavigationProp } from '@react-navigation/native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { fetchPublicProduct } from '@/utils/api/products';
import { createReview, fetchReviews, Review } from '@/utils/api/reviews';
import { useAuth } from './context/AuthContext';

const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
};

const StarRow = ({ rating, color }: { rating: number; color: string }) => {
    const stars = [1,2,3,4,5].map(i => (
        <FontAwesome
            key={i}
            name={i <= Math.round(rating) ? 'star' : 'star-o'}
            size={12}
            color={color}
            style={{ marginRight: 4 }}
        />
    ));
    return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{stars}</View>;
};

const ProductReviews = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const params = useLocalSearchParams<{ productId?: string }>();
    const productId = params.productId ? String(params.productId) : '';
    const { colors, dark } = useTheme();
    const { token, isLoggedIn } = useAuth();
    const [modalVisible, setModalVisible] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [avgRating, setAvgRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [ratingValue, setRatingValue] = useState<number>(5);
    const [comment, setComment] = useState('');
    const [productName, setProductName] = useState('');

    const load = async () => {
        if (!productId) return;
        setLoading(true);
        try {
            const prod = await fetchPublicProduct(productId);
            const p = (prod as any).product || {};
            setProductName(p.name || 'Product');
            setAvgRating(Number(p.averageRating || 0));
            setTotalReviews(Number(p.totalReviews || 0));
            const res = await fetchReviews(productId);
            setReviews(res.reviews || []);
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [productId]);

    const handleSubmit = async () => {
        if (!isLoggedIn || !token) {
            Alert.alert('Login required', 'Please log in to add a review.');
            return;
        }
        if (!productId) {
            Alert.alert('Error', 'Missing product id.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await createReview({ product: productId, rating: ratingValue, comment }, token);
            const newReview = res.review;
            setReviews(prev => [newReview, ...prev]);
            if (res.ratings) {
                setAvgRating(res.ratings.averageRating || 0);
                setTotalReviews(res.ratings.totalReviews || 0);
            } else {
                setTotalReviews(prev => prev + 1);
            }
            setComment('');
            setRatingValue(5);
            setModalVisible(false);
        } catch (err: any) {
            Alert.alert('Review failed', err?.message || 'Unable to post review.');
        } finally {
            setSubmitting(false);
        }
    };

    const ratingOptions = [1, 2, 3, 4, 5];
    const filteredReviews = useMemo(() => reviews, [reviews]);

    const renderHeader = () => {
        return (
            <View style={styles.headerContainer}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}>
                        <Image
                            source={icons.back}
                            resizeMode='contain'
                            style={[styles.backIcon, {
                                tintColor: dark ? COLORS.white : COLORS.greyscale900
                            }]}
                        />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, {
                        color: dark ? COLORS.white : COLORS.greyscale900
                    }]}>
                        Reviews
                    </Text>
                </View>
            </View>
        )
    }

    const renderReview = ({ item }: { item: Review }) => {
        const author = (item.user as any)?.name || 'User';
        const avatar = (item.user as any)?.profileImage;
        const date = formatDate(item.createdAt);
        const reply = item.replies?.[0];
        return (
            <View style={[styles.reviewCard, { backgroundColor: dark ? COLORS.dark3 : COLORS.secondaryWhite }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
                        {avatar ? (
                            <Image source={{ uri: avatar }} style={styles.avatarImg} />
                        ) : (
                            <Text style={styles.avatarInitial}>{author.charAt(0).toUpperCase()}</Text>
                        )}
                    </View>
                    <View style={{ marginLeft: 10 }}>
                        <Text style={[styles.name, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{author}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <StarRow rating={item.rating} color={COLORS.primary} />
                            <Text style={{ marginLeft: 6, color: dark ? COLORS.grayscale200 : COLORS.greyscale600, fontSize: 12 }}>{date}</Text>
                        </View>
                    </View>
                </View>
                {item.comment ? (
                    <Text style={{ color: dark ? COLORS.white : COLORS.greyscale900, marginBottom: 8 }}>{item.comment}</Text>
                ) : null}
                {reply?.comment ? (
                    <View style={[styles.replyBox, { backgroundColor: dark ? COLORS.dark2 : COLORS.silver }]}>
                        <Text style={{ fontWeight: '700', color: dark ? COLORS.white : COLORS.greyscale900 }}>
                            Store Owner Replied:
                        </Text>
                        <Text style={{ color: dark ? COLORS.grayscale200 : COLORS.greyscale600, marginTop: 4 }}>{reply.comment}</Text>
                        {reply.createdAt ? (
                            <Text style={{ color: dark ? COLORS.grayscale400 : COLORS.greyscale500, fontSize: 12, marginTop: 4 }}>
                                {formatDate(reply.createdAt)}
                            </Text>
                        ) : null}
                    </View>
                ) : null}
            </View>
        );
    };

    const renderModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}>
            <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.modalSubContainer, {
                            backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite
                        }]}>
                            <View style={styles.backgroundIllustration}>
                                <Image
                                    source={illustrations.background}
                                    resizeMode='contain'
                                    style={[styles.modalIllustration, {
                                        tintColor: dark ? COLORS.white : COLORS.primary,
                                    }]}
                                />
                                <Image
                                    source={icons.editPencil}
                                    resizeMode='contain'
                                    style={[styles.editPencilIcon, {
                                        tintColor: dark ? COLORS.primary : COLORS.white
                                    }]}
                                />
                            </View>
                            <Text style={[styles.modalTitle, {
                                color: dark ? COLORS.white : COLORS.primary,
                            }]}>Add your review</Text>
                            <View style={{ flexDirection: 'row', marginVertical: 12 }}>
                                {ratingOptions.map(val => (
                                    <TouchableOpacity key={val} onPress={() => setRatingValue(val)} style={{ marginRight: 8 }}>
                                        <FontAwesome
                                            name={val <= ratingValue ? 'star' : 'star-o'}
                                            size={24}
                                            color={val <= ratingValue ? COLORS.primary : COLORS.grayscale400}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TextInput
                                placeholder="Write your thoughts..."
                                placeholderTextColor={dark ? COLORS.secondaryWhite : COLORS.black}
                                style={[styles.modalInput, {
                                    backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                                    color: dark ? COLORS.white : COLORS.black
                                }]}
                                value={comment}
                                onChangeText={setComment}
                                multiline
                            />
                            <ButtonFilled
                                title={submitting ? "Submitting..." : "Submit Review"}
                                onPress={handleSubmit}
                                style={{
                                    width: "100%",
                                    marginTop: 12
                                }}
                                disabled={submitting}
                            />
                            <Button
                                title="Cancel"
                                onPress={() => setModalVisible(false)}
                                textColor={dark ? COLORS.white : COLORS.primary}
                                style={{
                                    width: "100%",
                                    marginTop: 12,
                                    backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                                    borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary
                                }}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    const ratingCounts = useMemo(() => {
        const counts: Record<number, number> = {1:0,2:0,3:0,4:0,5:0};
        reviews.forEach(r => { counts[r.rating] = (counts[r.rating] || 0) + 1; });
        return counts;
    }, [reviews]);

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {renderHeader()}
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{productName}</Text>
                        <TouchableOpacity onPress={() => setModalVisible(true)}>
                            <Text style={{ color: COLORS.primary, fontFamily: 'semiBold' }}>Write Review</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.ratingSummary}>
                        <Text style={[styles.avgRating, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{avgRating.toFixed(1)}</Text>
                        <StarRow rating={avgRating} color={COLORS.primary} />
                        <Text style={{ color: dark ? COLORS.greyscale300 : COLORS.greyscale600, marginTop: 4 }}>{totalReviews} reviews</Text>
                    </View>
                    <FlatList
                        data={filteredReviews}
                        keyExtractor={(item) => item._id}
                        renderItem={renderReview}
                        scrollEnabled={false}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        ListEmptyComponent={
                            <Text style={{ textAlign: 'center', color: dark ? COLORS.white : COLORS.greyscale600, marginVertical: 16 }}>
                                No reviews yet.
                            </Text>
                        }
                    />
                </ScrollView>
            </View>
            {renderModal()}
        </SafeAreaView>
    )
};

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 16
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    headerContainer: {
        flexDirection: "row",
        width: SIZES.width - 32,
        justifyContent: "space-between",
        marginBottom: 12
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center"
    },
    backIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.black
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'bold',
        color: COLORS.black,
        marginLeft: 16
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    summaryTitle: {
        fontSize: 18,
        fontFamily: 'semiBold'
    },
    ratingSummary: {
        alignItems: 'flex-start',
        marginBottom: 16
    },
    avgRating: {
        fontSize: 32,
        fontFamily: 'bold'
    },
    ratingButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    ratingButtonText: {
        fontSize: 14,
        fontFamily: 'medium'
    },
    selectedRatingButton: {
        backgroundColor: COLORS.primary,
    },
    selectedRatingButtonText: {
        color: COLORS.white,
    },
    ratingButtonContainer: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    reviewCard: {
        padding: 14,
        borderRadius: 12,
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarImg: {
        width: 40,
        height: 40,
        borderRadius: 20
    },
    avatarInitial: {
        color: COLORS.white,
        fontFamily: 'bold',
        fontSize: 16
    },
    name: {
        fontSize: 15,
        fontFamily: 'semiBold'
    },
    replyBox: {
        padding: 10,
        borderRadius: 10,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center"
    },
    modalSubContainer: {
        width: SIZES.width - 32,
        borderRadius: 20,
        padding: 16,
    },
    backgroundIllustration: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.tansparentPrimary,
        alignItems: "center",
        justifyContent: "center",
        alignSelf: "center"
    },
    modalIllustration: {
        width: 60,
        height: 60,
        position: "absolute"
    },
    editPencilIcon: {
        width: 24,
        height: 24
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: "semiBold",
        textAlign: "center",
        marginTop: 12
    },
    modalSubtitle: {
        fontSize: 14,
        fontFamily: "regular",
        textAlign: "center",
        marginVertical: 8
    },
    modalInput: {
        width: "100%",
        height: 100,
        borderRadius: 16,
        padding: 12,
        marginTop: 12
    },
});

export default ProductReviews;
