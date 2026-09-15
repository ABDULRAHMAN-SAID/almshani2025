import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { colors } from "@/constants";
import { useAuthStore } from "@/store/authStore";

export default function TabsLayout() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  // الحارس هنا لا في شاشة البداية وحدها: تلك تُتخطّى برابط عميق
  // (anshatati://) يفتح تبويبًا مباشرة، فيدخل من لا جلسة له إلى واجهة
  // الأعضاء. والجداول المحمية ترفضه على الخادم، لكنه يرى ما هو عامّ ويظنّ
  // نفسه داخلًا. وننتظر الترطيب أولًا وإلّا طُرد العضو المسجَّل في كل فتحة
  // قبل أن تُقرأ جلسته من التخزين.
  if (!hasHydrated) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 6, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: "Tajawal_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "التقويم",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-activities"
        options={{
          title: "نشاطاتي",
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="awareness"
        options={{
          title: "التوعية",
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "حسابي",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
