import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { format } from 'date-fns';
import Header from '@/components/Header';
import { COLORS } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { BarChart } from 'react-native-chart-kit';
import { useAuth } from '@/app/context/AuthContext';
import { fetchSellerOrderInsights, OrderInsightPoint } from '@/utils/api/orders';

type FilterKey = 'today' | '7d' | '30d' | 'custom';
type PickerKey = 'start' | 'end' | null;

const CHART_HEIGHT = 320;
const MIN_CHART_WIDTH = 360;
const BAR_SLOT_WIDTH = 90;
const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const startOfDayLocal = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDaysLocal = (d: Date, days: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const parseLocalDate = (dateStr: string) => {
  const [y, m, day] = dateStr.split('-').map(v => Number(v));
  return new Date(y, (m || 1) - 1, day || 1);
};

const OrderInsightsScreen = () => {
  const { colors, dark } = useTheme();
  const { token } = useAuth();
  const [filter, setFilter] = useState<FilterKey>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [picker, setPicker] = useState<PickerKey>(null);
  const [points, setPoints] = useState<OrderInsightPoint[]>([]);
  const [summary, setSummary] = useState<{ completed: number; pending: number; cancelled: number }>({ completed: 0, pending: 0, cancelled: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    if (filter === 'custom' && (!customStart || !customEnd)) return;
    setLoading(true);
    setError(null);
    try {
      const today = startOfDayLocal(new Date());
        const endDate = filter === 'custom' && customEnd ? startOfDayLocal(parseLocalDate(customEnd)) : today;
        const days = filter === 'today' ? 1 : filter === '7d' ? 7 : 30;
        const startDate =
          filter === 'custom' && customStart
            ? startOfDayLocal(parseLocalDate(customStart))
            : startOfDayLocal(addDaysLocal(endDate, -(days - 1)));

      const params =
        filter === 'custom'
          ? { startDate: customStart, endDate: customEnd }
          : { days };
      const res = await fetchSellerOrderInsights(token, params);
      const pointMap = new Map<string, OrderInsightPoint>();
      (res.points || []).forEach(p => pointMap.set(p.date, p));

      const filled: OrderInsightPoint[] = [];
      for (let cursor = startDate; cursor <= endDate; cursor = addDaysLocal(cursor, 1)) {
        const key = format(cursor, 'yyyy-MM-dd');
        const existing = pointMap.get(key);
        filled.push({
          date: key,
          completed: existing?.completed ?? 0,
          pending: existing?.pending ?? 0,
          cancelled: existing?.cancelled ?? 0,
        });
      }

      setPoints(filled);
      setSummary(res.summary || { completed: 0, pending: 0, cancelled: 0 });
    } catch (err: any) {
      setError(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token, filter, customStart, customEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(points.length * BAR_SLOT_WIDTH, Math.max(screenWidth - 32, MIN_CHART_WIDTH));
  const labels = points.map(d => {
    const dt = parseLocalDate(d.date);
    const day = dt.toLocaleDateString('en-US', { weekday: 'short' });
    const date = `${dt.getDate()} ${monthShort[dt.getMonth()]}`;
    return `${day}\n${date}`;
  });
  const totalPerDay = points.map(d => d.completed + d.pending + d.cancelled);
  const chartData = {
    labels: labels.length ? labels : [''],
    datasets: [
      {
        data: totalPerDay.length ? totalPerDay : [0],
        color: () => '#000000',
        flatColor: true,
      },
    ],
  };

  const totalCompleted = summary.completed || 0;
  const totalPending = summary.pending || 0;
  const totalCancelled = summary.cancelled || 0;

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Order Insights" />

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, borderColor: dark ? COLORS.greyscale300 : COLORS.grayscale200 }]}>
            <Text style={[styles.summaryLabel, { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }]}>Completed Orders</Text>
            <Text style={[styles.summaryValue, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{totalCompleted}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, borderColor: dark ? COLORS.greyscale300 : COLORS.grayscale200 }]}>
            <Text style={[styles.summaryLabel, { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }]}>Pending Orders</Text>
            <Text style={[styles.summaryValue, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{totalPending}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, borderColor: dark ? COLORS.greyscale300 : COLORS.grayscale200 }]}>
            <Text style={[styles.summaryLabel, { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }]}>Cancelled Orders</Text>
            <Text style={[styles.summaryValue, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>{totalCancelled}</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(['today', '7d', '30d', 'custom'] as FilterKey[]).map(key => (
            <TouchableOpacity
              key={key}
              onPress={() => setFilter(key)}
              style={[
                styles.chip,
                filter === key && { backgroundColor: COLORS.black, borderColor: COLORS.black },
              ]}
            >
              <Text style={[styles.chipText, filter === key && { color: COLORS.white }]}>
                {key === 'today'
                  ? 'Today'
                  : key === '7d'
                  ? 'Last 7 days'
                  : key === '30d'
                  ? 'Last 30 days'
                  : 'Custom'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filter === 'custom' && (
          <View style={styles.customRow}>
            <TouchableOpacity style={[styles.dateBtn, { borderColor: dark ? COLORS.greyscale300 : COLORS.greyscale300 }]} onPress={() => setPicker('start')}>
              <Text style={[styles.dateText, { color: customStart ? (dark ? COLORS.white : COLORS.greyscale900) : COLORS.greyscale600 }]}>
                {customStart ? format(new Date(customStart), 'dd MMM yyyy') : 'From date'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.toText, { color: dark ? COLORS.greyscale300 : COLORS.grayscale700 }]}>to</Text>
            <TouchableOpacity style={[styles.dateBtn, { borderColor: dark ? COLORS.greyscale300 : COLORS.greyscale300 }]} onPress={() => setPicker('end')}>
              <Text style={[styles.dateText, { color: customEnd ? (dark ? COLORS.white : COLORS.greyscale900) : COLORS.greyscale600 }]}>
                {customEnd ? format(new Date(customEnd), 'dd MMM yyyy') : 'To date'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <DateTimePickerModal
          isVisible={picker !== null}
          mode="date"
          onConfirm={(date: Date) => {
            const iso = format(date, 'yyyy-MM-dd');
            if (picker === 'start') setCustomStart(iso);
            if (picker === 'end') setCustomEnd(iso);
            setPicker(null);
          }}
          onCancel={() => setPicker(null)}
        />

        <View style={[styles.cardShell, { backgroundColor: dark ? COLORS.dark2 : COLORS.white, borderColor: dark ? COLORS.greyscale300 : COLORS.grayscale200 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingHorizontal: 8 }}>
            {loading && (
              <ActivityIndicator style={{ marginLeft: 12 }} color={dark ? COLORS.white : COLORS.greyscale900} />
            )}
            {error && !loading && (
              <Text style={{ color: 'red', paddingHorizontal: 8, paddingBottom: 6 }}>{error}</Text>
            )}
            <BarChart
              data={chartData}
              width={chartWidth}
              height={CHART_HEIGHT}
              fromZero
              yAxisLabel=""
              yAxisSuffix=""
               yLabelsOffset={40}
              withInnerLines
              showValuesOnTopOfBars
              chartConfig={{
                backgroundColor: colors.background,
                backgroundGradientFrom: colors.background,
                backgroundGradientTo: colors.background,
                decimalPlaces: 0,
                color: (opacity = 1) => (dark ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`),
                fillShadowGradientFrom: '#000000',
                fillShadowGradientTo: '#000000',
                fillShadowGradientOpacity: 1,
                fillShadowGradientFromOpacity: 1,
                fillShadowGradientToOpacity: 1,
                labelColor: (opacity = 1) => (dark ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`),
                propsForBackgroundLines: { stroke: dark ? COLORS.grayscale400 : COLORS.greyscale300 },
                propsForLabels: { fontFamily: 'medium', fontSize: 11 },
              }}
              style={{ borderRadius: 12 }}
              verticalLabelRotation={0}
              showBarTops
            />
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryLabel: { fontFamily: 'medium', fontSize: 12 },
  summaryValue: { fontFamily: 'bold', fontSize: 15, marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    backgroundColor: COLORS.white,
  },
  chipText: { fontFamily: 'medium', fontSize: 13, color: COLORS.greyscale900 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  dateBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateText: { fontFamily: 'medium', fontSize: 13 },
  toText: { fontFamily: 'regular', fontSize: 13 },
  cardShell: {
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 0,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});

export default OrderInsightsScreen;
