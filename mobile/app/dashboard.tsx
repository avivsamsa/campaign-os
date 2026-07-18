import { useMemo, useState } from 'react';
import { ActivityIndicator, I18nManager, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data';
import { useColors } from '../lib/theme-context';
import type { Palette } from '../lib/theme';
import { FadeIn, PressableScale } from '../lib/anim';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const rowDir = I18nManager.isRTL ? 'row' : 'row-reverse';
const chevron = I18nManager.isRTL ? 'chevron-left' : 'chevron-right';
const num = { fontVariant: ['tabular-nums' as const] };

type KpiKey = 'leads' | 'new' | 'revenue' | 'profit';
const KPIS: { key: KpiKey; label: string; icon: keyof typeof Feather.glyphMap; money?: boolean; accent?: boolean }[] = [
  { key: 'leads', label: 'סה״כ לידים', icon: 'users' },
  { key: 'new', label: 'חדשים לטיפול', icon: 'inbox', accent: true },
  { key: 'revenue', label: 'מכירות', icon: 'shopping-bag', money: true },
  { key: 'profit', label: 'רווח', icon: 'trending-up', money: true },
];

export default function Dashboard() {
  const { clientName } = useAuth();
  const { dashboard, leads, unreadMessages, readLeads, ready, refresh } = useData();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [refreshing, setRefreshing] = useState(false);

  const newLeadCount = useMemo(() => leads.filter((l) => l.status === 'new').length, [leads]);
  const unreadLeadCount = useMemo(
    () => leads.filter((l) => l.status === 'new' && !readLeads.has(l.id)).length,
    [leads, readLeads],
  );
  const newCount = unreadLeadCount + unreadMessages;

  const t = dashboard?.totals;
  const value = (k: KpiKey, money?: boolean) => {
    const v = t ? t[k] : 0;
    return money ? `₪${nf.format(v)}` : nf.format(v);
  };

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  if (!ready && !dashboard) return <View style={s.center}><ActivityIndicator color={c.primary} /></View>;

  return (
    <View style={s.wrap}>
      <Stack.Screen
        options={{
          title: clientName ?? dashboard?.client_name ?? 'הבית שלי',
          // חשבון בצד שמאל (אייקון משתמש), התראות בצד ימין
          headerLeft: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityLabel="חשבון" style={s.iconBtn}>
              <Feather name="user" size={22} color={c.text2} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/notifications')} hitSlop={12} accessibilityLabel="התראות" style={s.bellWrap}>
              <Feather name="bell" size={22} color={c.text2} />
              {newCount > 0 ? (
                <View style={s.badge}>
                  <Text style={s.badgeText} numberOfLines={1}>{newCount > 99 ? '99+' : newCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.grid}>
          {KPIS.map((k, i) => (
            <FadeIn key={k.key} index={i} style={s.cardWrap}>
              <View style={s.card}>
                <View style={[s.cardTop, { flexDirection: rowDir }]}>
                  <Text style={s.cardLabel}>{k.label}</Text>
                  <Feather name={k.icon} size={13} color={c.muted2} />
                </View>
                <Text style={[s.cardValue, num, k.accent && newLeadCount > 0 && { color: c.primary }]}>
                  {value(k.key, k.money)}
                </Text>
              </View>
            </FadeIn>
          ))}
        </View>

        <FadeIn delay={240}>
          <PressableScale style={s.cta} onPress={() => router.push('/leads')} accessibilityLabel="כל הלידים">
            <Text style={s.ctaText}>כל הלידים</Text>
          </PressableScale>
        </FadeIn>

        {dashboard && dashboard.categories.length > 1 ? (
          <View style={{ marginTop: 26 }}>
            <FadeIn delay={300}><Text style={s.section}>קמפיינים פעילים</Text></FadeIn>
            <View style={{ gap: 10, marginTop: 14 }}>
              {dashboard.categories.map((cat, i) => (
                <FadeIn key={cat.key} index={i} delay={360}>
                  <PressableScale
                    style={[s.catRow, { flexDirection: rowDir }]}
                    onPress={() => router.push({ pathname: '/leads', params: { category: cat.key, name: cat.name } })}
                    accessibilityLabel={`${cat.name}, ${cat.count} לידים`}
                  >
                    <Text style={s.catName}>{cat.name}</Text>
                    <View style={[s.catRight, { flexDirection: rowDir }]}>
                      {cat.new_count > 0 ? <View style={s.newDot} /> : null}
                      <Text style={[s.catCount, num]}>{nf.format(cat.count)} לידים</Text>
                      <Feather name={chevron} size={18} color={c.muted2} />
                    </View>
                  </PressableScale>
                </FadeIn>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  bellWrap: { paddingHorizontal: 8, paddingVertical: 6 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: c.primary, minWidth: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: c.bg },
  badgeText: { color: '#fff', fontSize: 10.5, fontWeight: '800', lineHeight: 14, includeFontPadding: false, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardWrap: { width: '47%', flexGrow: 1 },
  card: { backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 8, borderWidth: c.isDark ? 0 : 1, borderColor: c.border },
  cardTop: { alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { color: c.muted, fontSize: 12.5, fontWeight: '500' },
  cardValue: { color: c.text, fontSize: 23, fontWeight: '800', textAlign: 'right', letterSpacing: -0.4 },
  cta: { marginTop: 18, backgroundColor: c.surface, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  ctaText: { color: c.text2, fontSize: 15.5, fontWeight: '700' },
  section: { color: c.text2, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  catRow: { alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 17, borderWidth: c.isDark ? 0 : 1, borderColor: c.border },
  catName: { color: c.text, fontSize: 16.5, fontWeight: '700' },
  catRight: { alignItems: 'center', gap: 8 },
  catCount: { color: c.muted, fontSize: 13.5 },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
});
