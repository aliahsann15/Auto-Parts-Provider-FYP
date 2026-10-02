import { View, Text, StyleSheet, TouchableOpacity, Image, ImageSourcePropType, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-virtualized-view';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { COLORS, icons, images, SIZES } from '@/constants';
import { launchImagePicker } from '@/utils/ImagePickerHelper';
import SettingsItem from '@/components/SettingsItem';
import { useNavigation } from 'expo-router';
import Button from '@/components/Button';
import ButtonFilled from '@/components/ButtonFilled';
import RBSheet from "react-native-raw-bottom-sheet";
import { NavigationProp } from '@react-navigation/native';
import { useAuth } from '@/app/context/AuthContext';
import { uploadProfileImage, updateUserProfile as apiUpdateUserProfile } from '@/utils/api/user';
import { router } from 'expo-router';


type Nav = {
  navigate: (value: string) => void
}

const Profile = () => {
  const refRBSheet = useRef<any>(null);
  const { dark, colors, setScheme } = useTheme();
  const { navigate } = useNavigation<Nav>();
  const navigation = useNavigation<NavigationProp<any>>();
  const { logout, user, token, updateUserProfile: updateAuthUser } = useAuth();
  const [localImage, setLocalImage] = useState<ImageSourcePropType | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  /**
   * Render header
   */
  const renderHeader = () => {
    return (
      <TouchableOpacity style={styles.headerContainer} onPress={() => navigation.goBack()}>
        <View style={styles.headerLeft}>
          <Image
            source={icons.back}
            resizeMode='contain'
            style={styles.logo}
          />
          <Text style={[styles.headerTitle, {
            color: dark ? COLORS.white : COLORS.greyscale900
          }]}>Profile</Text>
        </View>
        <View style={{ width: 24, height: 24 }} />
      </TouchableOpacity>
    )
  }
  const pickImage = useCallback(async () => {
    try {
      const tempUri = await launchImagePicker();
      if (!tempUri) return;
      setLocalImage({ uri: tempUri });
      if (!user?.id || !token) {
        alert('Please sign in to update your photo.');
        return;
      }
      setUploadingAvatar(true);
      try {
        const uploadedUrl = await uploadProfileImage(tempUri, token);
        const updated = await apiUpdateUserProfile(user.id, { profileImage: uploadedUrl }, token);
        await updateAuthUser(updated);
        setLocalImage({ uri: uploadedUrl });
      } catch (err: any) {
        setLocalImage(null);
        Alert.alert('Upload failed', err?.message || 'Could not update photo');
      } finally {
        setUploadingAvatar(false);
      }
    } catch (error) { }
  }, [token, updateAuthUser, user?.id]);

  const avatarSource = useMemo(() => {
    if (user?.profileImage) return { uri: user.profileImage };
    if (localImage) return localImage;
    return null;
  }, [user?.profileImage, localImage]);

  const fallbackInitial = (user?.name || 'U').trim().charAt(0).toUpperCase();

  const renderProfile = () => (
    <View style={styles.profileContainer}>
      <View>
        {avatarSource ? (
          <Image
            source={avatarSource}
            resizeMode='cover'
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: COLORS.primary, borderColor: `${dark ? COLORS.dark3 : COLORS.grayscale400}`, borderWidth: 1, borderStyle: 'solid' }]}>
            <Text style={styles.avatarInitial}>{fallbackInitial}</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={pickImage}
          style={styles.picContainer}>
          <MaterialIcons name="edit" size={16} color={COLORS.white} />
        </TouchableOpacity>
        {uploadingAvatar && (
          <View style={styles.avatarOverlay}>
            <ActivityIndicator size="small" color={COLORS.white} />
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>{user?.name || 'User'}</Text>
      <Text style={[styles.subtitle, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>{user?.email || ''}</Text>
    </View>
  );

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
    dark ? setScheme('light') : setScheme('dark')
  };

  const renderSettings = () => (
    <View style={styles.settingsContainer}>
      <SettingsItem
        icon={icons.cartOutline}
        name="My Orders"
        onPress={() => navigate("orders")}
      />
      <SettingsItem
        icon={icons.box}
        name="My Returns"
        onPress={() => navigate("returns")}
      />
      <SettingsItem
        icon={icons.shieldOutline}
        name="Warranty"
        onPress={() => router.push('/warrantyclaims' as never)}
      />
      <SettingsItem
        icon={icons.location2Outline}
        name="Address"
        onPress={() => navigate("address")}
      />
      <SettingsItem
        icon={icons.userOutline}
        name="Edit Profile"
        onPress={() => navigate("editprofile")}
      />
      <SettingsItem
        icon={icons.shieldOutline}
        name="Change Password"
        onPress={() => navigate("settingssecurity")}
      />
      {/* Dark mode toggle remains optional */}
      <SettingsItem
        icon={icons.lockedComputerOutline}
        name="Privacy Policy"
        onPress={() => navigate("settingsprivacypolicy")}
      />
      <SettingsItem
        icon={icons.infoCircle}
        name="Help Center"
        onPress={() => navigate("settingshelpcenter")}
      />
      <TouchableOpacity
        onPress={() => refRBSheet.current.open()}
        style={styles.logoutContainer}>
        <View style={styles.logoutLeftContainer}>
          <Image
            source={icons.logout}
            resizeMode='contain'
            style={[styles.logoutIcon, {
              tintColor: "red"
            }]}
          />
          <Text style={[styles.logoutName, {
            color: "red"
          }]}>Logout</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderProfile()}
          {renderSettings()}
        </ScrollView>
      </View>
      <RBSheet
        ref={refRBSheet}
        closeOnPressMask={true}
        height={230}
        customStyles={{
          wrapper: {
            backgroundColor: "rgba(0,0,0,0.5)",
          },
          draggableIcon: {
            backgroundColor: dark ? COLORS.gray2 : COLORS.grayscale200,
            height: 4
          },
          container: {
            borderTopRightRadius: 32,
            borderTopLeftRadius: 32,
            height: 230,
            backgroundColor: dark ? COLORS.dark2 : COLORS.white
          }
        }}
      >
        <Text style={styles.bottomTitle}>Logout</Text>
        <View style={[styles.separateLine, {
          backgroundColor: dark ? COLORS.greyScale800 : COLORS.grayscale200,
        }]} />
        <Text style={[styles.bottomSubtitle, {
          color: dark ? COLORS.white : COLORS.black
        }]}>Are you sure you want to log out?</Text>
        <View style={styles.bottomContainer}>
          <Button
            title="Cancel"
            style={{
              width: (SIZES.width - 32) / 2 - 8,
              backgroundColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary,
              borderRadius: 32,
              borderColor: dark ? COLORS.dark3 : COLORS.tansparentPrimary
            }}
            textColor={dark ? COLORS.white : COLORS.primary}
            onPress={() => refRBSheet.current.close()}
          />
          <ButtonFilled
  title="Yes, Logout"
  style={styles.logoutButton}
  onPress={async () => {
    refRBSheet.current.close();
    setTimeout(async () => {
      await logout();
      router.replace('/(tabs)'); // send to home, not onboarding
    }, 300);
  }}
/>

        </View>
      </RBSheet>
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
    padding: 16,
    marginBottom: 32
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  logo: {
    height: 24,
    width: 24,
    tintColor: COLORS.primary
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "bold",
    color: COLORS.greyscale900,
    marginLeft: 12
  },
  headerIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.greyscale900
  },
  profileContainer: {
    alignItems: "center",
    borderBottomColor: COLORS.grayscale400,
    borderBottomWidth: .4,
    paddingVertical: 20
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 999
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999
  },
  avatarInitial: {
    color: COLORS.white,
    fontFamily: "bold",
    fontSize: 40
  },
  picContainer: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    position: "absolute",
    right: 0,
    bottom: 12
  },
  title: {
    fontSize: 18,
    fontFamily: "bold",
    color: COLORS.greyscale900,
    marginTop: 12
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.greyscale900,
    fontFamily: "medium",
    marginTop: 4
  },
  settingsContainer: {
    marginVertical: 12
  },
  settingsItemContainer: {
    width: SIZES.width - 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.greyscale900
  },
  settingsName: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    marginLeft: 12
  },
  settingsArrowRight: {
    width: 24,
    height: 24,
    tintColor: COLORS.greyscale900
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  rightLanguage: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    marginRight: 8
  },
  switch: {
    marginLeft: 8,
    transform: [{ scaleX: .8 }, { scaleY: .8 }], // Adjust the size of the switch
  },
  logoutContainer: {
    width: SIZES.width - 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12
  },
  logoutLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutIcon: {
    height: 24,
    width: 24,
    tintColor: COLORS.greyscale900
  },
  logoutName: {
    fontSize: 18,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    marginLeft: 12
  },
  bottomContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 12,
    paddingHorizontal: 16
  },
  cancelButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.tansparentPrimary,
    borderRadius: 32
  },
  logoutButton: {
    width: (SIZES.width - 32) / 2 - 8,
    backgroundColor: COLORS.primary,
    borderRadius: 32
  },
  bottomTitle: {
    fontSize: 24,
    fontFamily: "semiBold",
    color: "red",
    textAlign: "center",
    marginTop: 12
  },
  bottomSubtitle: {
    fontSize: 20,
    fontFamily: "semiBold",
    color: COLORS.greyscale900,
    textAlign: "center",
    marginVertical: 28
  },
  separateLine: {
    width: SIZES.width,
    height: 1,
    backgroundColor: COLORS.grayscale200,
    marginTop: 12
  }
})

export default Profile
