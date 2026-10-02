import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import React, { useState } from 'react';
import { ScrollView } from 'react-native-virtualized-view';
import { COLORS, SIZES } from "../constants";
import { SafeAreaView } from 'react-native-safe-area-context';
import ReasonItem from '../components/ReasonItem';
import Header from '../components/Header';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import { useNavigation, router } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import { cancelOrderRequest } from '@/utils/api/orders';
import { useAuth } from './context/AuthContext';

const CancelOrder = () => {
  const navigation = useNavigation();
  const { colors, dark } = useTheme();
  const route = useRoute();
  const { token } = useAuth();
  const orderId = (route.params as any)?.orderId as string | undefined;
  const orderTitle = (route.params as any)?.orderTitle as string | undefined;
  const [comment, setComment] = useState("");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /***
   * Render content
  */
  const renderContent = () => {
    const handleCheckboxPress = (itemTitle:any) => {
      if (selectedItem === itemTitle) {
        setSelectedItem(null);
      } else {
        setSelectedItem(itemTitle);
      }
    };

    return (
      <View style={{ marginVertical: 12 }}>
        <Text style={[styles.inputLabel, {
          color: dark ? COLORS.grayscale100 : COLORS.greyscale900
        }]}>Please select the reason for the cancellations</Text>
        <View style={{ marginVertical: 16 }}>
          <ReasonItem
            checked={selectedItem === 'Ordered by mistake'}
            onPress={() => handleCheckboxPress('Ordered by mistake')}
            title="Ordered by mistake"
          />
          <ReasonItem
            checked={selectedItem === 'Found a better price'}
            onPress={() => handleCheckboxPress('Found a better price')}
            title="Found a better price"
          />
          <ReasonItem
            checked={selectedItem === 'Delivery taking too long'}
            onPress={() => handleCheckboxPress('Delivery taking too long')}
            title="Delivery taking too long"
          />
          <ReasonItem
            checked={selectedItem === 'Need to change address or details'}
            onPress={() => handleCheckboxPress('Need to change address or details')}
            title="Need to change address or details"
          />
          <ReasonItem
            checked={selectedItem === 'Issue with payment method'}
            onPress={() => handleCheckboxPress('Issue with payment method')}
            title="Issue with payment method"
          />
          <ReasonItem
            checked={selectedItem === 'Something else'}
            onPress={() => handleCheckboxPress('Something else')}
            title="Something else"
          />
        </View>
        <Text style={[styles.inputLabel, {
          color: dark ? COLORS.grayscale100 : COLORS.greyscale900
        }]}>Add detailed reason</Text>
        <TextInput
          style={[styles.input, {
            color: dark ? COLORS.secondaryWhite : COLORS.greyscale900,
            borderColor: dark ? COLORS.grayscale100 : COLORS.greyscale900
          }]}
          placeholder="Write your reason here..."
          placeholderTextColor={dark ? COLORS.secondaryWhite : COLORS.greyscale900}
          multiline={true}
          numberOfLines={4} // Set the number of lines you want to display initially
          value={comment}
          onChangeText={setComment}
        />
      </View>
    )
  }

  /**
      * Render submit buttons
      */
  const renderSubmitButton = () => {
    return (
      <View style={[styles.btnContainer, {
        backgroundColor: colors.background
      }]}>
        <ButtonFilled
          title={submitting ? "Submitting..." : "Submit"}
          style={styles.submitBtn}
          disabled={submitting}
          onPress={async () => {
            if (!orderId) {
              Alert.alert('Missing order', 'Could not determine which order to cancel.');
              return;
            }
            if (!token) {
              Alert.alert('Login required', 'Please sign in to cancel the order.');
              return;
            }
            if (!selectedItem && !comment.trim()) {
              Alert.alert('Select a reason', 'Please choose a reason or add a note.');
              return;
            }
            try {
              setSubmitting(true);
              await cancelOrderRequest(token, orderId, {
                reason: selectedItem || undefined,
                comment: comment.trim() || undefined,
              });
              router.replace({ pathname: "/cancelorderpaymentmethods", params: { orderId, orderTitle } });
            } catch (err: any) {
              Alert.alert('Cancel failed', err?.message || 'Unable to cancel order right now.');
            } finally {
              setSubmitting(false);
            }
          }}
        />
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Cancel Order" />
        <ScrollView
          showsVerticalScrollIndicator={false}
        >
          {renderContent()}
        </ScrollView>
      </View>
      {renderSubmitButton()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: COLORS.white
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 12
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
    alignItems: "center"
  },
  headerIcon: {
    height: 50,
    width: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: COLORS.gray
  },
  arrowLeft: {
    height: 24,
    width: 24,
    tintColor: COLORS.black
  },
  moreIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.black
  },
  input: {
    borderColor: "gray",
    borderWidth: .3,
    borderRadius: 5,
    width: "100%",
    padding: 10,
    paddingBottom: 10,
    fontSize: 12,
    height: 150,
    textAlignVertical: "top"
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: "medium",
    color: COLORS.black,
    marginBottom: 6,
    marginTop: 16
  },
  btnContainer: {
    position: "absolute",
    bottom: 22,
    height: 72,
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    alignItems: "center"
  },
  btn: {
    height: 48,
    width: SIZES.width - 32,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8
  },
  submitBtn: {
    width: SIZES.width - 32,
  },
  btnText: {
    fontSize: 16,
    fontFamily: "medium",
    color: COLORS.white
  },
})

export default CancelOrder
