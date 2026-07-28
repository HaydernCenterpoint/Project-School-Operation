import { Redirect, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandHeader } from "@/components/BrandHeader";
import { ClassRow } from "@/components/ClassRow";
import { ScreenState } from "@/components/ScreenState";
import { useAppData } from "@/lib/AppData";
import { colors } from "@/lib/theme";

export default function HomeScreen() {
  const { classes, membership, session } = useAppData();
  if (membership?.role === "moderator") {
    return <Redirect href="/(tabs)/community" />;
  }
  const userName =
    typeof session?.user.user_metadata.name === "string"
      ? session.user.user_metadata.name
      : (session?.user.email ?? "Tài khoản trường");
  const tenantName = membership?.tenantName ?? "Đại học Sao Đỏ";

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <BrandHeader
          tenantName={tenantName}
          userName={userName}
        />
        <View style={styles.section}>
          <Text maxFontSizeMultiplier={2} style={styles.title}>
            Hôm nay
          </Text>
          <View style={styles.eyebrow}>
            <View style={styles.redRule} />
            <Text maxFontSizeMultiplier={2} style={styles.supporting}>
              Lớp học đang diễn ra
            </Text>
          </View>
        </View>
        <Text maxFontSizeMultiplier={2} style={styles.emptyToday}>
          Chưa có lịch học được công bố hôm nay.
        </Text>
        {membership?.role === "student" && (
          <Pressable
            accessibilityHint="Mở màn hình đặt câu hỏi có nguồn"
            accessibilityRole="button"
            onPress={() => router.push("/tutor")}
            style={({ pressed }) => [
              styles.tutorCard,
              pressed && styles.tutorCardPressed,
            ]}
          >
            <View style={styles.tutorCardCopy}>
              <Text maxFontSizeMultiplier={2} style={styles.tutorCardTitle}>
                Trợ giảng AI có nguồn
              </Text>
              <Text maxFontSizeMultiplier={2} style={styles.tutorCardText}>
                Hỏi từ tài liệu lớp học sau khi bạn xem và đồng ý chính sách.
              </Text>
            </View>
            <Text
              accessible={false}
              maxFontSizeMultiplier={2}
              style={styles.tutorCardAction}
            >
              Mở
            </Text>
          </Pressable>
        )}
        <Text maxFontSizeMultiplier={2} style={styles.listTitle}>
          Lớp học của tôi
        </Text>
        {classes.length ? (
          classes.map((item, index) => (
            <ClassRow
              index={index}
              item={item}
              key={item.id}
              onPress={() => router.push(`/class/${item.id}`)}
            />
          ))
        ) : (
          <ScreenState message="Bạn chưa có lớp học nào được phân quyền." />
        )}
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
    paddingBottom: 28,
  },
  section: {
    gap: 22,
    paddingHorizontal: 24,
    paddingBottom: 22,
    paddingTop: 30,
  },
  title: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 43,
  },
  eyebrow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  redRule: {
    backgroundColor: colors.red,
    height: 32,
    width: 4,
  },
  supporting: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
  },
  listTitle: {
    color: colors.ink,
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 39,
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 34,
  },
  emptyToday: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  tutorCard: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderLeftColor: colors.yellow,
    borderLeftWidth: 4,
    flexDirection: "row",
    gap: 16,
    marginHorizontal: 24,
    marginTop: 14,
    minHeight: 112,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  tutorCardPressed: {
    opacity: 0.84,
  },
  tutorCardCopy: {
    flex: 1,
    gap: 5,
  },
  tutorCardTitle: {
    color: colors.paper,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26,
  },
  tutorCardText: {
    color: "#D7E3F1",
    fontSize: 14,
    lineHeight: 21,
  },
  tutorCardAction: {
    color: colors.yellow,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
});
