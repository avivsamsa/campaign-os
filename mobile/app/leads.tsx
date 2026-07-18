import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { getLeads, getStatuses, type CustomStatus, type Lead } from '../lib/api';
import { useAuth } from '../lib/auth';
import { colors, formatPhone, statusColor, statusLabel } from '../lib/theme';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });

export default function Leads() {
  const { signOut } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');

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

  useEffect(() => {
    load();
  }, [load]);

  const customMap = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);
  const label = (st: string) => statusLabel[st] ?? customMap.get(st)?.label ?? st;
  const color = (st: string) => statusColor[st] ?? colors.primary;

  const summary = useMemo(() => {
    let closed = 0;
    let revenue = 0;
    for (const l of leads) {
      if (l.status === 'closed') {
        closed += 1;
        if (l.deal_value) revenue += Number(l.deal_value);
      }
    }
    return { total: leads.length, closed, revenue };
  }, [leads]);

  function call(phone: string) {
    Linking.openURL(`tel:${phone}`).catch(() => {});
  }
  function whatsapp(phone: string) {
    Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`).catch(() => {});
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={async () => { await signOut(); router.replace('/login'); }} hitSlop={10}>
              <Text style={s.logout}>התנתקות</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={leads}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: 14, gap: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={s.stats}>
            <View style={s.stat}>
              <Text style={s.statNum}>{nf.format(summary.total)}</Text>
              <Text style={s.statLbl}>לידים</Text>
            </View>
            <View style={s.stat}>
              <Text style={s.statNum}>{nf.format(summary.closed)}</Text>
              <Text style={s.statLbl}>נסגרו</Text>
            </View>
            <View style={[s.stat, s.statFeature]}>
              <Text style={s.statNum}>₪{nf.format(summary.revenue)}</Text>
              <Text style={s.statLbl}>מכירות</Text>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={s.empty}>{err || 'אין לידים עדיין.'}</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={[s.row, { borderRightColor: color(item.status) }]}
            onPress={() => router.push(`/lead/${item.id}`)}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.name ?? '—'}</Text>
              <Text style={s.meta}>
                {item.phone ? formatPhone(item.phone) : ''}
                {item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}` : ''}
              </Text>
            </View>
            <View style={[s.chip, { backgroundColor: color(item.status) + '33', borderColor: color(item.status) }]}>
              <Text style={[s.chipText, { color: color(item.status) }]}>{label(item.status)}</Text>
            </View>
            {item.phone ? (
              <View style={s.actions}>
                <Pressable style={[s.actBtn, { backgroundColor: colors.wa }]} onPress={() => whatsapp(item.phone!)}>
                  <Text style={s.actIcon}>W</Text>
                </Pressable>
                <Pressable style={[s.actBtn, { backgroundColor: colors.primary }]} onPress={() => call(item.phone!)}>
                  <Text style={s.actIcon}>☎</Text>
                </Pressable>
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
  stats: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  stat: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statFeature: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  statNum: { color: colors.text, fontSize: 19, fontWeight: '800' },
  statLbl: { color: colors.muted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRightWidth: 4,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '600', textAlign: 'right' },
  meta: { color: colors.muted, fontSize: 13, textAlign: 'right', marginTop: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6 },
  actBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  actIcon: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
