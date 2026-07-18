import { useCallback, useState } from 'react';
import { ActivityIndicator, I18nManager, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { getDashboard, type DashboardData } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors } from '../lib/theme';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const rowDir = I18nManager.isRTL ? 'row' : 'row-reverse'; // כותרת ימין, ערך שמאל בשני המצבים

export default function Dashboard() {
  const { signOut, clientName } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getDashboard());
    } catch (e) {
      if (e instanceof Error && e.message === 'UNAUTHORIZED') {
        await signOut();
        router.replace('/login');
        return;
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [signOut]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const t = data?.totals;
  const newCount = t?.new ?? 0;

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <View style={s.wrap}>
      <Stack.Screen
        options={{
          title: clientName ?? 'הבית שלי',
          headerLeft: () => (
            <Pressable onPress={() => router.push('/settings')} hitSlop={10}><Text style={s.headerBtn}>חשבון</Text></Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/notifications')} hitSlop={10} style={s.bellWrap}>
              <Text style={s.bell}>🔔</Text>
              {newCount > 0 ? (
                <View style={s.badge}><Text style={s.badgeText}>{newCount > 99 ? '99+' : newCount}</Text></View>
              ) : null}
            </Pressable>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <Text style={s.h1}>שלום 👋</Text>

        {/* KPIs */}
        <View style={s.kpiGrid}>
          <View style={s.kpi}><Text style={s.kpiNum}>{nf.format(t?.leads ?? 0)}</Text><Text style={s.kpiLbl}>סה״כ לידים</Text></View>
          <View style={[s.kpi, s.kpiAccent]}><Text style={s.kpiNum}>{nf.format(newCount)}</Text><Text style={s.kpiLbl}>חדשים לטיפול</Text></View>
          <View style={s.kpi}><Text style={s.kpiNum}>₪{nf.format(t?.revenue ?? 0)}</Text><Text style={s.kpiLbl}>מכירות</Text></View>
          <View style={[s.kpi, s.kpiAccent]}><Text style={s.kpiNum}>₪{nf.format(t?.profit ?? 0)}</Text><Text style={s.kpiLbl}>רווח</Text></View>
        </View>

        {/* כל הלידים */}
        <Pressable style={s.allBtn} onPress={() => router.push('/leads')}>
          <Text style={s.allBtnText}>כל הלידים ←</Text>
        </Pressable>

        {/* קטגוריות */}
        {data && data.categories.length > 1 ? (
          <View style={{ gap: 10 }}>
            <Text style={s.section}>הקטגוריות שלי</Text>
            {data.categories.map((c) => (
              <Pressable
                key={c.key}
                style={[s.catBtn, { flexDirection: rowDir }]}
                onPress={() => router.push({ pathname: '/leads', params: { category: c.key, name: c.name } })}
              >
                <Text style={s.catName}>{c.name}</Text>
                <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 8 }}>
                  {c.new_count > 0 ? <View style={s.catNewDot} /> : null}
                  <Text style={s.catCount}>{c.count} לידים</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  headerBtn: { color: colors.muted, fontSize: 15, marginHorizontal: 8 },
  bellWrap: { paddingHorizontal: 6 },
  bell: { fontSize: 20 },
  badge: { position: 'absolute', top: -4, right: 0, backgroundColor: colors.danger, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  h1: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'right' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { width: '47%', flexGrow: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  kpiAccent: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  kpiNum: { color: colors.text, fontSize: 24, fontWeight: '800' },
  kpiLbl: { color: colors.muted, fontSize: 13, marginTop: 4 },
  allBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  allBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  section: { color: colors.muted, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  catBtn: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 18, justifyContent: 'space-between', alignItems: 'center' },
  catName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  catCount: { color: colors.muted, fontSize: 14 },
  catNewDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
});
