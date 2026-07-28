import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { roleLabels, useAppData } from "@/lib/AppData";
import { colors } from "@/lib/theme";

export default function AccountScreen() {
  const { membership, session, signOut: endSession } = useAppData();
  const email = session?.user.email ?? "Không có email";
  const name =
    typeof session?.user.user_metadata.name === "string"
      ? session.user.user_metadata.name
      : email;
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    await endSession();
    router.replace("/");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={2} style={styles.title}>
          Tài khoản
        </Text>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text maxFontSizeMultiplier={2} style={styles.initials}>
              {initials}
            </Text>
          </View>
          <Text maxFontSizeMultiplier={2} style={styles.name}>
            {name}
          </Text>
          <Text maxFontSizeMultiplier={2} style={styles.email}>
            {email}
          </Text>
          <Text maxFontSizeMultiplier={2} style={styles.mode}>
            {membership
              ? `${roleLabels[membership.role]} · ${membership.tenantName}`
              : "Chưa có tư cách thành viên"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleSignOut}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text maxFontSizeMultiplier={2} style={styles.buttonText}>
            Đăng xuất
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.ink,
    flex: 1,
  },
  content: {
    backgroundColor: colors.paper,
    flexGrow: 1,
    padding: 24,
  },
  title: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 42,
    marginBottom: 34,
  },
  profile: {
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 48,
    height: 96,
    justifyContent: "center",
    marginBottom: 8,
    width: 96,
  },
  initials: {
    color: colors.paper,
    fontSize: 28,
    fontWeight: "900",
  },
  name: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 31,
  },
  email: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  mode: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  button: {
    alignItems: "center",
    borderColor: colors.red,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: "center",
    marginTop: 44,
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  pressed: {
    backgroundColor: "#FFF2F2",
  },
  buttonText: {
    color: colors.red,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
});
