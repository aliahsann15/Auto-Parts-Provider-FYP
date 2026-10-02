import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { COLORS, SIZES } from '@/constants';
import { useTheme } from '@/theme/ThemeProvider';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

const WithdrawalRequestedScreen = () => {
  const { colors, dark } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Withdrawal Requested" />
        <View style={[styles.card, { backgroundColor: dark ? COLORS.dark2 : COLORS.white }]}>
          <View style={[styles.illustration, { backgroundColor: COLORS.tansparentPrimary }]}>
            <Ionicons name="checkmark-done" size={48} color={COLORS.primary} />
          </View>
          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Congratulations!
          </Text>
          <Text style={[styles.body, { color: dark ? COLORS.grayscale200 : COLORS.grayscale700 }]}>
            Your withdrawal request has been sent to support. It may take 2–3 business days to clear your balance into your business bank account.
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: COLORS.primary }]}
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'withdrawals' as never }],
              })
            }
          >
            <Text style={{ color: COLORS.white, fontFamily: 'bold', fontSize: 16 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: { flex: 1 },
  container: { flex: 1, padding: 16 },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.grayscale200,
    alignItems: 'center',
  },
  title: { fontFamily: 'bold', fontSize: 20, marginBottom: 8 },
  body: { fontFamily: 'regular', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  doneBtn: {
    marginTop: 18,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    width: SIZES.width - 96,
  },
});

export default WithdrawalRequestedScreen;
