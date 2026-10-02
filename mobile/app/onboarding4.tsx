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
import { useNavigation, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Nav = {
    navigate: (value: string) => void
}

const Onboarding4 = () => {
    const { navigate } = useNavigation<Nav>();
    const router = useRouter();
    const [progress, setProgress] = useState(0);
    const { colors, dark } = useTheme();

    // add useEffect
   

    useEffect(() => {
        if (progress >= 1) {
            // Navigate to the welcome screen
            navigate('welcome')
        }
    }, [progress, navigate]);

    return (
        <SafeAreaView style={[Onboarding1Styles.container, { backgroundColor: colors.background }]}>
            <PageContainer>
                <View style={Onboarding1Styles.contentContainer}>
                    <Image
                        source={illustrations.onboarding7}
                        resizeMode="contain"
                        style={Onboarding1Styles.illustration}
                    />
                    <View style={[Onboarding1Styles.buttonContainer, {
                        backgroundColor: colors.background
                    }]}>
                        <View style={Onboarding1Styles.titleContainer}>
                            <Text style={[Onboarding1Styles.title, { color: colors.text }]}>Right Auto Part</Text>
                            <Text style={[Onboarding1Styles.subTitle, {
                                color: dark ? COLORS.white : COLORS.primary
                            }]}>GUARANTEED</Text>
                        </View>

                        <Text style={[Onboarding1Styles.description, { color: colors.text }]}>
                        Tested by experts engineers and backed by a 100% warranty.
                        </Text>

                        <View style={Onboarding1Styles.dotsContainer}>
                            {progress < 1 && <DotsView progress={3/3} numDots={3} />}
                        </View>
                        <ButtonFilled
                            title="Next"
                            onPress={async () => {
                                try { await AsyncStorage.setItem('hasSeenOnboarding', 'true'); } catch {}
                                router.replace('(tabs)' as any);
                            }}
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

export default Onboarding4;