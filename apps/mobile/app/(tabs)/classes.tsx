import { router } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ClassRow } from "@/components/ClassRow";
import { ScreenState } from "@/components/ScreenState";
import { useAppData } from "@/lib/AppData";
import { colors } from "@/lib/theme";

export default function ClassesScreen() {
  const { classes, membership } = useAppData();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={2} style={styles.title}>
          Lớp học
        </Text>
        <Text maxFontSizeMultiplier={2} style={styles.subtitle}>
          {`Các lớp được phân quyền tại ${membership?.tenantName ?? "trường"}`}
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
    paddingBottom: 32,
  },
  title: {
    backgroundColor: colors.ink,
    color: colors.paper,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 42,
    paddingHorizontal: 24,
    paddingBottom: 8,
    paddingTop: 24,
  },
  subtitle: {
    backgroundColor: colors.ink,
    color: colors.yellow,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    paddingHorizontal: 24,
    paddingBottom: 26,
  },
});
