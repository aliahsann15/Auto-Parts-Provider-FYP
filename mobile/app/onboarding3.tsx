import React, { useState, useEffect } from 'react';
import { View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PageContainer from '../components/PageContainer';
import DotsView from '../components/DotsView';
import Onboarding1Styles from '../styles/OnboardingStyles';
import { COLORS, illustrations } from '../constants';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import ButtonOutlined from '../components/ButtonOutlined';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Onboarding3 = () => {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const { colors, dark } = useTheme();
  

  useEffect(() => {
    if (progress >= 1) {
      // replace to the onboarding4 screen (prevent back navigation)
      router.replace('onboarding4' as any);
    }
  }, [progress, router]);

  return (
    <SafeAreaView style={[Onboarding1Styles.container, { backgroundColor: colors.background }]}>
      <PageContainer>
        <View style={Onboarding1Styles.contentContainer}>
          <Image
            source={illustrations.onboarding3}
            resizeMode="contain"
            style={Onboarding1Styles.illustration}
          />
          <View style={[Onboarding1Styles.buttonContainer, {
            backgroundColor: colors.background
          }]}>
            <View style={Onboarding1Styles.titleContainer}>
              <Text style={[Onboarding1Styles.title, { color: colors.text }]}>Select What Auto Parts You</Text>
              <Text style={[Onboarding1Styles.subTitle, { 
                color: dark? COLORS.white : COLORS.primary
              }]}>Need</Text>
            </View>

            <Text style={[Onboarding1Styles.description, { color: colors.text }]}>
              Your statisfaction is our number one priority. Find the best deals on the Auto Parts which you are trying to find from long ago
            </Text>

            <View style={Onboarding1Styles.dotsContainer}>
              {progress < 1 && <DotsView progress={2/3} numDots={3} />}
            </View>
            <ButtonFilled
              title="Next"
              onPress={() => router.replace('onboarding4' as any)}
              style={Onboarding1Styles.nextButton}
            />
            <ButtonOutlined
              title="Skip"
              onPress={async () => {
                try { await AsyncStorage.setItem('hasSeenOnboarding', 'true'); } catch {}
                router.replace('(tabs)' as any);
              }}
              style={Onboarding1Styles.skipButton}
            />
          </View>
        </View>
      </PageContainer>
    </SafeAreaView>
  );
};

export default Onboarding3;