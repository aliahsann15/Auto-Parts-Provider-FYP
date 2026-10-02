import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SIZES, icons, images } from "../constants";
import SocialButtonV2 from "../components/SocialButtonV2";
import { useTheme } from "../theme/ThemeProvider";
import { useNavigation } from "expo-router";

type Nav = {
  navigate: (value: string) => void;
};

const Welcome: React.FC = () => {
  // get navigation and theme context
  const { navigate } = useNavigation<Nav>();
  const { colors, dark } = useTheme();

  return (
    <SafeAreaView style={[styles.area, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* App logo */}
        <Image
          source={dark ? images.logoDark : images.logo}
          resizeMode="contain"
          style={styles.logo}
        />

        {/* Main heading */}
        <Text style={[styles.title, { color: colors.text }]}>
          Welcome Back!
        </Text>

        {/* Subtitle / description */}
        <Text style={[styles.subtitle, { color: dark ? COLORS.white : "black" }]}>
          Choose how you’d like to join Auto Parts Providers.
        </Text>

        ─────── NEW: Two-step choice ───────
        <View style={styles.choiceContainer}>
          <TouchableOpacity
            style={[styles.choiceButton, { borderColor: COLORS.primary }, ]}
            onPress={() => navigate("signupseller")}
          >
            <Text style={[styles.choiceText, { color: COLORS.primary }]}>
              Register as Seller
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choiceButton, { borderColor: COLORS.primary }]}
            onPress={() => navigate("signup")}
          >
            <Text style={[styles.choiceText, { color: COLORS.primary }]}>
              Register as Buyer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Social / email continue buttons */}
        {/* <View style={{ marginVertical: 32 }}>
          <SocialButtonV2
            title="Continue with Apple"
            icon={icons.appleLogo}
            onPress={() => navigate("signup")}
            iconStyles={{ tintColor: dark ? COLORS.white : COLORS.black }}
          />
          <SocialButtonV2
            title="Continue with Google"
            icon={icons.google}
            onPress={() => navigate("signup")}
          />
          <SocialButtonV2
            title="Continue with Email"
            icon={icons.email2}
            onPress={() => navigate("signup")}
          />
        </View> */}

        {/* Login link for existing users */}
        <View style={{ flexDirection: "row" }}>
          <Text style={[styles.loginTitle, { color: dark ? COLORS.white : "black" }]}>
            Already have account?{" "}
          </Text>
          <TouchableOpacity onPress={() => navigate("login")}>
            <Text
              style={[
                styles.loginSubtitle,
                { color: dark ? COLORS.white : COLORS.primary },
              ]}
            >
              Log In
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Terms & privacy at bottom */}
      <View style={styles.bottomContainer}>
        <Text style={[styles.bottomTitle, { color: dark ? COLORS.white : "black" }]}>
          By continuing, you accept the Terms Of Use and
        </Text>
        <TouchableOpacity onPress={() => navigate("privacy-policy")}>
          <Text style={[styles.bottomSubtitle, { color: dark ? COLORS.white : "black" }]}>
            Privacy Policy.
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  area: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 120,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: "bold",
    marginVertical: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "regular",
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  // container for the two choice buttons
  choiceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  choiceButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    marginHorizontal: 8,
    alignItems: "center",
  },
  choiceText: {
    fontSize: 16,
    fontFamily: "semiBold",
    textAlign: 'center'
  },
  loginTitle: {
    fontSize: 14,
    fontFamily: "regular",
  },
  loginSubtitle: {
    fontSize: 14,
    fontFamily: "semiBold",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 32,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  bottomTitle: {
    fontSize: 12,
    fontFamily: "regular",
  },
  bottomSubtitle: {
    fontSize: 12,
    fontFamily: "regular",
    textDecorationLine: "underline",
    marginTop: 4,
  },
});

export default Welcome;
