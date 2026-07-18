import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useColors } from '../lib/theme-context';

export default function Index() {
  const c = useColors();
  const { token, ready } = useAuth();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  return <Redirect href={token ? '/dashboard' : '/login'} />;
}
