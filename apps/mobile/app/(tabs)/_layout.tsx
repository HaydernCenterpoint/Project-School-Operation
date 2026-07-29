import { Redirect, Tabs } from "expo-router";
import { type ColorValue, Text } from "react-native";

import { ScreenState } from "@/components/ScreenState";
import { useAppData } from "@/lib/AppData";
import { colors } from "@/lib/theme";

function Label({
  children,
  color,
}: {
  children: string;
  color: ColorValue;
}) {
  return (
    <Text
      maxFontSizeMultiplier={2}
      style={{ color, fontSize: 13, fontWeight: "700" }}
    >
      {children}
    </Text>
  );
}

export default function TabLayout() {
  const { isAuthorized, loading, membership } = useAppData();
  const isModerator = membership?.role === "moderator";

  if (loading) {
    return <ScreenState busy message="Đang tải dữ liệu trường học…" />;
  }

  if (!isAuthorized) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.muted,
        tabBarItemStyle: { paddingVertical: 7 },
        tabBarLabelPosition: "below-icon",
        tabBarStyle: {
          borderTopColor: colors.border,
          minHeight: 72,
          paddingBottom: 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: isModerator ? null : undefined,
          tabBarAccessibilityLabel: "Hôm nay",
          tabBarIcon: ({ color }) => (
            <Text
              accessible={false}
              importantForAccessibility="no"
              maxFontSizeMultiplier={2}
              style={{ color, fontSize: 21, fontWeight: "900" }}
            >
              ⌂
            </Text>
          ),
          tabBarLabel: ({ color }) => <Label color={color}>Hôm nay</Label>,
          title: "Hôm nay",
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          href: isModerator ? null : undefined,
          tabBarAccessibilityLabel: "Lớp học",
          tabBarIcon: ({ color }) => (
            <Text
              accessible={false}
              importantForAccessibility="no"
              maxFontSizeMultiplier={2}
              style={{ color, fontSize: 19, fontWeight: "900" }}
            >
              ▤
            </Text>
          ),
          tabBarLabel: ({ color }) => <Label color={color}>Lớp học</Label>,
          title: "Lớp học",
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          tabBarAccessibilityLabel: "Cộng đồng",
          tabBarIcon: ({ color }) => (
            <Text
              accessible={false}
              importantForAccessibility="no"
              maxFontSizeMultiplier={2}
              style={{ color, fontSize: 15, fontWeight: "900" }}
            >
              CĐ
            </Text>
          ),
          tabBarLabel: ({ color }) => <Label color={color}>Cộng đồng</Label>,
          title: "Cộng đồng",
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          tabBarAccessibilityLabel: "Tài khoản",
          tabBarIcon: ({ color }) => (
            <Text
              accessible={false}
              importantForAccessibility="no"
              maxFontSizeMultiplier={2}
              style={{ color, fontSize: 18, fontWeight: "900" }}
            >
              ○
            </Text>
          ),
          tabBarLabel: ({ color }) => <Label color={color}>Tài khoản</Label>,
          title: "Tài khoản",
        }}
      />
    </Tabs>
  );
}
