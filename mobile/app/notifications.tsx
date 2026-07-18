import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getLeads, type Lead } from '../lib/api';
import { colors, formatPhone } from '../lib/theme';

const rowDir = I18nManager.isRTL ? 'row' : 'row-reverse';
const dtl = (iso: string) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function Notifications() {
  const [newLeads, setNewLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const ls = await getLeads();
      setNewLeads(ls.filter((l) => l.status === 'new'));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <FlatList
      style={s.wrap}
      data={newLeads}
      keyExtractor={(l) => l.id}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      ListHeaderComponent={newLeads.length > 0 ? <Text style={s.head}>לידים חדשים שממתינים לטיפול</Text> : null}
      ListEmptyComponent={<Text style={s.empty}>אין התראות חדשות ✓</Text>}
      renderItem={({ item }) => (
        <Pressable style={[s.item, { flexDirection: rowDir }]} onPress={() => router.push(`/lead/${item.id}`)}>
          <View style={s.dot} />
          <View style={{ flex: 1 }}>
            <Text style={s.title}>ליד חדש: {item.name ?? '—'}</Text>
            <Text style={s.sub}>
              {item.phone ? formatPhone(item.phone) : ''}
              {item.created_at ? ` · ${dtl(item.created_at)}` : ''}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  head: { color: colors.muted, fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 50 },
  item: { alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  title: { color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'right' },
  sub: { color: colors.muted, fontSize: 13, textAlign: 'right', marginTop: 3 },
});
