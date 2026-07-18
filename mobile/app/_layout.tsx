import { I18nManager } from 'react-native';
// עברית — RTL. מופעל פעם אחת; ב-Expo Go ייתכן שיידרש reload אחד בהרצה הראשונה.
if (!I18nManager.isRTL) {
  try {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  } catch {
    /* ignore */
  }
}

import { Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider } from '../lib/auth';
import { DataProvider } from '../lib/data';
import { NewLeadAlert } from '../components/NewLeadAlert';
import { BrandSplash } from '../components/BrandSplash';
import { ThemeProvider, useTheme } from '../lib/theme-context';

// כפתור חזרה בצד ימין (RTL) — ה-native header לא מבצע מירור אוטומטי.
function HeaderBack() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={14} accessibilityLabel="חזרה" style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
      <Feather name="chevron-right" size={27} color={colors.text} />
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <NewLeadAlert />
          <SafeAreaProvider>
            <ThemedApp />
          </SafeAreaProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemedApp() {
  const { colors, scheme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          // RTL: כפתור החזרה בצד ימין במקום שמאל
          headerBackVisible: false,
          headerRight: () => <HeaderBack />,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'הבית שלי' }} />
        <Stack.Screen name="leads" options={{ title: 'הלידים שלך' }} />
        <Stack.Screen name="lead/[id]" options={{ title: 'פרטי ליד' }} />
        <Stack.Screen name="notifications" options={{ title: 'התראות' }} />
        <Stack.Screen name="settings" options={{ title: 'חשבון' }} />
      </Stack>
      <BrandSplash />
    </View>
  );
}
