import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppDataProvider } from "@/lib/AppData";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return (
    <AppDataProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          animation: "slide_from_right",
          contentStyle: { backgroundColor: colors.paper },
          headerStyle: { backgroundColor: colors.ink },
          headerTintColor: colors.paper,
          headerTitleStyle: { fontWeight: "800" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="class/[id]"
          options={{ headerBackTitle: "Quay lại", title: "Chi tiết lớp" }}
        />
        <Stack.Screen
          name="assignment/[id]"
          options={{ headerBackTitle: "Quay lại", title: "Bài tập" }}
        />
        <Stack.Screen
          name="community/[id]"
          options={{ headerBackTitle: "Quay lại", title: "Cộng đồng" }}
        />
      </Stack>
    </AppDataProvider>
  );
}
