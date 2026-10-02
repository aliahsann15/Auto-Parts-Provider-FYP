import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Header from '../components/Header';
import { COLORS, SIZES } from '../constants';
import { useTheme } from '../theme/ThemeProvider';

const RefundPolicy = () => {
  const { colors, dark } = useTheme();

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Refund Policy" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Returns & Refunds
          </Text>
          <Text style={[styles.paragraph, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
            We follow a straightforward parts-return policy similar to major auto parts retailers:
          </Text>
          <Text style={[styles.bullet, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            • Unused parts in original packaging can be returned within 14 days of delivery.
          </Text>
          <Text style={[styles.bullet, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            • Electrical items must be unopened and are subject to inspection before refund approval.
          </Text>
          <Text style={[styles.bullet, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            • Proof of purchase is required; freight/installation costs are non-refundable.
          </Text>
          <Text style={[styles.bullet, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            • Refunds are issued to the original payment method once the part is received and verified.
          </Text>

          <Text style={[styles.title, { marginTop: 20, color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            Refund Timelines
          </Text>
          <Text style={[styles.paragraph, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
            Cancelled orders and approved returns are typically reversed to your account in 7–10 working days. Processing times may vary by bank/card provider.
          </Text>

          <Text style={[styles.title, { marginTop: 20, color: dark ? COLORS.white : COLORS.greyscale900 }]}>
            How to start a return
          </Text>
          <Text style={[styles.paragraph, { color: dark ? COLORS.grayscale400 : COLORS.grayscale700 }]}>
            Contact support with your order number and details about the part. We’ll share the return instructions and track the refund for you.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'bold',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: 'regular',
    marginBottom: 10,
    lineHeight: 20,
  },
  bullet: {
    fontSize: 14,
    fontFamily: 'regular',
    marginBottom: 8,
  },
});

export default RefundPolicy;
