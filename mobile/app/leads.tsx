import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  I18nManager,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useData } from '../lib/data';
import { colors, formatPhone, statusColor, statusLabel } from '../lib/theme';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const rowDir = I18nManager.isRTL ? 'row' : 'row-reverse';

export default function Leads() {
  const { leads, statuses, ready, refresh } = useData();
  const { category, name } = useLocalSearchParams<{ category?: string; name?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const customMap = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);
  const label = (st: string) => statusLabel[st] ?? customMap.get(st)?.label ?? st;
  const color = (st: string) => statusColor[st] ?? colors.primary;

  const categoryLeads = useMemo(() => {
    if (!category) return leads;
    if (category === '__none__') return leads.filter((l) => !l.category_id);
    return leads.filter((l) => l.category_id === category);
  }, [leads, category]);

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
    const builtinOrder = Object.keys(statusLabel).filter((st) => present.includes(st));
    const custom = present.filter((st) => !statusLabel[st]);
    return [...builtinOrder, ...custom];
  }, [counts]);

  // ספינר רק אם המאגר עדיין ריק בטעינה הראשונה
  if (!ready && leads.length === 0) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <View style={s.wrap}>
      <Stack.Screen options={{ title: name ?? 'הלידים שלך' }} />

      <View style={s.header}>
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statNum}>{nf.format(summary.total)}</Text><Text style={s.statLbl}>לידים</Text></View>
          <View style={s.stat}><Text style={s.statNum}>{nf.format(summary.closed)}</Text><Text style={s.statLbl}>נסגרו</Text></View>
          <View style={[s.stat, s.statFeature]}><Text style={s.statNum}>₪{nf.format(summary.revenue)}</Text><Text style={s.statLbl}>מכירות</Text></View>
        </View>
        <TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder="חיפוש שם או טלפון…" placeholderTextColor={colors.muted} returnKeyType="search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          <Pressable onPress={() => setStatusFilter('')} style={[s.filterChip, statusFilter === '' && s.filterChipActive]}>
            <Text style={[s.filterChipText, statusFilter === '' && { color: colors.primary }]}>הכל {summary.total}</Text>
          </Pressable>
          {chipStatuses.map((st) => (
            <Pressable key={st} onPress={() => setStatusFilter(statusFilter === st ? '' : st)} style={[s.filterChip, { borderColor: color(st) }, statusFilter === st && { backgroundColor: color(st) + '33' }]}>
              <Text style={[s.filterChipText, { color: color(st) }]}>{label(st)} {counts[st]}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: 14, paddingTop: 6, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={s.empty}>אין לידים תואמים.</Text>}
        renderItem={({ item }) => (
          <Pressable style={[s.row, { flexDirection: rowDir, borderRightColor: color(item.status) }]} onPress={() => router.push(`/lead/${item.id}`)}>
            {/* ימין: שם + טלפון/תאריך */}
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>{item.name ?? '—'}</Text>
              <Text style={s.meta} numberOfLines={1}>
                {item.phone ? formatPhone(item.phone) : ''}
                {item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}` : ''}
                {item.notes_count > 0 ? ` · ${item.notes_count} הערות` : ''}
              </Text>
            </View>
            {/* שמאל: סטטוס + כפתורים מקובצים */}
            <View style={[s.trailing, { flexDirection: rowDir }]}>
              <View style={[s.chip, { backgroundColor: color(item.status) + '33', borderColor: color(item.status) }]}>
                <Text style={[s.chipText, { color: color(item.status) }]}>{label(item.status)}</Text>
              </View>
              {item.phone ? (
                <>
                  <Pressable style={[s.actBtn, { backgroundColor: colors.wa }]} onPress={() => Linking.openURL(`https://wa.me/${item.phone!.replace(/\D/g, '')}`)}><FontAwesome name="whatsapp" size={18} color="#fff" /></Pressable>
                  <Pressable style={[s.actBtn, { backgroundColor: colors.primary }]} onPress={() => Linking.openURL(`tel:${item.phone}`)}><Feather name="phone" size={16} color="#fff" /></Pressable>
                </>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
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
  row: { alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRightWidth: 4, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'right' },
  meta: { color: colors.muted, fontSize: 13, textAlign: 'right', marginTop: 2 },
  trailing: { alignItems: 'center', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  actBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
