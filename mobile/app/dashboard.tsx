import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, I18nManager, PanResponder, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data';
import { useColors } from '../lib/theme-context';
import { CONTENT_MAX, type Palette } from '../lib/theme';
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

  // swipe אופקי בדשבורד (כמו אינסטגרם): ימין→שמאל = התראות, שמאל→ימין = חשבון.
  // מזהה רק תנועה אופקית מובהקת כדי לא להתנגש בגלילה האנכית.
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 26 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -55) router.push('/notifications');
        else if (g.dx >= 55) router.push('/settings');
      },
    }),
  ).current;

  if (!ready && !dashboard) return <View style={s.center}><ActivityIndicator color={c.primary} /></View>;

  return (
    <View style={s.wrap} {...swipe.panHandlers}>
      <Stack.Screen
        options={{
          title: clientName ?? dashboard?.client_name ?? 'הבית שלי',
          // התראות בצד ימין, חשבון בצד שמאל
          headerLeft: () => (
            <Pressable onPress={() => router.push('/notifications')} hitSlop={12} accessibilityLabel="התראות" style={s.bellBtn}>
              <Feather name="bell" size={22} color={c.text2} />
              {newCount > 0 ? (
                <View style={s.countPill}>
                  <Text style={s.countText}>{newCount > 99 ? '99+' : newCount}</Text>
                </View>
              ) : null}
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={12} accessibilityLabel="חשבון" style={s.iconBtn}>
              <Feather name="user" size={22} color={c.text2} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 18, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
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
            <View style={{ gap: 12, marginTop: 14 }}>
              {dashboard.categories.map((cat, i) => {
                const pct = cat.count > 0 ? Math.max(4, Math.min(100, Math.round((cat.new_count / cat.count) * 100))) : 0;
                return (
                  <FadeIn key={cat.key} index={i} delay={360}>
                    <PressableScale
                      style={s.catCard}
                      onPress={() => router.push({ pathname: '/leads', params: { category: cat.key, name: cat.name } })}
                      accessibilityLabel={`${cat.name}, ${cat.count} לידים`}
                    >
                      <View style={[s.catTop, { flexDirection: rowDir }]}>
                        <View style={[s.catLead, { flexDirection: rowDir }]}>
                          <View style={s.catIcon}><Feather name="layers" size={19} color={c.primary} /></View>
                          <View style={{ gap: 2 }}>
                            <Text style={s.catName}>{cat.name}</Text>
                            <Text style={[s.catCount, num]}>{nf.format(cat.count)} לידים</Text>
                          </View>
                        </View>
                        <View style={[s.catTrail, { flexDirection: rowDir }]}>
                          {cat.new_count > 0 ? (
                            <View style={s.newPill}>
                              <Text style={[s.newPillText, num]}>{nf.format(cat.new_count)} חדשים</Text>
                            </View>
                          ) : null}
                          <Feather name={chevron} size={18} color={c.muted2} />
                        </View>
                      </View>
                      <View style={s.track}>
                        <View style={[s.trackFill, { width: `${pct}%` }]} />
                      </View>
                    </PressableScale>
                  </FadeIn>
                );
              })}
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
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  bellBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2, paddingVertical: 4 },
  countPill: { backgroundColor: c.primary, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { color: '#fff', fontSize: 12, fontWeight: '800', includeFontPadding: false },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cardWrap: { width: '47%', flexGrow: 1 },
  card: { backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 8, borderWidth: c.isDark ? 0 : 1, borderColor: c.border },
  cardTop: { alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { color: c.muted, fontSize: 12.5, fontWeight: '500' },
  cardValue: { color: c.text, fontSize: 23, fontWeight: '800', textAlign: 'right', letterSpacing: -0.4 },
  cta: { marginTop: 18, backgroundColor: c.surface, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  ctaText: { color: c.text2, fontSize: 15.5, fontWeight: '700' },
  section: { color: c.text2, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  catCard: { backgroundColor: c.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, gap: 13, borderWidth: c.isDark ? 0 : 1, borderColor: c.border },
  catTop: { alignItems: 'center', justifyContent: 'space-between' },
  catLead: { alignItems: 'center', gap: 12 },
  catIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  catName: { color: c.text, fontSize: 16.5, fontWeight: '800', textAlign: 'right' },
  catCount: { color: c.muted, fontSize: 13, textAlign: 'right' },
  catTrail: { alignItems: 'center', gap: 10 },
  newPill: { backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  newPillText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
  track: { height: 5, borderRadius: 3, backgroundColor: c.isDark ? c.surface2 : c.border, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3, backgroundColor: c.primary },
});
