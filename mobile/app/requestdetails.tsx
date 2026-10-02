import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import HeaderWithSearch from '@/components/HeaderWithSearch';
import Header from '@/components/Header';
import { useAuth } from '@/app/context/AuthContext';
import { useLocalSearchParams } from 'expo-router';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { COLORS, icons } from '@/constants';
import { fetchRequestById, PartsRequest } from '@/utils/api/partsRequests';
import { API_BASE_URL } from '@/utils/api/client';

const baseUrl = API_BASE_URL.replace(/\/api$/, '');

const detailFields = [
  { id: 'requestNumber', label: 'Request number' },
  { id: 'partName', label: 'Part name' },
  { id: 'companyName', label: 'Make' },
  { id: 'carName', label: 'Model' },
  { id: 'variant', label: 'Variant' },
  { id: 'year', label: 'Year' },
  { id: 'category', label: 'Category' },
  { id: 'quantity', label: 'Quantity' },
];

const formatFieldValue = (value?: any) => {
  if (value === undefined || value === null || value === '') return 'N/A';
  return String(value);
};

export default function RequestDetails() {
  const navigation = useNavigation<NavigationProp<any>>();
  const { token, user } = useAuth();
  const { colors, dark } = useTheme();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const requestId = params?.requestId;
  const [request, setRequest] = useState<PartsRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!requestId) {
        setError('Request not found');
        return;
      }
      setLoading(true);
      try {
        const res = await fetchRequestById(requestId, token || undefined);
        if (res?.item) {
          setRequest(res.item);
          setError(null);
        } else {
          setError('Request not found');
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load request');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [requestId, token]);

  const isSuperAdmin = (user?.role || '').toLowerCase() === 'superadmin';
  const renderHeader = () =>
    isSuperAdmin ? (
      <Header title="Request details" onBackPress={() => navigation.goBack()} />
    ) : (
      <HeaderWithSearch title="Request details" onPress={() => navigation.goBack()} />
    );

  const imagePath = request?.images && request.images.length ? request.images[0]?.path : undefined;
  const isPlaceholderImage =
    !imagePath ||
    imagePath.toLowerCase().includes('placeholder') ||
    imagePath.toLowerCase().includes('via.placeholder.com');
  const imageUri =
    imagePath && !isPlaceholderImage
      ? imagePath.startsWith('http')
        ? imagePath
        : `${baseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`
      : undefined;

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={[styles.errorText, { color: dark ? COLORS.white : COLORS.red }]}>{error}</Text>
        ) : (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {imageUri ? (
              <View
                style={[
                  styles.imageWrapper,
                  { backgroundColor: dark ? COLORS.dark2 : COLORS.grayscale200 },
                  styles.imageWrapperSpacing,
                ]}
              >
                <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
              </View>
            ) : (
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                  Image
                </Text>
                <View
                  style={[
                    styles.fieldContent,
                    {
                      borderColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                      backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                    },
                  ]}
                >
                  <Text style={[styles.fieldText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                    N/A
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.detailFieldsContainer}>
              {detailFields.map(field => (
                <View key={field.id} style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                    {field.label}
                  </Text>
                  <View
                    style={[
                      styles.fieldContent,
                      {
                        borderColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                        backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                      },
                    ]}
                  >
                    <Text style={[styles.fieldText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                      {formatFieldValue((request as any)?.[field.id])}
                    </Text>
                  </View>
                </View>
              ))}
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: dark ? COLORS.gray3 : COLORS.gray }]}>
                  Description
                </Text>
                <View
                  style={[
                    styles.descriptionBox,
                    {
                      borderColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                      backgroundColor: dark ? COLORS.dark3 : COLORS.grayscale200,
                    },
                  ]}
                >
                  <Text style={[styles.fieldText, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                    {request?.description || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  imageWrapper: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageWrapperSpacing: {
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fieldRow: {
    marginBottom: 14,
  },
  detailFieldsContainer: {
    marginTop: 0,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: 'regular',
    marginBottom: 4,
  },
  fieldContent: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  fieldText: {
    fontSize: 15,
    fontFamily: 'medium',
  },
  descriptionBox: {
    minHeight: 96,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    marginTop: 24,
    fontSize: 16,
    textAlign: 'center',
  },
});
