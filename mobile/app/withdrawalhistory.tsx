import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { COLORS } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuth } from '@/app/context/AuthContext';
import { fetchWithdrawals, Withdrawal } from '@/utils/api/withdrawals';
import { downloadWithdrawalReceipt } from '@/utils/api/withdrawals';
import * as FileSystem from 'expo-file-system/legacy';

const WithdrawalHistoryScreen = () => {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadHistory = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetchWithdrawals(token);
      setHistory(res.history || []);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [token]);

  const handleDownload = async (id: string) => {
    if (!token) {
      Alert.alert('Unauthorized', 'Please sign in to continue.');
      return;
    }
    setDownloadingId(id);
    try {
      const base64 = await downloadWithdrawalReceipt(token, id);
      const fileName = `Withdrawal-${id}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Share.share({
        url: fileUri,
        title: 'Withdrawal E-Receipt',
      });
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch (err: any) {
      Alert.alert('Download failed', err?.message || 'Unable to download receipt.');
    } finally {
      setDownloadingId(null);
    }
  };

  const renderItem = ({ item }: { item: Withdrawal }) => {
    const reason = item.note || 'Withdrawal request';
    const dateValue = item.status === 'completed' && item.processedAt ? item.processedAt : item.createdAt;
    const statusTitle = (item.status || '').charAt(0).toUpperCase() + (item.status || '').slice(1);
    const isCredited = item.status === 'completed';
  return (
    <View style={[styles.card, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
      <View style={styles.cardHeader}>
        <View style={styles.amountColumn}>
          <Text style={[styles.amount, { color: COLORS.black }]}>
            PKR {item.amount.toLocaleString()}
          </Text>
          {item.reference ? (
            <Text style={[styles.reference, { color: COLORS.black }]}>
              Reference #{item.reference}
            </Text>
          ) : null}
          <Text style={[styles.reason, { color: COLORS.black }]}>{reason}</Text>
          <Text style={[styles.date, { color: COLORS.black }]}>
            {new Date(dateValue).toLocaleDateString()}
          </Text>
        </View>
          <View style={[styles.statusPill, { backgroundColor: COLORS.black }]}>
            <Text style={[styles.status, { color: COLORS.white }]}>{statusTitle}</Text>
          </View>
        </View>
        {isCredited && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={[
                styles.downloadBtn,
                { backgroundColor: COLORS.black, opacity: downloadingId === item._id ? 0.7 : 1 },
              ]}
              onPress={() => handleDownload(item._id)}
              disabled={downloadingId === item._id}
            >
              {downloadingId === item._id ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={[styles.actionText, { color: COLORS.white }]}>Download E-Receipt</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Withdrawal History" />
        {loading ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={COLORS.primary} />
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24, gap: 12, marginTop: 12 }}
            ListEmptyComponent={
              <Text style={{ color: COLORS.black, marginTop: 12 }}>
                No withdrawals yet.
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amountColumn: {
    flex: 1,
    paddingRight: 12,
  },
  amount: {
    fontFamily: 'bold',
    fontSize: 20,
  },
  reference: {
    fontFamily: 'semiBold',
    fontSize: 12,
    marginTop: 8,
  },
  status: { fontFamily: 'semiBold', fontSize: 12 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  date: {
    fontFamily: 'regular',
    fontSize: 12,
    marginTop: 4,
  },
  reason: {
    fontFamily: 'regular',
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.grayscale200,
    marginVertical: 12,
  },
  downloadBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: {
    fontFamily: 'semiBold',
    fontSize: 14,
  },
});

export default WithdrawalHistoryScreen;
