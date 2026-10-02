import { View, Text, StyleSheet, TouchableOpacity, Image, Switch, Alert } from 'react-native';
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import type { NavigationProp } from '@react-navigation/native';
import { useAuth } from '@/app/context/AuthContext';
import { fetchMyStore, updateMyStore } from '@/utils/api/store';
import { uploadProfileImage } from '@/utils/api/user';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { toAbsoluteImageUri } from '@/utils/images';

const Profile = () => {
  const refRBSheet = useRef<any>(null);
  const { dark, colors, setScheme } = useTheme();
  const { logout, user, token } = useAuth();
  const [showAnalyticsSubmenu, setShowAnalyticsSubmenu] = useState(false);
  const [storeProfile, setStoreProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const isStoreManager = (user?.role || '').toLowerCase?.() === 'storemanager';

  const navigation = useNavigation<NavigationProp<any>>();

  const loadStore = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchMyStore(token);
      setStoreProfile(res.store);
    } catch (err) {
      // ignore
    }
  }, [token]);

  useEffect(() => {
    loadStore();
  }, [loadStore]);

  useFocusEffect(
    useCallback(() => {
      loadStore();
    }, [loadStore])
  );

  const handleAnalyticsPress = () => {
    setShowAnalyticsSubmenu(prev => !prev);
  };

  const renderHeader = () => (
    <TouchableOpacity style={styles.headerContainer} onPress={() => navigation.goBack()}>
      <View style={styles.headerLeft}>
        <Image source={icons.back} resizeMode='contain' style={styles.logo} />
        <Text style={[styles.headerTitle, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>More Options</Text>
      </View>
      <TouchableOpacity>
        <Image source={icons.moreCircle} resizeMode='contain' style={[styles.headerIcon, { tintColor: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderProfile = () => {
    const initial = (storeProfile?.storeName || user?.name || 'S').charAt(0).toUpperCase();
    const profileUri = toAbsoluteImageUri(storeProfile?.storeProfileImage);

    const pickImage = async () => {
      if (!token) {
        Alert.alert('Login required', 'Please sign in to update store logo.');
        return;
      }
      try {
        const tempUri = await launchImagePicker();
        if (!tempUri) return;
        setUploading(true);
        const uploaded = await uploadProfileImage(tempUri, token, 'store-logos');
        await updateMyStore({ storeProfileImage: uploaded }, token);
        setStoreProfile((prev: any) => ({ ...(prev || {}), storeProfileImage: uploaded }));
      } catch (error: any) {
        Alert.alert('Upload failed', error?.message || 'Could not update store logo.');
      } finally {
        setUploading(false);
      }
    };

    return (
      <View style={styles.profileContainer}>
        <View>
          {profileUri ? (
            <Image source={{ uri: profileUri }} resizeMode='cover' style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: COLORS.white, fontFamily: 'bold', fontSize: 32 }}>{initial}</Text>
            </View>
          )}
          <TouchableOpacity onPress={pickImage} style={styles.picContainer} disabled={uploading}>
            <MaterialIcons name="edit" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.title, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>{storeProfile?.storeName || user?.name || 'Store'}</Text>
        <Text style={[styles.subtitle, { color: dark ? COLORS.secondaryWhite : COLORS.greyscale900 }]}>{user?.email || '@storehandle'}</Text>
        {isStoreManager && (
          <Text style={[styles.subtitle, { color: dark ? COLORS.grayscale200 : COLORS.gray }]}>
            Store Manager
          </Text>
        )}
      </View>
    );
  };

  const renderSettings = () => (
    <View style={styles.settingsContainer}>
      <SettingsItem icon={icons.bell3} name="My Notification" onPress={() => navigation.navigate("notifications")} />
      <SettingsItem icon={icons.reviews} name="My Reviews" onPress={() => navigation.navigate("sellerreviews")} />
      {!isStoreManager && (
        <SettingsItem icon={icons.userOutline} name="Store Managers" onPress={() => router.push('/sellermanagers')} />
      )}
      <SettingsItem icon={icons.location2Outline} name="Address" onPress={() => navigation.navigate("address")} />
      <SettingsItem icon={icons.userOutline} name="Edit Profile" onPress={() => navigation.navigate("sellereditprofile")} />
      <SettingsItem icon={icons.store}  name="Edit Store" onPress={() => navigation.navigate("sellereditstore")} />
      {!isStoreManager && (
        <SettingsItem icon={icons.wallet2Outline} name="Payment" onPress={() => navigation.navigate("settingspayment")} />
      )}
      <SettingsItem icon={icons.ticketOutline} name="Promo Codes" onPress={() => navigation.navigate("promocodes")} />
      <SettingsItem icon={icons.box} name="Returns" onPress={() => router.push('/sellerreturns')} />
      <SettingsItem icon={icons.shieldOutline} name="Warranty Claims" onPress={() => router.push('/warrantyclaims/seller')} />
      {!isStoreManager && (
        <SettingsItem icon={icons.walletOutline} name="Withdrawals" onPress={() => navigation.navigate("withdrawals")} />
      )}

      <TouchableOpacity onPress={handleAnalyticsPress} style={styles.settingsItemContainer}>
        <View style={styles.leftContainer}>
          <Image source={icons.analytics} resizeMode='contain' style={[styles.settingsIcon, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]} />
          <Text style={[styles.settingsName, { color: dark ? COLORS.white : COLORS.greyscale900 }]}>Analytics</Text>
        </View>
        <Image source={showAnalyticsSubmenu ? icons.arrowDown : icons.arrowRight} style={[styles.settingsArrowRight, { tintColor: dark ? COLORS.white : COLORS.greyscale900 }]} />
      </TouchableOpacity>

      {showAnalyticsSubmenu && (
        <View style={styles.analyticsSubmenu}>
          <TouchableOpacity style={{flexDirection: 'row', gap: 10}} onPress={() => navigation.navigate("salesreport")}>
            <Image
            source={icons.sales}
            resizeMode='contain'
            style={styles.settingsIcon2}/>
            <Text style={styles.submenuItem}>Sales Report</Text>
          </TouchableOpacity>
          <TouchableOpacity  style={{flexDirection: 'row', gap: 10}} onPress={() => navigation.navigate("bestsellingproducts")}>
          <Image
            source={icons.best}
            resizeMode='contain'
            style={styles.settingsIcon2}/>
            <Text style={styles.submenuItem}>Best Selling Products</Text>
          </TouchableOpacity>
          <TouchableOpacity  style={{flexDirection: 'row', gap: 10}} onPress={() => navigation.navigate("netprofit")}>
          <Image
            source={icons.graphOutline}
            resizeMode='contain'
            style={styles.settingsIcon2}/>
            <Text style={styles.submenuItem}>Profit Insights</Text>
          </TouchableOpacity>
          <TouchableOpacity  style={{flexDirection: 'row', gap: 10}} onPress={() => navigation.navigate("orderinsights")}>
          <Image
            source={icons.cartOutline}
            resizeMode='contain'
            style={styles.settingsIcon2}/>
            <Text style={styles.submenuItem}>Order Insights</Text>
          </TouchableOpacity>
        </View>
      )}

      <SettingsItem icon={icons.shieldOutline} name="Change Password" onPress={() => navigation.navigate("settingssecurity")} />
      <SettingsItem icon={icons.lockedComputerOutline} name="Privacy Policy" onPress={() => navigation.navigate("settingsprivacypolicy")} />
      <SettingsItem icon={icons.infoCircle} name="Help Center" onPress={() => navigation.navigate("settingshelpcenter")} />

      <TouchableOpacity onPress={() => refRBSheet.current.open()} style={styles.logoutContainer}>
        <View style={styles.logoutLeftContainer}>
          <Image source={icons.logout} resizeMode='contain' style={[styles.logoutIcon, { tintColor: "red" }]} />
          <Text style={[styles.logoutName, { color: "red" }]}>Logout</Text>
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
      router.replace('/(tabs)'); // go to home
    }, 300);
  }}
/>

        </View>
      </RBSheet>
    </SafeAreaView>
  );
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
    justifyContent: "space-between",
    paddingBottom: 16
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.black,
    padding: 2
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
  settingsIcon2: {
    height: 20,
    width: 20,
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
  },
  analyticsSubmenu: {
    paddingLeft: 35,
   
   
    gap: 20,

    borderRadius: 10,
    marginTop: 10,
    marginBottom: 10
  },
  submenuItem: {
    fontSize: 15,
    color: COLORS.greyscale900,
    paddingVertical: 4,
    fontFamily: 'semibold',
    fontWeight: '600'
  }
})

export default Profile
