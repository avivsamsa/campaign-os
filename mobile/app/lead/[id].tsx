import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  addNote,
  addReason,
  getLeads,
  getNotes,
  getReasons,
  getStatuses,
  updateLead,
  type CustomStatus,
  type Lead,
  type Note,
  type Reason,
} from '../../lib/api';
import { BUILTIN_STATUSES, colors, formatPhone, statusColor, statusLabel } from '../../lib/theme';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const dt = (iso: string) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function kindColor(k?: string): string {
  switch (k) {
    case 'status': return '#3b82f6';
    case 'purchase': return '#16a34a';
    case 'irrelevant': return '#ef4444';
    default: return colors.primary;
  }
}

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
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const [amountModal, setAmountModal] = useState(false);
  const [amountVal, setAmountVal] = useState('');
  const [reasonModal, setReasonModal] = useState(false);
  const [reasons, setReasons] = useState<{ admin: Reason[]; client: Reason[] }>({ admin: [], client: [] });
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [newReason, setNewReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [leads, ns, sts] = await Promise.all([
        getLeads(),
        getNotes(id).catch(() => []),
        getStatuses().catch(() => []),
      ]);
      setLead(leads.find((l) => l.id === id) ?? null);
      setNotes(ns);
      setStatuses(sts);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(st: string) {
    if (!lead) return;
    if (st === 'closed') {
      setAmountVal(lead.deal_value ? String(lead.deal_value) : '');
      setAmountModal(true);
      return;
    }
    if (st === 'irrelevant') {
      setReasonModal(true);
      setLoadingReasons(true);
      try {
        setReasons(await getReasons(lead.category_id));
      } catch {
        setReasons({ admin: [], client: [] });
      } finally {
        setLoadingReasons(false);
      }
      return;
    }
    try {
      await updateLead(id, { status: st });
      load();
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'עדכון נכשל');
    }
  }

  async function confirmAmount() {
    const amount = amountVal ? Number(amountVal.replace(/[^\d.]/g, '')) : null;
    try {
      await updateLead(id, { status: 'closed', deal_value: amount });
      setAmountModal(false);
      load();
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'עדכון נכשל');
    }
  }

  async function pickReason(rid: string) {
    try {
      await updateLead(id, { status: 'irrelevant', reason_id: rid });
      setReasonModal(false);
      load();
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'עדכון נכשל');
    }
  }

  async function addOtherReason() {
    if (!lead) return;
    const label = newReason.trim();
    if (!label) return;
    try {
      const d = await addReason(label, lead.category_id);
      setNewReason('');
      pickReason(d.reason.id);
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'הוספת סיבה נכשלה');
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

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  if (!lead) return <View style={s.center}><Text style={{ color: colors.muted }}>הליד לא נמצא.</Text></View>;

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
              <Pressable key={st} onPress={() => changeStatus(st)} style={[s.statusChip, { borderColor: c }, active && { backgroundColor: c + '33' }]}>
                <Text style={[s.statusChipText, { color: active ? c : colors.text2 }]}>{statusLabel[st]}</Text>
              </Pressable>
            );
          })}
          {statuses.map((cs) => {
            const active = lead.status === cs.id;
            return (
              <Pressable key={cs.id} onPress={() => changeStatus(cs.id)} style={[s.statusChip, { borderColor: colors.primary }, active && { backgroundColor: colors.primarySoft }]}>
                <Text style={[s.statusChipText, { color: active ? colors.primary : colors.text2 }]}>{cs.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {lead.status === 'closed' && lead.deal_value ? <Text style={s.deal}>סכום: ₪{nf.format(Number(lead.deal_value))}</Text> : null}
        {lead.status === 'irrelevant' && lead.reason_label ? <Text style={s.sub}>סיבה: {lead.reason_label}</Text> : null}
      </View>

      <View style={{ gap: 10 }}>
        <Text style={s.label}>יומן הליד</Text>
        <TextInput style={s.noteInput} value={body} onChangeText={setBody} placeholder="מה קרה בשיחה?" placeholderTextColor={colors.muted} multiline />
        <Pressable style={[s.addBtn, (saving || !body.trim()) && { opacity: 0.5 }]} onPress={submitNote} disabled={saving || !body.trim()}>
          <Text style={s.addBtnText}>{saving ? 'שומר…' : 'הוסף הערה'}</Text>
        </Pressable>
        {notes.length === 0 ? (
          <Text style={s.sub}>עדיין אין רשומות.</Text>
        ) : (
          notes.map((n) => (
            <View key={n.id} style={[s.noteItem, { borderRightWidth: 3, borderRightColor: kindColor(n.kind) }]}>
              <Text style={s.noteTime}>{dt(n.created_at)}</Text>
              <Text style={s.noteBody}>{noteText(n)}</Text>
            </View>
          ))
        )}
      </View>

      {/* פופאפ סכום רכישה */}
      <Modal visible={amountModal} transparent animationType="fade" onRequestClose={() => setAmountModal(false)}>
        <Pressable style={s.backdrop} onPress={() => setAmountModal(false)}>
          <Pressable style={s.modal} onPress={() => {}}>
            <Text style={s.modalTitle}>סכום הרכישה</Text>
            <TextInput style={s.modalInput} value={amountVal} onChangeText={setAmountVal} placeholder="0" placeholderTextColor={colors.muted} keyboardType="numeric" autoFocus />
            <View style={s.modalActions}>
              <Pressable style={[s.mBtn, s.mBtnGhost]} onPress={() => setAmountModal(false)}><Text style={s.mBtnGhostText}>ביטול</Text></Pressable>
              <Pressable style={[s.mBtn, s.mBtnPrimary]} onPress={confirmAmount}><Text style={s.mBtnPrimaryText}>שמירה</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* פופאפ סיבת לא רלוונטי */}
      <Modal visible={reasonModal} transparent animationType="fade" onRequestClose={() => setReasonModal(false)}>
        <Pressable style={s.backdrop} onPress={() => setReasonModal(false)}>
          <Pressable style={s.modal} onPress={() => {}}>
            <Text style={s.modalTitle}>למה לא רלוונטי?</Text>
            {loadingReasons ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <View style={s.reasonWrap}>
                  {[...reasons.admin, ...reasons.client].map((r) => (
                    <Pressable key={r.id} style={s.reasonChip} onPress={() => pickReason(r.id)}>
                      <Text style={s.reasonChipText}>{r.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TextInput style={[s.modalInput, { flex: 1 }]} value={newReason} onChangeText={setNewReason} placeholder="סיבה חדשה…" placeholderTextColor={colors.muted} />
                  <Pressable style={[s.mBtn, s.mBtnPrimary, !newReason.trim() && { opacity: 0.5 }]} onPress={addOtherReason} disabled={!newReason.trim()}>
                    <Text style={s.mBtnPrimaryText}>הוסף</Text>
                  </Pressable>
                </View>
              </>
            )}
            <Pressable style={[s.mBtn, s.mBtnGhost, { marginTop: 6 }]} onPress={() => setReasonModal(false)}><Text style={s.mBtnGhostText}>ביטול</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  sub: { color: colors.muted, fontSize: 13, textAlign: 'right', marginTop: 2 },
  label: { color: colors.muted, fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 12 },
  phone: { color: colors.text, fontSize: 17, fontWeight: '600' },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  statusChipText: { fontSize: 13, fontWeight: '600' },
  deal: { color: colors.ok, fontWeight: '700', textAlign: 'right', marginTop: 8 },
  noteInput: { backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 12, padding: 12, color: colors.text, fontSize: 15, minHeight: 60, textAlign: 'right', textAlignVertical: 'top' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  noteItem: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 },
  noteTime: { color: colors.muted2, fontSize: 12, textAlign: 'right' },
  noteBody: { color: colors.text, fontSize: 15, textAlign: 'right', marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 18, gap: 12 },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'right' },
  modalInput: { backgroundColor: colors.surface2, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 12, padding: 12, color: colors.text, fontSize: 16, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 8 },
  mBtn: { borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', flex: 1 },
  mBtnPrimary: { backgroundColor: colors.primary, flex: 0, paddingHorizontal: 20 },
  mBtnPrimaryText: { color: '#fff', fontWeight: '700' },
  mBtnGhost: { borderColor: colors.borderStrong, borderWidth: 1 },
  mBtnGhostText: { color: colors.text2, fontWeight: '600' },
  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: { backgroundColor: colors.surface2, borderColor: colors.borderStrong, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  reasonChipText: { color: colors.text, fontSize: 14, fontWeight: '500' },
});
