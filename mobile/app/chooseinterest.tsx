// components/ChooseInterest.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useNavigation, router } from "expo-router";      // ← import the hook
import { COLORS, SIZES, icons } from "../constants";
import { updateUserProfile } from "@/utils/api/user";
import { useAuth } from "@/app/context/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_MAX_WIDTH = 400;
const BOX_MARGIN = 8;
const BOX_SIZE = 100;  // 3×100 + 4×8 = 332px < ~352px available

const INTERESTS = [
  { icon: icons.honda, label: 'Honda' },
  { icon: icons.toyota, label: 'Toyota' },
  { icon: icons.suzuki, label: 'Suzuki' },
  { icon: icons.hyundai, label: 'Hyundai' },
  { icon: icons.kia, label: 'Kia' },
  { icon: icons.haval, label: 'Haval' },
];

type Nav = {
  navigate: (route: string) => void;
};

const ChooseInterest: React.FC = () => {
  const [selected, setSelected] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { navigate } = useNavigation<Nav>();      // ← get navigate here
  const { user, token, updateUserProfile: setAuthUser } = useAuth();
  const selectedLabels = useMemo(
    () => selected.map((i) => INTERESTS[i]?.label).filter(Boolean) as string[],
    [selected]
  );

  const toggle = (i: number) =>
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );

  const handleSave = async () => {
    if (!user?.id || !token) {
      Alert.alert('Sign in required', 'Please log in again to save your interests.');
      navigate("login");
      return;
    }
    if (!selectedLabels.length) {
      Alert.alert('Select interests', 'Please choose at least one interest.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await updateUserProfile(user.id, { interests: selectedLabels } as any, token);
      await setAuthUser(updated as any);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert('Could not save', err?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>CHOOSE INTEREST</Text>
      <Text style={styles.subtext}>Select one or more</Text>

      <View style={styles.grid}>
        {INTERESTS.map((item, i) => {
          const isSel = selected.includes(i);
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.box,
                isSel && {
                  borderColor: COLORS.primary,
                  backgroundColor: COLORS.primary + "22",
                },
              ]}
              onPress={() => toggle(i)}
            >
              <Image source={item.icon} style={styles.image} />
              {isSel && (
                <View style={styles.overlay}>
                  <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M20.285 6.709l-11.01 11.01-5.303-5.304 1.414-1.414 3.889 3.889 9.596-9.596z"
                      fill="#000"
                    />
                  </Svg>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>{isSaving ? 'SAVING...' : 'CHOOSE'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: CARD_MAX_WIDTH,
    padding: 24,
    borderRadius: 12,
    alignSelf: "center",
    marginTop: 100,
  },
  heading: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  subtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginHorizontal: -BOX_MARGIN,
    marginBottom: 24,
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    margin: BOX_MARGIN,
    borderRadius: BOX_SIZE / 2,
    borderWidth: 1,
    borderColor: "#111",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  image: {
    width: 45,
    height: 45,
    tintColor: "#fff",
    objectFit: "contain",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFA500AA',
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
  
   
    width: "100%",
    borderRadius: 30,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
   
  },
});

export default ChooseInterest;
