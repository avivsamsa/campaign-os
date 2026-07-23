import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useColors } from '../lib/theme-context';
import NotificationsView from '../components/NotificationsView';

// Route עצמאי (deep-link) — התצוגה הראשית של ההתראות היא דף ב-pager שבדשבורד.
export default function NotificationsRoute() {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: 'התראות' }} />
      <NotificationsView />
    </View>
  );
}
