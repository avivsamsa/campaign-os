import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { addNote, getLeads, getNotes, updateLead, type Lead, type Note } from '../../lib/api';
import { BUILTIN_STATUSES, colors, formatPhone, statusColor, statusLabel } from '../../lib/theme';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const dt = (iso: string) => new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function noteText(n: Note): string {
  const m = n.meta ?? {};
  switch (n.kind) {
    case 'status': return `סטטוס: ${statusLabel[m.from] ?? m.from} ← ${statusLabel[m.to] ?? m.to}`;
    case 'purchase': return `סומן רכישה${m.amount != null ? ` · ₪${nf.format(Number(m.amount))}` : ''}`;
    case 'irrelevant': return `לא רלוונטי${m.reason ? ` · ${m.reason}` : ''}`;
    default: return n.body;
  }
}

export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [leads, ns] = await Promise.all([getLeads(), getNotes(id).catch(() => [])]);
      setLead(leads.find((l) => l.id === id) ?? null);
      setNotes(ns);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(st: string) {
    if (st === 'irrelevant') {
      Alert.alert('לא רלוונטי', 'סימון "לא רלוונטי" דורש בחירת סיבה — בצע/י בפורטל הווב.');
      return;
    }
    try {
      if (st === 'closed' && Platform.OS === 'ios') {
        Alert.prompt('סכום הרכישה', 'הזן/י סכום בש"ח', async (val) => {
          const amount = val ? Number(val.replace(/[^\d.]/g, '')) : null;
          await updateLead(id, { status: 'closed', deal_value: amount });
          load();
        }, 'plain-text', '', 'numeric');
        return;
      }
      await updateLead(id, { status: st, ...(st === 'closed' ? { deal_value: null } : {}) });
      load();
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'עדכון נכשל');
    }
  }

  async function submitNote() {
    const text = body.trim();
    if (!text) return;
    setSaving(true);
    try {
      const d = await addNote(id, text);
      setNotes((prev) => [d.note, ...prev]);
      setBody('');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (!lead) {
    return <View style={s.center}><Text style={{ color: colors.muted }}>הליד לא נמצא.</Text></View>;
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={s.name}>{lead.name ?? 'ליד'}</Text>
        {lead.created_at ? <Text style={s.sub}>נכנס {dt(lead.created_at)}</Text> : null}
      </View>

      {lead.phone ? (
        <View style={s.phoneRow}>
          <Text style={s.phone}>{formatPhone(lead.phone)}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[s.pill, { backgroundColor: colors.wa }]} onPress={() => Linking.openURL(`https://wa.me/${lead.phone!.replace(/\D/g, '')}`)}>
              <Text style={s.pillText}>וואטסאפ</Text>
            </Pressable>
            <Pressable style={[s.pill, { backgroundColor: colors.primary }]} onPress={() => Linking.openURL(`tel:${lead.phone}`)}>
              <Text style={s.pillText}>חיוג</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View>
        <Text style={s.label}>סטטוס</Text>
        <View style={s.statusWrap}>
          {BUILTIN_STATUSES.map((st) => {
            const active = lead.status === st;
            const c = statusColor[st] ?? colors.primary;
            return (
              <Pressable
                key={st}
                onPress={() => changeStatus(st)}
                style={[s.statusChip, { borderColor: c }, active && { backgroundColor: c + '33' }]}
              >
                <Text style={[s.statusChipText, { color: active ? c : colors.text2 }]}>{statusLabel[st]}</Text>
              </Pressable>
            );
          })}
        </View>
        {lead.status === 'closed' && lead.deal_value ? (
          <Text style={s.deal}>סכום: ₪{nf.format(Number(lead.deal_value))}</Text>
        ) : null}
        {lead.status === 'irrelevant' && lead.reason_label ? (
          <Text style={s.sub}>סיבה: {lead.reason_label}</Text>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <Text style={s.label}>יומן הליד</Text>
        <View style={{ gap: 8 }}>
          <TextInput
            style={s.noteInput}
            value={body}
            onChangeText={setBody}
            placeholder="מה קרה בשיחה?"
            placeholderTextColor={colors.muted}
            multiline
          />
          <Pressable style={[s.addBtn, (saving || !body.trim()) && { opacity: 0.5 }]} onPress={submitNote} disabled={saving || !body.trim()}>
            <Text style={s.addBtnText}>{saving ? 'שומר…' : 'הוסף הערה'}</Text>
          </Pressable>
        </View>

        {notes.length === 0 ? (
          <Text style={s.sub}>עדיין אין רשומות.</Text>
        ) : (
          notes.map((n) => (
            <View key={n.id} style={s.noteItem}>
              <Text style={s.noteTime}>{dt(n.created_at)}</Text>
              <Text style={s.noteBody}>{noteText(n)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  sub: { color: colors.muted, fontSize: 13, textAlign: 'right', marginTop: 2 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 8 },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 12,
  },
  phone: { color: colors.text, fontSize: 17, fontWeight: '600' },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  statusChipText: { fontSize: 13, fontWeight: '600' },
  deal: { color: colors.ok, fontWeight: '700', textAlign: 'right', marginTop: 8 },
  noteInput: {
    backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 12,
    padding: 12, color: colors.text, fontSize: 15, minHeight: 70, textAlign: 'right', textAlignVertical: 'top',
  },
  addBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  noteItem: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 },
  noteTime: { color: colors.muted2, fontSize: 12, textAlign: 'right' },
  noteBody: { color: colors.text, fontSize: 15, textAlign: 'right', marginTop: 4 },
});
