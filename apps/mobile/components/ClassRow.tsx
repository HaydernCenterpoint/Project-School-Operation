import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { colors } from "@/lib/theme";
import type { AppClass } from "@/lib/AppData";

type Props = {
  item: AppClass;
  index?: number;
  live?: boolean;
  onPress: () => void;
};

export function ClassRow({ item, index = 0, live = false, onPress }: Props) {
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const accessibilityDetails = live
    ? "Đang diễn ra, 08:00 đến 09:40"
    : [
        item.teacherName,
        item.studentCount !== undefined
          ? `${item.studentCount} thành viên`
          : null,
      ]
        .filter(Boolean)
        .join(", ");

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }

    const animation = Animated.timing(progress, {
      delay: index * 90,
      duration: 360,
      toValue: 1,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, progress, reduceMotion]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }}
    >
      <Pressable
        accessibilityHint="Mở thông tin chi tiết lớp học"
        accessibilityLabel={[item.name, accessibilityDetails]
          .filter(Boolean)
          .join(". ")}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.book}>
          <Text maxFontSizeMultiplier={2} style={styles.bookText}>
            {item.code.slice(0, 2)}
          </Text>
        </View>
        <View style={styles.content}>
          <Text maxFontSizeMultiplier={2} style={styles.name}>
            {item.name}
          </Text>
          {live ? (
            <View style={styles.metaLine}>
              <View style={styles.liveDot} />
              <Text maxFontSizeMultiplier={2} style={styles.meta}>
                Đang diễn ra · 08:00–09:40
              </Text>
            </View>
          ) : item.teacherName || item.studentCount !== undefined ? (
            <Text maxFontSizeMultiplier={2} style={styles.meta}>
              {[
                item.teacherName,
                item.studentCount !== undefined
                  ? `${item.studentCount} thành viên`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          ) : null}
        </View>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          maxFontSizeMultiplier={2}
          style={styles.chevron}
        >
          ›
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    backgroundColor: colors.paper,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 16,
    minHeight: 108,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  pressed: {
    backgroundColor: colors.mist,
  },
  book: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 10,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  bookText: {
    color: colors.paper,
    fontSize: 17,
    fontWeight: "900",
  },
  content: {
    flex: 1,
    gap: 6,
  },
  name: {
    color: colors.blue,
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 25,
  },
  metaLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  liveDot: {
    backgroundColor: colors.red,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  meta: {
    color: colors.muted,
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  chevron: {
    color: colors.blue,
    fontSize: 38,
    fontWeight: "300",
    lineHeight: 42,
  },
});
