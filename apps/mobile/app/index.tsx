import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenState } from "@/components/ScreenState";
import { useAppData } from "@/lib/AppData";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const {
    error: appError,
    isAuthorized,
    loading,
    signIn: authenticate,
  } = useAppData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthorized) {
      router.replace("/(tabs)");
    }
  }, [isAuthorized, loading]);

  async function handleSignIn() {
    setError("");
    setSubmitting(true);
    const result = await authenticate(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace("/(tabs)");
  }

  if (loading) {
    return <ScreenState busy message="Đang kiểm tra phiên đăng nhập…" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <Image
              accessibilityIgnoresInvertColors
              accessible
              accessibilityLabel="Biểu trưng Đại học Sao Đỏ"
              source={require("@/assets/sao-do-logo.png")}
              style={styles.logo}
            />
            <Text maxFontSizeMultiplier={2} style={styles.title}>
              Đại học Sao Đỏ
            </Text>
            <Text maxFontSizeMultiplier={2} style={styles.subtitle}>
              Cổng học tập số
            </Text>
          </View>

          <View style={styles.form}>
            <Text maxFontSizeMultiplier={2} style={styles.heading}>
              Đăng nhập
            </Text>
            <Text maxFontSizeMultiplier={2} style={styles.label}>
              Email trường
            </Text>
            <TextInput
              accessibilityLabel="Email trường"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              maxFontSizeMultiplier={2}
              onChangeText={setEmail}
              style={styles.input}
              value={email}
            />
            <Text maxFontSizeMultiplier={2} style={styles.label}>
              Mật khẩu
            </Text>
            <TextInput
              accessibilityLabel="Mật khẩu"
              maxFontSizeMultiplier={2}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              value={password}
            />
            {!!(error || appError) && (
              <Text
                accessibilityLiveRegion="polite"
                maxFontSizeMultiplier={2}
                style={styles.error}
              >
                {error || appError}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                busy: submitting,
                disabled: submitting,
              }}
              disabled={submitting}
              onPress={handleSignIn}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
            >
              <Text maxFontSizeMultiplier={2} style={styles.buttonText}>
                {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.ink,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  brand: {
    alignItems: "center",
    paddingBottom: 30,
  },
  logo: {
    height: 138,
    resizeMode: "contain",
    width: 138,
  },
  title: {
    color: colors.paper,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 37,
    textAlign: "center",
  },
  subtitle: {
    color: colors.yellow,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
  form: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    gap: 10,
    padding: 22,
  },
  heading: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 31,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 4,
  },
  input: {
    borderColor: colors.muted,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.red,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonPressed: {
    opacity: 0.84,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.paper,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    textAlign: "center",
  },
});
