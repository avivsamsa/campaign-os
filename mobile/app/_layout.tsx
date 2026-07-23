import { I18nManager } from 'react-native';
// עברית — RTL. swapLeftAndRightInRTL(false) => 'right'/'left'/textAlign נשארים פיזיים
// (אחרת RN מחליף textAlign:'right' ל-left ב-RTL, וטקסט לטיני נצמד שמאלה).
try {
  I18nManager.allowRTL(true);
  I18nManager.swapLeftAndRightInRTL(false);
  if (!I18nManager.isRTL) I18nManager.forceRTL(true);
} catch {
  /* ignore */
}

import { useEffect, useRef } from 'react';
import { Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AuthProvider, useAuth } from '../lib/auth';
import { DataProvider } from '../lib/data';
import { registerForPush } from '../lib/push';
import { NewLeadAlert } from '../components/NewLeadAlert';
import { BrandSplash } from '../components/BrandSplash';
import { ThemeProvider, useTheme } from '../lib/theme-context';

// כפתור חזרה בצד שמאל, חץ פונה שמאלה.
function HeaderBack() {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={14} accessibilityLabel="חזרה" style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
      <Feather name="chevron-left" size={27} color={colors.text} />
    </Pressable>
  );
}

// רושם את המכשיר להתראות push כשמחוברים, ומנווט לליד בלחיצה על התראה.
function PushRegistrar() {
  const { token } = useAuth();
  const handledInitial = useRef(false);

  useEffect(() => {
    if (token) registerForPush();
  }, [token]);

  useEffect(() => {
    const open = (data: unknown) => {
      const leadId = (data as { leadId?: string } | null)?.leadId;
      if (leadId) router.push(`/lead/${leadId}`);
    };
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      open(resp.notification.request.content.data);
    });
    // אם האפליקציה נפתחה מהתראה (מצב סגור)
    Notifications.getLastNotificationResponseAsync().then((resp) => {
      if (resp && !handledInitial.current) {
        handledInitial.current = true;
        open(resp.notification.request.content.data);
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <NewLeadAlert />
          <PushRegistrar />
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
          // כפתור החזרה בצד שמאל
          headerBackVisible: false,
          headerLeft: () => <HeaderBack />,
          // החלקה לחזרה מכל רוחב המסך (כמו יציאה מצ'אט בוואטסאפ), מודע ל-RTL
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard" options={{ title: 'הבית שלי', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="leads" options={{ title: 'הלידים שלך' }} />
        <Stack.Screen name="lead/[id]" options={{ title: 'פרטי ליד' }} />
        <Stack.Screen name="notifications" options={{ title: 'התראות', animation: 'slide_from_left', gestureEnabled: false, fullScreenGestureEnabled: false }} />
        <Stack.Screen name="settings" options={{ title: 'חשבון', animation: 'slide_from_right', fullScreenGestureEnabled: true }} />
      </Stack>
      <BrandSplash />
    </View>
  );
}
