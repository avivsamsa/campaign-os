import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { getLeads, getStatuses, type CustomStatus, type Lead } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, formatPhone, statusColor, statusLabel } from '../lib/theme';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const NONE = '__none__';

export default function Leads() {
  const { signOut } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const [ls, st] = await Promise.all([getLeads(), getStatuses().catch(() => [])]);
      setLeads(ls);
      setStatuses(st);
    } catch (e) {
      if (e instanceof Error && e.message === 'UNAUTHORIZED') {
        await signOut();
        router.replace('/login');
        return;
      }
      setErr('טעינת הלידים נכשלה');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [signOut]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const customMap = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);
  const label = (st: string) => statusLabel[st] ?? customMap.get(st)?.label ?? st;
  const color = (st: string) => statusColor[st] ?? colors.primary;

  // שער קטגוריות — נגזר מהלידים
  const gate = useMemo(() => {
    const map = new Map<string, number>();
    let uncategorized = 0;
    for (const l of leads) {
      if (l.category_name) map.set(l.category_name, (map.get(l.category_name) ?? 0) + 1);
      else uncategorized += 1;
    }
    const arr = [...map.entries()].map(([name, count]) => ({ key: name, name, count }));
    if (uncategorized > 0) arr.push({ key: NONE, name: 'אחר', count: uncategorized });
    return arr;
  }, [leads]);
  const needsGate = gate.length > 1;

  const categoryLeads = useMemo(() => {
    if (!needsGate || !selectedCategory) return leads;
    if (selectedCategory === NONE) return leads.filter((l) => !l.category_name);
    return leads.filter((l) => l.category_name === selectedCategory);
  }, [leads, needsGate, selectedCategory]);

  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categoryLeads;
    const qd = q.replace(/\D/g, '');
    return categoryLeads.filter(
      (l) =>
        (l.name ?? '').toLowerCase().includes(q) ||
        (qd && (l.phone ?? '').replace(/\D/g, '').includes(qd)),
    );
  }, [categoryLeads, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of searchFiltered) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [searchFiltered]);

  const filtered = useMemo(
    () => (statusFilter ? searchFiltered.filter((l) => l.status === statusFilter) : searchFiltered),
    [searchFiltered, statusFilter],
  );

  const summary = useMemo(() => {
    let closed = 0;
    let revenue = 0;
    for (const l of searchFiltered) {
      if (l.status === 'closed') {
        closed += 1;
        if (l.deal_value) revenue += Number(l.deal_value);
      }
    }
    return { total: searchFiltered.length, closed, revenue };
  }, [searchFiltered]);

  const chipStatuses = useMemo(() => {
    const present = Object.keys(counts);
    const builtinOrder = Object.keys(statusLabel).filter((s) => present.includes(s));
    const custom = present.filter((s) => !statusLabel[s]);
    return [...builtinOrder, ...custom];
  }, [counts]);

  const accountBtn = () => (
    <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
      <Text style={s.logout}>חשבון</Text>
    </Pressable>
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  // מסך שער קטגוריות
  if (needsGate && !selectedCategory) {
    return (
      <View style={s.gateWrap}>
        <Stack.Screen options={{ title: 'קטגוריה', headerRight: accountBtn }} />
        <Text style={s.gateTitle}>איזו קטגוריה?</Text>
        <Text style={s.sub}>בחר/י קטגוריה כדי לראות את הלידים שלה.</Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          {gate.map((c) => (
            <Pressable key={c.key} style={s.gateBtn} onPress={() => setSelectedCategory(c.key)}>
              <Text style={s.gateBtnName}>{c.name}</Text>
              <Text style={s.gateBtnCount}>{c.count} לידים</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Stack.Screen
        options={{
          title: needsGate ? (selectedCategory === NONE ? 'אחר' : selectedCategory ?? 'לידים') : 'הלידים שלך',
          headerRight: accountBtn,
          headerLeft: needsGate
            ? () => (
                <Pressable onPress={() => { setSelectedCategory(null); setStatusFilter(''); setSearch(''); }} hitSlop={10}>
                  <Text style={s.logout}>← קטגוריות</Text>
                </Pressable>
              )
            : undefined,
        }}
      />

      {/* כותרת קבועה: אנליטיקות + חיפוש + פילטר */}
      <View style={s.header}>
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{nf.format(summary.total)}</Text><Text style={s.statLbl}>לידים</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{nf.format(summary.closed)}</Text><Text style={s.statLbl}>נסגרו</Text></View>
          <View style={[s.stat, s.statFeature]}><Text style={s.statNum}>₪{nf.format(summary.revenue)}</Text><Text style={s.statLbl}>מכירות</Text></View>
        </View>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="חיפוש שם או טלפון…"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          <Pressable onPress={() => setStatusFilter('')} style={[s.filterChip, statusFilter === '' && s.filterChipActive]}>
            <Text style={[s.filterChipText, statusFilter === '' && { color: colors.primary }]}>הכל {summary.total}</Text>
          </Pressable>
          {chipStatuses.map((st) => (
            <Pressable
              key={st}
              onPress={() => setStatusFilter(statusFilter === st ? '' : st)}
              style={[s.filterChip, { borderColor: color(st) }, statusFilter === st && { backgroundColor: color(st) + '33' }]}
            >
              <Text style={[s.filterChipText, { color: color(st) }]}>{label(st)} {counts[st]}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: 14, paddingTop: 6, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={s.empty}>{err || 'אין לידים תואמים.'}</Text>}
        renderItem={({ item }) => (
          <Pressable style={[s.row, { borderRightColor: color(item.status) }]} onPress={() => router.push(`/lead/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{item.name ?? '—'}</Text>
              <Text style={s.meta} numberOfLines={1}>
                {item.phone ? formatPhone(item.phone) : ''}
                {item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}` : ''}
                {item.notes_count > 0 ? ` · ${item.notes_count} הערות` : ''}
              </Text>
            </View>
            <View style={[s.chip, { backgroundColor: color(item.status) + '33', borderColor: color(item.status) }]}>
              <Text style={[s.chipText, { color: color(item.status) }]}>{label(item.status)}</Text>
            </View>
            {item.phone ? (
              <View style={s.actions}>
                <Pressable style={[s.actBtn, { backgroundColor: colors.wa }]} onPress={() => Linking.openURL(`https://wa.me/${item.phone!.replace(/\D/g, '')}`)}><Text style={s.actIcon}>W</Text></Pressable>
                <Pressable style={[s.actBtn, { backgroundColor: colors.primary }]} onPress={() => Linking.openURL(`tel:${item.phone}`)}><Text style={s.actIcon}>☎</Text></Pressable>
              </View>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  logout: { color: colors.muted, fontSize: 15, marginHorizontal: 6 },
  header: { paddingHorizontal: 14, paddingTop: 10, gap: 10, borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: 10 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statFeature: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  statNum: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statLbl: { color: colors.muted, fontSize: 12, marginTop: 2 },
  searchInput: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: 15, textAlign: 'right' },
  chipsRow: { gap: 8, paddingVertical: 2 },
  filterChip: { borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  filterChipText: { color: colors.text2, fontSize: 13, fontWeight: '600' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRightWidth: 4, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'right' },
  meta: { color: colors.muted, fontSize: 13, textAlign: 'right', marginTop: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6 },
  actBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  actIcon: { color: '#fff', fontSize: 16, fontWeight: '700' },
  gateWrap: { flex: 1, backgroundColor: colors.bg, padding: 22, justifyContent: 'center' },
  gateTitle: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'right' },
  sub: { color: colors.muted, fontSize: 14, textAlign: 'right', marginTop: 6 },
  gateBtn: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gateBtnName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  gateBtnCount: { color: colors.muted, fontSize: 14 },
});
