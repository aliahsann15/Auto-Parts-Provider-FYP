import { View, Text, StyleSheet, Image, TouchableOpacity, ImageBackground } from 'react-native';
import React, { useState } from 'react';
import { COLORS, SIZES, icons, images } from '../constants';
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NavigationProp } from '@react-navigation/native';
import { useNavigation } from 'expo-router';

// Video call screen
const VideoCall = () => {
    const navigation = useNavigation<NavigationProp<any>>();
    const [volumeOff, setVolumeOff] = useState(false);
    const [microOff, setMicroOff] = useState(false);
    const [videoOff, setVideoOff] = useState(false);

    return (
        <ImageBackground
            source={images.backgroundAvatar2}
            resizeMode='cover'
            style={styles.container}>
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backBtn}>
                <Image
                    source={icons.back}
                    resizeMode='contain'
                    style={styles.arrowBackIcon}
                />
            </TouchableOpacity>
            <Image
                source={images.user3}
                resizeMode='cover'
                style={styles.avatar}
            />
            <View style={styles.bottomContainer}>
                <Text style={styles.duration}>02:25 mins</Text>
                <View style={styles.bottomView}>
                    <TouchableOpacity
                        onPress={() => setVolumeOff(!volumeOff)}
                        style={styles.actionBtn}>
                        <Ionicons name={volumeOff ? "volume-mute" : "volume-medium"} size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setVideoOff(!videoOff)}
                        style={styles.actionBtn}>
                        <Ionicons name={videoOff ? "videocam-off" : "videocam"} size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setMicroOff(!microOff)}
                        style={styles.actionBtn}>
                        <MaterialCommunityIcons name={microOff ? "microphone-off" : "microphone"} size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={[styles.actionBtn, {
                            backgroundColor: "#F75555"
                        }]}>
                        <MaterialCommunityIcons name="phone-remove" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </View>
        </ImageBackground>
    )
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    avatar: {
        height: 172,
        width: 122,
        borderRadius: 24,
        position: "absolute",
        bottom: 150,
        right: 18
    },
    driverName: {
        fontSize: 26,
        fontWeight: "bold",
        color: COLORS.white,
        marginVertical: 12
    },
    duration: {
        fontSize: 14,
        color: COLORS.white,
        fontFamily: "regular",
        marginBottom: 22
    },
    backBtn: {
        position: "absolute",
        left: 22,
        top: 22
    },
    arrowBackIcon: {
        height: 24,
        width: 24,
        tintColor: COLORS.white
    },
    bottomContainer: {
        position: "absolute",
        bottom: 36,
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: SIZES.width - 32,
        height: 72
    },
    bottomView: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        width: SIZES.width - 32,
    },
    actionBtn: {
        height: 58,
        width: 58,
        borderRadius: 26,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255,.4)",
        marginHorizontal: 12
    }
})

export default VideoCall