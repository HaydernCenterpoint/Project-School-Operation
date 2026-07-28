import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "@/lib/theme";

type Props = {
  actionLabel?: string;
  busy?: boolean;
  message: string;
  onAction?: () => void;
};

export function ScreenState({
  actionLabel = "Thử lại",
  busy = false,
  message,
  onAction,
}: Props) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.container}>
      {busy && <ActivityIndicator color={colors.blue} size="large" />}
      <Text maxFontSizeMultiplier={2} style={styles.message}>
        {message}
      </Text>
      {onAction && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text maxFontSizeMultiplier={2} style={styles.buttonText}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.paper,
    flex: 1,
    gap: 18,
    justifyContent: "center",
    padding: 24,
  },
  message: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.red,
    borderRadius: 8,
    minHeight: 52,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.84,
  },
  buttonText: {
    color: colors.paper,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
});
