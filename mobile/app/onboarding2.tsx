// screens/Onboarding2.tsx
import React from "react";
import { View, Text, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PageContainer from "../components/PageContainer";
import Onboarding1Styles from "../styles/OnboardingStyles";
import { COLORS, illustrations } from "../constants";
import { useTheme } from "../theme/ThemeProvider";
import DotsView from "@/components/DotsView";
import ButtonFilled from "@/components/ButtonFilled";
import ButtonOutlined from "@/components/ButtonOutlined";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

const Onboarding2 = () => {
  const router = useRouter();
  const { colors, dark } = useTheme();

  return (
    <SafeAreaView style={[Onboarding1Styles.container, { backgroundColor: colors.background }]}>
      <PageContainer>
        <View style={Onboarding1Styles.contentContainer}>
          <Image
            source={illustrations.onboarding2}
            resizeMode="contain"
            style={Onboarding1Styles.illustration}
          />

          <View style={Onboarding1Styles.buttonContainer}>
            <View style={Onboarding1Styles.titleContainer}>
              <Text style={[Onboarding1Styles.title, { color: colors.text }]}>
                All your desired
              </Text>
              <Text
                style={[
                  Onboarding1Styles.subTitle,
                  { color: dark ? COLORS.white : COLORS.primary },
                ]}
              >
                Auto Parts
              </Text>
            </View>

            <Text style={[Onboarding1Styles.description, { color: colors.text }]}>
              We provide you with high-quality auto parts tailored to your needs.
              Our platform simplifies the process of finding your desired auto part.
            </Text>

            {/* Always render exactly one filled dot out of three */}
            <View style={Onboarding1Styles.dotsContainer}>
              <DotsView progress={1/3} numDots={3} />
            </View>

            <ButtonFilled
              title="Next"
              onPress={() => router.replace('onboarding3' as any)}
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

export default Onboarding2;
