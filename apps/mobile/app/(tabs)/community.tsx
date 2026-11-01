import type {
  CommunitySpace,
  CommunitySpaceKind,
} from "@sao-do/contracts";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenState } from "@/components/ScreenState";
import { useAppData } from "@/lib/AppData";
import { listCommunitySpaces } from "@/lib/communityApi";
import { colors } from "@/lib/theme";

const kindLabels: Record<CommunitySpaceKind, string> = {
  school: "Toàn trường",
  class: "Lớp học",
  club: "Câu lạc bộ",
};

const kindOrder: CommunitySpaceKind[] = ["school", "class", "club"];

function SpaceRow({ space }: { space: CommunitySpace }) {
  const status = space.muted ? "Đã tắt thông báo" : "Đang nhận thông báo";

  return (
    <Pressable
      accessibilityHint="Mở cuộc trò chuyện"
      accessibilityLabel={`${space.name}. ${kindLabels[space.kind]}. ${status}`}
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: "/community/[id]",
          params: { id: space.id },
        })
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowCopy}>
        <Text maxFontSizeMultiplier={2} style={styles.rowTitle}>
          {space.name}
        </Text>
        <Text maxFontSizeMultiplier={2} style={styles.rowMeta}>
          {status}
        </Text>
      </View>
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        maxFontSizeMultiplier={2}
        style={styles.openLabel}
      >
        Mở
      </Text>
    </Pressable>
  );
}

export default function CommunityScreen() {
  const { membership, session } = useAppData();
  const [spaces, setSpaces] = useState<CommunitySpace[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    if (!session) {
      setError("Phiên đăng nhập đã hết hạn.");
      setLoading(false);
      return;
    }

    try {
      const result = await listCommunitySpaces(session.access_token);
      setSpaces(result.spaces);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải cộng đồng.",
      );
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const groupedSpaces = useMemo(
    () =>
      kindOrder
        .map((kind) => ({
          kind,
          spaces: spaces.filter((space) => space.kind === kind),
        }))
        .filter((group) => group.spaces.length > 0),
    [spaces],
  );

  if (loading) return <ScreenState busy message="Đang tải cộng đồng…" />;
  if (error) {
    return <ScreenState message={error} onAction={() => void load()} />;
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text maxFontSizeMultiplier={2} style={styles.title}>
            Cộng đồng
          </Text>
          <Text maxFontSizeMultiplier={2} style={styles.subtitle}>
            {`Các kênh bạn được phép truy cập tại ${membership?.tenantName ?? "trường"}. Nội dung chỉ gồm văn bản.`}
          </Text>
        </View>

        {groupedSpaces.length === 0 ? (
          <View accessibilityLiveRegion="polite" style={styles.empty}>
            <Text maxFontSizeMultiplier={2} style={styles.emptyText}>
              Bạn chưa được cấp quyền vào kênh cộng đồng nào.
            </Text>
          </View>
        ) : (
          groupedSpaces.map((group) => (
            <View key={group.kind} style={styles.section}>
              <Text maxFontSizeMultiplier={2} style={styles.sectionTitle}>
                {kindLabels[group.kind]}
              </Text>
              {group.spaces.map((space) => (
                <SpaceRow key={space.id} space={space} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.ink, flex: 1 },
  content: {
    backgroundColor: colors.paper,
    flexGrow: 1,
    paddingBottom: 40,
  },
  heading: {
    backgroundColor: colors.ink,
    paddingBottom: 26,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    color: colors.paper,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 42,
  },
  subtitle: {
    color: colors.yellow,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: 8,
  },
  section: { paddingHorizontal: 24, paddingTop: 28 },
  sectionTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 29,
    marginBottom: 8,
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 16,
    minHeight: 88,
    paddingVertical: 14,
  },
  pressed: { backgroundColor: colors.mist },
  rowCopy: { flex: 1, gap: 5 },
  rowTitle: {
    color: colors.blue,
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 26,
  },
  rowMeta: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  openLabel: {
    color: colors.red,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 22,
  },
  empty: {
    backgroundColor: colors.mist,
    borderLeftColor: colors.blue,
    borderLeftWidth: 4,
    margin: 24,
    padding: 20,
  },
  emptyText: { color: colors.muted, fontSize: 16, lineHeight: 24 },
});
