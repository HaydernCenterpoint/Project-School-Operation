import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "@/lib/theme";

type Props = {
  tenantName: string;
  userName: string;
};

export function BrandHeader({ tenantName, userName }: Props) {
  return (
    <View style={styles.header}>
      <View pointerEvents="none" style={styles.orbitOne} />
      <View pointerEvents="none" style={styles.orbitTwo} />
      <View style={styles.identity}>
        <Image
          accessibilityIgnoresInvertColors
          accessible
          accessibilityLabel="Biểu trưng Đại học Sao Đỏ"
          source={require("@/assets/sao-do-logo.png")}
          style={styles.logo}
        />
        <View style={styles.copy}>
          <Text maxFontSizeMultiplier={2} style={styles.school}>
            Đại học Sao Đỏ
          </Text>
          <Text maxFontSizeMultiplier={2} style={styles.campus}>
            {tenantName}
          </Text>
          <Text maxFontSizeMultiplier={2} style={styles.student}>
            {userName}
          </Text>
        </View>
      </View>
      <View style={styles.yellowRule} />
      <View style={styles.redRule} />
      <View style={styles.bookPoint} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.ink,
    minHeight: 238,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingBottom: 42,
    paddingTop: 22,
  },
  identity: {
    alignItems: "center",
    flexDirection: "row",
    gap: 20,
    zIndex: 2,
  },
  logo: {
    height: 124,
    resizeMode: "contain",
    width: 124,
  },
  copy: {
    flex: 1,
    gap: 7,
  },
  school: {
    color: colors.paper,
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 31,
  },
  campus: {
    color: colors.yellow,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
  },
  student: {
    color: colors.paper,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 25,
    marginTop: 9,
  },
  orbitOne: {
    borderColor: colors.yellow,
    borderRadius: 150,
    borderWidth: 1,
    height: 86,
    opacity: 0.75,
    position: "absolute",
    right: -66,
    top: 35,
    transform: [{ rotate: "18deg" }],
    width: 220,
  },
  orbitTwo: {
    borderColor: colors.yellow,
    borderRadius: 150,
    borderWidth: 1,
    height: 74,
    opacity: 0.65,
    position: "absolute",
    right: -52,
    top: 94,
    transform: [{ rotate: "-16deg" }],
    width: 206,
  },
  yellowRule: {
    backgroundColor: colors.yellow,
    bottom: 18,
    height: 4,
    left: 0,
    position: "absolute",
    right: 0,
    transform: [{ rotate: "3deg" }],
  },
  redRule: {
    backgroundColor: colors.red,
    bottom: 11,
    height: 4,
    left: 0,
    position: "absolute",
    right: 0,
    transform: [{ rotate: "3deg" }],
  },
  bookPoint: {
    backgroundColor: colors.paper,
    bottom: -28,
    height: 50,
    left: "44%",
    position: "absolute",
    transform: [{ rotate: "45deg" }],
    width: 50,
  },
});
