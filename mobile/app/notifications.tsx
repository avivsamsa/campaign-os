import { useMemo, useState } from 'react';
import { FlatList, I18nManager, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useData } from '../lib/data';
import { useColors } from '../lib/theme-context';
import type { Palette } from '../lib/theme';
import { FadeIn } from '../lib/anim';

const rowDir = I18nManager.isRTL ? 'row' : 'row-reverse';

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'הרגע';
  if (m < 60) return `לפני ${m} ד׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} ש׳`;
  const d = Math.floor(h / 24);
  if (d < 7) return `לפני ${d} י׳`;
  return `לפני ${Math.floor(d / 7)} שב׳`;
}

function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase() || '?';
}

export default function Notifications() {
  const { leads, ready, refresh } = useData();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [refreshing, setRefreshing] = useState(false);

  const newLeads = useMemo(
    () => leads.filter((l) => l.status === 'new').sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [leads],
  );

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <View style={s.wrap}>
      <Stack.Screen options={{ title: 'התראות' }} />
      <FlatList
        data={newLeads}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
        ListHeaderComponent={newLeads.length ? <Text style={s.sectionHead}>חדש</Text> : null}
        ListEmptyComponent={
          !ready ? null : (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Feather name="bell" size={26} color={c.muted} /></View>
              <Text style={s.emptyText}>אין התראות חדשות</Text>
              <Text style={s.emptySub}>כאן יופיעו לידים חדשים ברגע שייכנסו</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <FadeIn index={index} delay={20}>
            <Pressable
              style={({ pressed }) => [s.row, { flexDirection: rowDir }, pressed && s.rowPressed]}
              onPress={() => router.push(`/lead/${item.id}`)}
            >
              <View style={s.avatarWrap}>
                <View style={s.avatar}><Text style={s.avatarTxt}>{initials(item.name)}</Text></View>
                <View style={s.avatarBadge}><Feather name="user-plus" size={11} color="#fff" /></View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={2}>
                  <Text style={s.titleBold}>{item.name || 'ליד חדש'}</Text>
                  {' — ליד חדש ממתין לטיפול'}
                </Text>
                <Text style={s.meta} numberOfLines={1}>
                  {item.category_name ? `${item.category_name} · ` : ''}
                  {timeAgo(item.created_at)}
                </Text>
              </View>

              <View style={s.unreadDot} />
            </Pressable>
          </FadeIn>
        )}
      />
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg },
  sectionHead: { color: c.text, fontSize: 20, fontWeight: '800', textAlign: 'right', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  row: { alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, backgroundColor: c.primarySoft },
  rowPressed: { backgroundColor: c.surface2 },
  avatarWrap: { width: 54, height: 54 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  avatarTxt: { color: c.text2, fontSize: 19, fontWeight: '800' },
  avatarBadge: { position: 'absolute', bottom: -1, left: -1, width: 22, height: 22, borderRadius: 11, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.bg },
  title: { color: c.text2, fontSize: 15, textAlign: 'right', lineHeight: 21 },
  titleBold: { color: c.text, fontWeight: '800' },
  meta: { color: c.muted, fontSize: 13, textAlign: 'right', marginTop: 3 },
  unreadDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: c.primary },
  empty: { alignItems: 'center', paddingTop: 90, gap: 8 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyText: { color: c.text2, fontSize: 16, fontWeight: '700' },
  emptySub: { color: c.muted2, fontSize: 13.5 },
});
