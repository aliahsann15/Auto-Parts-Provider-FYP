import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Alert, TouchableWithoutFeedback, Keyboard, DeviceEventEmitter } from 'react-native';
import React, { useState } from 'react';
import { COLORS, SIZES } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import { NavigationProp, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from './context/AuthContext';
import { createOffer } from '@/utils/api/offers';

const baseAmount = [
    {
        id: "1",
        amount: "174,500"
    },
    {
        id: "2",
        amount: "174,000"
    },
    {
        id: "3",
        amount: "173,500"
    },
    {
        id: "4",
        amount: "173,000"
    },
    {
        id: "5",
        amount: "172,500"
    },
    {
        id: "6",
        amount: "172,000"
    },
    {
        id: "7",
        amount: "171,500"
    },
    {
        id: "8",
        amount: "171,000"
    },
    {
        id: "9",
        amount: "170,500"
    }
]

type ParamList = {
  MakeOffer: { requestId?: string }
}

const MakeOffer = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const route = useRoute<RouteProp<ParamList, 'MakeOffer'>>();
    const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
    const [selectedAmount, setSelectedAmount] = useState("");
    const [warrantyValue, setWarrantyValue] = useState('');
    const [warrantyUnit, setWarrantyUnit] = useState<'days' | 'months' | 'years'>('days');
    const [returnDays, setReturnDays] = useState('');
    const [widthValue, setWidthValue] = useState('');
    const [lengthValue, setLengthValue] = useState('');
    const [heightValue, setHeightValue] = useState('');
    const { colors, dark } = useTheme();
    const { token } = useAuth();
    const requestId = (route.params as any)?.requestId;
    const isWarrantyEmpty = warrantyValue.trim().length === 0;
    const isReturnEmpty = returnDays.trim().length === 0;
    const isWidthEmpty = widthValue.trim().length === 0;
    const isLengthEmpty = lengthValue.trim().length === 0;
    const isHeightEmpty = heightValue.trim().length === 0;
    const isAmountEmpty = selectedAmount.trim().length === 0;
    const isButtonInactive =
      (step === 0 && isAmountEmpty) ||
      (step === 1 && isWarrantyEmpty) ||
      (step === 2 && isReturnEmpty) ||
      (step === 3 && (isWidthEmpty || isLengthEmpty || isHeightEmpty));
    const handleBackPress = () => {
      if (step > 0) {
        setStep(prev => ((prev - 1) as 0 | 1 | 2 | 3));
        return;
      }
      navigation.goBack();
    };

    const handleAmountSelection = (amount:string) => {
        setSelectedAmount(amount);
    };
    const handleSubmit = async () => {
      if (!token) {
        Alert.alert('Login required', 'Please login to send an offer.');
        navigation.navigate('login' as never);
        return;
      }
      if (!requestId) {
        Alert.alert('Missing request', 'Request not found for this offer.');
        return;
      }
      const numeric = Number(String(selectedAmount).replace(/[^\d.-]/g, ''));
      if (!numeric || Number.isNaN(numeric)) {
        Alert.alert('Invalid amount', 'Enter a valid amount.');
        return;
      }
      const warrantyText = warrantyValue.trim() ? `${warrantyValue.trim()} ${warrantyUnit}` : '';
      const returnWindow = returnDays.trim() ? Number(returnDays.trim()) : undefined;
      if (returnWindow !== undefined && (Number.isNaN(returnWindow) || returnWindow < 0)) {
        Alert.alert('Invalid return window', 'Enter a valid number of days for returns.');
        return;
      }
      const widthNum = widthValue.trim() ? Number(widthValue.trim()) : undefined;
      const lengthNum = lengthValue.trim() ? Number(lengthValue.trim()) : undefined;
      const heightNum = heightValue.trim() ? Number(heightValue.trim()) : undefined;
      if (
        widthNum === undefined ||
        lengthNum === undefined ||
        heightNum === undefined ||
        Number.isNaN(widthNum) ||
        Number.isNaN(lengthNum) ||
        Number.isNaN(heightNum) ||
        widthNum <= 0 ||
        lengthNum <= 0 ||
        heightNum <= 0
      ) {
        Alert.alert('Invalid dimensions', 'Enter valid numeric dimensions for width, length, and height.');
        return;
      }
      try {
        await createOffer({
          requestId,
          price: numeric,
          warranty: warrantyText || undefined,
          returnDays: returnWindow,
          dimensions: {
            width: widthNum,
            length: lengthNum,
            height: heightNum,
          },
        }, token);
        DeviceEventEmitter.emit('offer:created', { requestId });
        Alert.alert('Offer sent', 'Your quote was sent to the buyer.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Could not send offer');
      }
    };

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                      <Header
                      title={
                        step === 0
                          ? "Make an Offer"
                          : step === 1
                            ? "Add Warranty"
                            : step === 2
                              ? "Return Window"
                              : "Product Dimensions"
                      }
                      onBackPress={handleBackPress}
                    />
                    <View>
                      {step === 0 && (
                        <>
                          <Text style={[styles.title, {
                              color: dark ? COLORS.white : COLORS.greyscale900
                          }]}>Enter your offer amount for 1 unit</Text>
                          <TextInput
                              placeholder='e.g. 120,000'
                              placeholderTextColor={COLORS.greyscale600}
                              keyboardType="numeric"
                              style={[styles.input, {
                                  color: dark ? COLORS.secondaryWhite : COLORS.greyscale900,
                                  borderColor: dark ? COLORS.white : COLORS.primary,
                              }]}
                              value={selectedAmount}
                              onChangeText={setSelectedAmount}
                          />
                          <FlatList
                              data={baseAmount}
                              keyExtractor={item => item.id}
                              numColumns={3}
                              columnWrapperStyle={{ gap: 4 }}
                              style={{ marginVertical: 22 }}
                              renderItem={({ item }) => (
                                  <TouchableOpacity
                                      style={[styles.amountContainer, { 
                                          borderColor: dark ? COLORS.white : COLORS.primary,
                                      }]}
                                      onPress={() => handleAmountSelection(item.amount)}>
                                      <Text style={[styles.amount, { 
                                          color: dark ? COLORS.white : COLORS.primary,
                                      }]}>{item.amount}</Text>
                                  </TouchableOpacity>
                              )}
                          />
                        </>
                      )}
                      {step === 1 && (
                        <>
                          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                              Enter the number of days/months/years you offer warranty for this product.
                          </Text>
                          <View style={styles.warrantyRow}>
                            <View style={styles.warrantyUnits}>
                              {(['days', 'months', 'years'] as const).map(unit => (
                                <TouchableOpacity
                                  key={unit}
                                  style={[
                                    styles.unitChip,
                                    warrantyUnit === unit && styles.unitChipActive,
                                    { borderColor: dark ? COLORS.white : COLORS.greyscale900 },
                                  ]}
                                  onPress={() => setWarrantyUnit(unit)}
                                  activeOpacity={0.8}
                                >
                                  <Text
                                    style={[
                                      styles.unitText,
                                      {
                                        color:
                                          warrantyUnit === unit
                                            ? COLORS.white
                                            : dark
                                              ? COLORS.secondaryWhite
                                              : COLORS.greyscale900,
                                      },
                                    ]}
                                  >
                                    {unit}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <TextInput
                              placeholder='e.g. 6'
                              placeholderTextColor={COLORS.gray}
                              keyboardType='numeric'
                              style={[
                                styles.input,
                                {
                                  color: dark ? COLORS.secondaryWhite : COLORS.greyscale900,
                                  borderColor: dark ? COLORS.white : COLORS.primary,
                                  backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                                  height: 112,
                                },
                              ]}
                              value={warrantyValue}
                              onChangeText={setWarrantyValue}
                              returnKeyType="done"
                              onSubmitEditing={Keyboard.dismiss}
                              selectionColor={COLORS.primary}
                              keyboardAppearance={dark ? 'dark' : 'light'}
                            />
                          </View>
                        </>
                      )}
                      {step === 2 && (
                        <>
                          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                              Enter the number of days you offer return and exchange window for this product.
                          </Text>
                          <View style={styles.warrantyRow}>
                            <TextInput
                                placeholder='e.g. 7'
                                placeholderTextColor={COLORS.gray}
                                keyboardType='numeric'
                                style={[
                                  styles.input,
                                  {
                                    color: dark ? COLORS.secondaryWhite : COLORS.greyscale900,
                                    borderColor: dark ? COLORS.white : COLORS.primary,
                                    backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                                    height: 112,
                                  },
                                ]}
                                value={returnDays}
                                onChangeText={setReturnDays}
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                selectionColor={COLORS.primary}
                                keyboardAppearance={dark ? 'dark' : 'light'}
                            />
                          </View>
                        </>
                      )}
                      {step === 3 && (
                        <>
                          <Text style={[styles.title, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>
                            Provide the product dimensions (in inches) so we can calculate shipping accurately.
                          </Text>
                          <View style={styles.dimensionGrid}>
                            <View style={styles.dimensionInputWrapper}>
                              <TextInput
                                placeholder='Width (in)'
                                placeholderTextColor={COLORS.gray}
                                keyboardType='numeric'
                                style={[
                                  styles.dimensionInput,
                                  {
                                    color: dark ? COLORS.secondaryWhite : COLORS.greyscale900,
                                    borderColor: dark ? COLORS.white : COLORS.primary,
                                    backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                                  },
                                ]}
                                value={widthValue}
                                onChangeText={setWidthValue}
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                selectionColor={COLORS.primary}
                                keyboardAppearance={dark ? 'dark' : 'light'}
                              />
                            </View>
                            <View style={styles.dimensionInputWrapper}>
                              <TextInput
                                placeholder='Length (in)'
                                placeholderTextColor={COLORS.gray}
                                keyboardType='numeric'
                                style={[
                                  styles.dimensionInput,
                                  {
                                    color: dark ? COLORS.secondaryWhite : COLORS.greyscale900,
                                    borderColor: dark ? COLORS.white : COLORS.primary,
                                    backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                                  },
                                ]}
                                value={lengthValue}
                                onChangeText={setLengthValue}
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                selectionColor={COLORS.primary}
                                keyboardAppearance={dark ? 'dark' : 'light'}
                              />
                            </View>
                            <View style={styles.dimensionInputWrapper}>
                              <TextInput
                                placeholder='Height (in)'
                                placeholderTextColor={COLORS.gray}
                                keyboardType='numeric'
                                style={[
                                  styles.dimensionInput,
                                  {
                                    color: dark ? COLORS.secondaryWhite : COLORS.greyscale900,
                                    borderColor: dark ? COLORS.white : COLORS.primary,
                                    backgroundColor: dark ? COLORS.dark1 : COLORS.white,
                                  },
                                ]}
                                value={heightValue}
                                onChangeText={setHeightValue}
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                selectionColor={COLORS.primary}
                                keyboardAppearance={dark ? 'dark' : 'light'}
                              />
                            </View>
                          </View>
                        </>
                      )}
                      <ButtonFilled
                          title={step === 3 ? "Submit Offer" : "Continue"}
                          onPress={() => {
                            if (step === 0) {
                              const numeric = Number(String(selectedAmount).replace(/[^\d.-]/g, ''));
                              if (!numeric || Number.isNaN(numeric)) {
                                Alert.alert('Invalid amount', 'Enter a valid amount.');
                                return;
                              }
                              setStep(1);
                            } else if (step === 1) {
                              if (isWarrantyEmpty) {
                                Alert.alert('Missing input', 'Please enter the input warranty time.');
                                return;
                              }
                              setStep(2);
                            } else if (step === 2) {
                              if (isReturnEmpty) {
                                Alert.alert('Missing input', 'Please enter the return window.');
                                return;
                              }
                              setStep(3);
                            } else {
                              if (isWidthEmpty || isLengthEmpty || isHeightEmpty) {
                                Alert.alert('Missing input', 'Please enter all product dimensions.');
                                return;
                              }
                              handleSubmit();
                            }
                          }}
                          disabled={isButtonInactive}
                          style={[
                            !isButtonInactive
                              ? { backgroundColor: COLORS.black, borderColor: COLORS.black }
                              : { backgroundColor: COLORS.white, borderColor: COLORS.black },
                            isButtonInactive ? { opacity: 0.5 } : {},
                          ]}
                          textColor={isButtonInactive ? COLORS.black : COLORS.white}
                      />
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    )
};

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    smallInput: {
        width: SIZES.width - 32,
        // height: 56,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: COLORS.primary,
        paddingHorizontal: 16,
        fontSize: 16,
        fontFamily: 'regular',
        color: COLORS.greyscale900,
        marginBottom: 16,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 16
    },
    title: {
        fontSize: 15,
        fontFamily: "medium",
        color: COLORS.black,
        marginLeft: 12,
        marginVertical: 32,
        textAlign: "center"
    },
    input: {
        width: SIZES.width - 32,
        height: 112,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: COLORS.primary,
        alignItems: "center",
        justifyContent: "center",
        fontSize: 48,
        fontFamily: "extraBold",
        color: COLORS.greyscale900,
        textAlign: "center"
    },
    amountContainer: {
        width: (SIZES.width - 48) / 3,
        height: 42,
        borderRadius: 36,
        alignItems: "center",
        justifyContent: "center",
        borderColor: COLORS.primary,
        borderWidth: 2,
        marginBottom: 12
    },
    amount: {
        fontSize: 16,
        fontFamily: "bold",
        color: COLORS.primary,
        textAlign: "center"
    },
    warrantyRow: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        marginBottom: 24,
    },
    warrantyNumber: {
        flex: 1,
        width: "100%",
        paddingVertical: 24,
        borderRadius: 16,
        borderWidth: 2,
        paddingHorizontal: 16,
        fontSize: 18,
        fontFamily: 'medium',
        backgroundColor: COLORS.white,
        color: COLORS.black
    },
    warrantyUnits: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
        width: '100%',
    },
    unitChip: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    unitChipActive: {
        backgroundColor: COLORS.black,
    },
    unitText: {
        fontFamily: 'semiBold',
        textTransform: 'capitalize',
    },
    dimensionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        marginBottom: 24,
    },
    dimensionInputWrapper: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    dimensionInput: {
        width: '100%',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: COLORS.primary,
        fontSize: 16,
        fontFamily: 'medium',
        paddingHorizontal: 12,
        paddingVertical: 12,
        textAlign: 'center',
    },
    })

export default MakeOffer
