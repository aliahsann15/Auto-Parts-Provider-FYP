import { View, Text, StyleSheet, ScrollView, Image, TouchableWithoutFeedback, Modal } from 'react-native';
import React, { useEffect, useState } from 'react';
import { COLORS, SIZES, illustrations } from '../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import Header from '../components/Header';
import Button from '../components/Button';
import { useTheme } from '../theme/ThemeProvider';
import ButtonFilled from '../components/ButtonFilled';
import { useNavigation } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

type Nav = {
    navigate: (value: string) => void
}

const Fingerprint = () => {
    const { navigate } = useNavigation<Nav>();
    const [isSupported, setIsSupported] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const { colors, dark } = useTheme();

    useEffect(() => {
        checkDeviceForFingerprint();
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            setModalVisible(true);
        }
    }, [isAuthenticated]);

    const checkDeviceForFingerprint = async () => {
        const isCompatible = await LocalAuthentication.hasHardwareAsync();
        setIsSupported(isCompatible);

        if (isCompatible) {
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            if (enrolled) {
                // If already enrolled, consider this step done
                setIsAuthenticated(true);
            }
        }
    };

    const authenticateUser = async () => {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate with your fingerprint',
            fallbackLabel: 'Enter Passcode',
        });

        if (result.success) {
            setIsAuthenticated(true);
        } else {
            // Handle authentication failure 
          
        }
    };


    // Render modal
    const renderModal = () => {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}>
                <TouchableWithoutFeedback
                    onPress={() => setModalVisible(false)}>
                    <View style={[styles.modalContainer]}>
                        <View style={[styles.modalSubContainer, {
                            backgroundColor: dark ? COLORS.dark2 : COLORS.secondaryWhite
                        }]}>
                           <Svg width={100} height={100} viewBox="0 0 24 24" fill="none">
                                             <Path
                                               d="M10.5 15.25C10.307 15.2353 10.1276 15.1455 9.99998 15L6.99998 12C6.93314 11.8601 6.91133 11.7029 6.93756 11.55C6.96379 11.3971 7.03676 11.2562 7.14643 11.1465C7.2561 11.0368 7.39707 10.9638 7.54993 10.9376C7.70279 10.9114 7.86003 10.9332 7.99998 11L10.47 13.47L19 5.00004C19.1399 4.9332 19.2972 4.91139 19.45 4.93762C19.6029 4.96385 19.7439 5.03682 19.8535 5.14649C19.9632 5.25616 20.0362 5.39713 20.0624 5.54999C20.0886 5.70286 20.0668 5.86009 20 6.00004L11 15C10.8724 15.1455 10.6929 15.2353 10.5 15.25Z"
                                               fill={COLORS.primary}
                                             />
                                             <Path
                                               d="M12 21C10.3915 20.9974 8.813 20.5638 7.42891 19.7443C6.04481 18.9247 4.90566 17.7492 4.12999 16.34C3.54037 15.29 3.17596 14.1287 3.05999 12.93C2.87697 11.1721 3.2156 9.39921 4.03363 7.83249C4.85167 6.26578 6.1129 4.9746 7.65999 4.12003C8.71001 3.53041 9.87134 3.166 11.07 3.05003C12.2641 2.92157 13.4719 3.03725 14.62 3.39003C14.7224 3.4105 14.8195 3.45215 14.9049 3.51232C14.9903 3.57248 15.0622 3.64983 15.116 3.73941C15.1698 3.82898 15.2043 3.92881 15.2173 4.03249C15.2302 4.13616 15.2214 4.2414 15.1913 4.34146C15.1612 4.44152 15.1105 4.53419 15.0425 4.61352C14.9745 4.69286 14.8907 4.75712 14.7965 4.80217C14.7022 4.84723 14.5995 4.87209 14.4951 4.87516C14.3907 4.87824 14.2867 4.85946 14.19 4.82003C13.2186 4.52795 12.1987 4.43275 11.19 4.54003C10.193 4.64212 9.22694 4.94485 8.34999 5.43003C7.50512 5.89613 6.75813 6.52088 6.14999 7.27003C5.52385 8.03319 5.05628 8.91361 4.77467 9.85974C4.49307 10.8059 4.40308 11.7987 4.50999 12.78C4.61208 13.777 4.91482 14.7431 5.39999 15.62C5.86609 16.4649 6.49084 17.2119 7.23999 17.82C8.00315 18.4462 8.88357 18.9137 9.8297 19.1953C10.7758 19.4769 11.7686 19.5669 12.75 19.46C13.747 19.3579 14.713 19.0552 15.59 18.57C16.4349 18.1039 17.1818 17.4792 17.79 16.73C18.4161 15.9669 18.8837 15.0864 19.1653 14.1403C19.4469 13.1942 19.5369 12.2014 19.43 11.22C19.4201 11.1169 19.4307 11.0129 19.461 10.9139C19.4914 10.8149 19.5409 10.7228 19.6069 10.643C19.6728 10.5631 19.7538 10.497 19.8453 10.4485C19.9368 10.3999 20.0369 10.3699 20.14 10.36C20.2431 10.3502 20.3471 10.3607 20.4461 10.3911C20.5451 10.4214 20.6372 10.471 20.717 10.5369C20.7969 10.6028 20.863 10.6839 20.9115 10.7753C20.9601 10.8668 20.9901 10.9669 21 11.07C21.1821 12.829 20.842 14.6026 20.0221 16.1695C19.2022 17.7363 17.9389 19.0269 16.39 19.88C15.3288 20.4938 14.1495 20.8755 12.93 21C12.62 21 12.3 21 12 21Z"
                                               fill={COLORS.primary}
                                             />
                                           </Svg>
                            <Text style={[styles.modalTitle, {
                                color: dark ? COLORS.white : COLORS.greyscale900
                            }]}>Congratulations!</Text>
                            <Text style={[styles.modalSubtitle, {
                                color: dark ? COLORS.grayTie : COLORS.greyscale900
                            }]}>Your account is ready to use. You will be redirected to the Home page in a few seconds..</Text>
                            <ButtonFilled
                                title="Continue"
                                onPress={() => {
                                    setModalVisible(false)
                                    navigate("chooseinterest")
                                }}
                                style={{
                                    width: "100%",
                                    marginTop: 12
                                }}
                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        )
    };

    return (
        <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Header title="Set Your Fingerprint" />
                <ScrollView
                    contentContainerStyle={{ alignItems: 'center' }}
                    showsVerticalScrollIndicator={false}>
                    <Text style={[styles.title, {
                        color: dark ? COLORS.white : COLORS.greyscale900
                    }]}>Add a fingerprint to make your account
                        more secure. </Text>
                    <Image
                        source={dark ? illustrations.fingerprintDark : illustrations.fingerprint}
                        resizeMode='contain'
                        style={styles.fingerprint}
                    />
                    <Text style={[styles.title, {
                        color: dark ? COLORS.white : COLORS.greyscale900
                    }]}>Please put your finger on the fingerprint
                        scanner to get started.</Text>
                </ScrollView>
            </View>
            <View style={styles.bottomContainer}>
                <Button
                    title="Skip"
                    style={{
                        width: (SIZES.width - 32) / 2 - 8,
                        borderRadius: 32,
                        backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
                        borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary
                    }}
                    textColor={dark ? COLORS.white : COLORS.black}
                    onPress={() => navigate("chooseinterest")}
                />
                <ButtonFilled
                    title="Continue"
                    style={styles.continueButton}
                    onPress={authenticateUser}
                />
            </View>
            {renderModal()}
        </SafeAreaView>
    )
};

const styles = StyleSheet.create({
    area: {
        flex: 1,
        backgroundColor: COLORS.white
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 16
    },
    title: {
        fontSize: 18,
        fontFamily: "medium",
        color: COLORS.greyscale900,
        textAlign: "center",
        marginVertical: 54
    },
    fingerprint: {
        width: 300,
        height: 300,
        marginVertical: 24
    },
    bottomContainer: {
        position: "absolute",
        bottom: 32,
        right: 16,
        left: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        width: SIZES.width - 32,
        alignItems: "center"
    },
    skipButton: {
        width: (SIZES.width - 32) / 2 - 8,
        borderRadius: 32,
        backgroundColor: "#F5E7FF",
        borderColor: "#F5E7FF"
    },
    continueButton: {
        width: (SIZES.width - 32) / 2 - 8,
        borderRadius: 32,
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: "bold",
        color: COLORS.black,
        textAlign: "center",
        marginVertical: 12
    },
    modalSubtitle: {
        fontSize: 16,
        fontFamily: "regular",
        color: COLORS.black2,
        textAlign: "center",
        marginVertical: 12
    },
    modalContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.6)"
    },
    modalSubContainer: {
        height: 330,
        width: SIZES.width * 0.9,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        padding: 16
    },
    modalIllustration: {
        height: 180,
        width: 180,
        marginVertical: 22,
    }
});

export default Fingerprint
