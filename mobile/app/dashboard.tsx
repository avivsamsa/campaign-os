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
  const { dashboard, leads, unreadMessages, ready, refresh } = useData();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [refreshing, setRefreshing] = useState(false);

  // באדג' הפעמון = לידים חדשים + עדכונים שלא נקראו
  const newLeadCount = useMemo(() => leads.filter((l) => l.status === 'new').length, [leads]);
  const newCount = newLeadCount + unreadMessages;

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
          headerLeft: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityLabel="חשבון">
              <Text style={s.headerText}>חשבון</Text>
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
        contentContainerStyle={{ padding: 20, paddingTop: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn><Text style={s.kicker}>במבט-על</Text></FadeIn>

        <View style={s.grid}>
          {KPIS.map((k, i) => (
            <FadeIn key={k.key} index={i} delay={40} style={s.cardWrap}>
              <View style={s.card}>
                <View style={[s.cardTop, { flexDirection: rowDir }]}>
                  <Text style={s.cardLabel}>{k.label}</Text>
                  <Feather name={k.icon} size={15} color={c.muted2} />
                </View>
                <Text style={[s.cardValue, num, k.accent && newLeadCount > 0 && { color: c.primary }]}>
                  {value(k.key, k.money)}
                </Text>
              </View>
            </FadeIn>
          ))}
        </View>

        <FadeIn delay={300}>
          <PressableScale style={s.cta} onPress={() => router.push('/leads')} accessibilityLabel="כל הלידים">
            <Feather name={chevron} size={20} color="#fff" />
            <Text style={s.ctaText}>כל הלידים</Text>
          </PressableScale>
        </FadeIn>

        {dashboard && dashboard.categories.length > 1 ? (
          <View style={{ marginTop: 28 }}>
            <FadeIn delay={360}><Text style={s.section}>הקטגוריות שלי</Text></FadeIn>
            <View style={{ gap: 10, marginTop: 12 }}>
              {dashboard.categories.map((cat, i) => (
                <FadeIn key={cat.key} index={i} delay={420}>
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
  headerText: { color: c.muted, fontSize: 15, marginHorizontal: 8 },
  bellWrap: { paddingHorizontal: 10, paddingVertical: 6, marginRight: 2 },
  badge: { position: 'absolute', top: 0, right: 2, backgroundColor: c.primary, minWidth: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: c.bg },
  badgeText: { color: '#fff', fontSize: 10.5, fontWeight: '800', lineHeight: 14, includeFontPadding: false, textAlign: 'center' },
  kicker: { color: c.muted2, fontSize: 12.5, fontWeight: '700', letterSpacing: 1, textAlign: 'right', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardWrap: { width: '47%', flexGrow: 1 },
  card: { backgroundColor: c.surface, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, gap: 14, borderWidth: c.isDark ? 0 : 1, borderColor: c.border },
  cardTop: { alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { color: c.muted, fontSize: 13.5, fontWeight: '500' },
  cardValue: { color: c.text, fontSize: 30, fontWeight: '800', textAlign: 'right', letterSpacing: -0.5 },
  cta: { marginTop: 22, backgroundColor: c.primary, borderRadius: 16, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { color: '#fff', fontSize: 16.5, fontWeight: '800' },
  section: { color: c.text2, fontSize: 15, fontWeight: '700', textAlign: 'right' },
  catRow: { alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 17, borderWidth: c.isDark ? 0 : 1, borderColor: c.border },
  catName: { color: c.text, fontSize: 16.5, fontWeight: '700' },
  catRight: { alignItems: 'center', gap: 8 },
  catCount: { color: c.muted, fontSize: 13.5 },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
});
