import { useCallback, useEffect, useMemo, useState } from 'react';
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
  getNotes,
  getReasons,
  updateLead,
  type Note,
  type Reason,
} from '../../lib/api';
import { useData } from '../../lib/data';
import { useColors } from '../../lib/theme-context';
import { BUILTIN_STATUSES, customStatusHex, formatPhone, statusColor, statusLabel, CONTENT_MAX, type Palette } from '../../lib/theme';

const nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
const dt = (iso: string) =>
  new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function kindColor(k: string | undefined, c: Palette): string {
  switch (k) {
    case 'status': return '#3b82f6';
    case 'purchase': return '#16a34a';
    case 'irrelevant': return '#ef4444';
    default: return c.primary;
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
  const { leads, statuses, ready, refresh, markLeadRead } = useData();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const lead = leads.find((l) => l.id === id) ?? null;

  // כניסה לליד = ההתראה נקראה
  useEffect(() => { if (id) markLeadRead(id); }, [id, markLeadRead]);

  // עדכון אופטימי — הצ'יפ נדלק מיד, הרשת רצה ברקע (חלק, לא "תקוע")
  const [optStatus, setOptStatus] = useState<string | null>(null);
  const displayStatus = optStatus ?? lead?.status ?? '';
  useEffect(() => {
    if (lead && optStatus && lead.status === optStatus) setOptStatus(null);
  }, [lead, optStatus]);

  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const [amountModal, setAmountModal] = useState(false);
  const [amountVal, setAmountVal] = useState('');
  const [reasonModal, setReasonModal] = useState(false);
  const [reasons, setReasons] = useState<{ admin: Reason[]; client: Reason[] }>({ admin: [], client: [] });
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [newReason, setNewReason] = useState('');

  const reloadNotes = useCallback(async () => {
    try {
      setNotes(await getNotes(id));
    } catch {
      /* ignore */
    } finally {
      setNotesLoading(false);
    }
  }, [id]);

  useEffect(() => { reloadNotes(); }, [reloadNotes]);

  async function afterChange() {
    await Promise.all([refresh(), reloadNotes()]);
  }

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
    setOptStatus(st); // משוב מיידי
    try {
      await updateLead(id, { status: st });
      afterChange();
    } catch (e) {
      setOptStatus(null);
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'עדכון נכשל');
    }
  }

  async function confirmAmount() {
    const amount = amountVal ? Number(amountVal.replace(/[^\d.]/g, '')) : null;
    setAmountModal(false);
    setOptStatus('closed');
    try {
      await updateLead(id, { status: 'closed', deal_value: amount });
      afterChange();
    } catch (e) {
      setOptStatus(null);
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'עדכון נכשל');
    }
  }

  async function pickReason(rid: string) {
    setReasonModal(false);
    setOptStatus('irrelevant');
    try {
      await updateLead(id, { status: 'irrelevant', reason_id: rid });
      afterChange();
    } catch (e) {
      setOptStatus(null);
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
      refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!lead) {
    if (!ready && leads.length === 0) return <View style={s.center}><ActivityIndicator color={c.primary} /></View>;
    return <View style={s.center}><Text style={{ color: c.muted }}>הליד לא נמצא.</Text></View>;
  }

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={s.name}>{lead.name ?? 'ליד'}</Text>
        {lead.created_at ? <Text style={s.sub}>נכנס {dt(lead.created_at)}</Text> : null}
      </View>

      {lead.phone ? (
        <View style={s.phoneRow}>
          <Text style={s.phone}>{formatPhone(lead.phone)}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[s.pill, { backgroundColor: c.wa }]} onPress={() => Linking.openURL(`https://wa.me/${lead.phone!.replace(/\D/g, '')}`)}>
              <Text style={s.pillText}>וואטסאפ</Text>
            </Pressable>
            <Pressable style={[s.pill, { backgroundColor: c.primary }]} onPress={() => Linking.openURL(`tel:${lead.phone}`)}>
              <Text style={s.pillText}>חיוג</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View>
        <Text style={s.label}>סטטוס</Text>
        <View style={s.statusWrap}>
          {BUILTIN_STATUSES.map((st) => {
            const active = displayStatus === st;
            const col = statusColor[st] ?? c.primary;
            return (
              <Pressable key={st} onPress={() => changeStatus(st)} style={[s.statusChip, { borderColor: col }, active && { backgroundColor: col + '33' }]}>
                <Text style={[s.statusChipText, { color: active ? col : c.text2 }]}>{statusLabel[st]}</Text>
              </Pressable>
            );
          })}
          {statuses.map((cs) => {
            const active = displayStatus === cs.id;
            const col = customStatusHex(cs.color);
            return (
              <Pressable key={cs.id} onPress={() => changeStatus(cs.id)} style={[s.statusChip, { borderColor: col }, active && { backgroundColor: col + '33' }]}>
                <Text style={[s.statusChipText, { color: active ? col : c.text2 }]}>{cs.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {lead.status === 'closed' && lead.deal_value ? <Text style={s.deal}>סכום: ₪{nf.format(Number(lead.deal_value))}</Text> : null}
        {lead.status === 'irrelevant' && lead.reason_label ? <Text style={s.sub}>סיבה: {lead.reason_label}</Text> : null}
      </View>

      <View style={{ gap: 10 }}>
        <Text style={s.label}>יומן הליד</Text>
        <TextInput style={s.noteInput} value={body} onChangeText={setBody} placeholder="מה קרה בשיחה?" placeholderTextColor={c.muted} multiline />
        <Pressable style={[s.addBtn, (saving || !body.trim()) && { opacity: 0.5 }]} onPress={submitNote} disabled={saving || !body.trim()}>
          <Text style={s.addBtnText}>{saving ? 'שומר…' : 'הוסף הערה'}</Text>
        </Pressable>
        {notesLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 8 }} />
        ) : notes.length === 0 ? (
          <Text style={s.sub}>עדיין אין רשומות.</Text>
        ) : (
          notes.map((n) => (
            <View key={n.id} style={[s.noteItem, { borderRightWidth: 3, borderRightColor: kindColor(n.kind, c) }]}>
              <Text style={s.noteTime}>{dt(n.created_at)}</Text>
              <Text style={s.noteBody}>{noteText(n)}</Text>
            </View>
          ))
        )}
      </View>

      <Modal visible={amountModal} transparent animationType="fade" onRequestClose={() => setAmountModal(false)}>
        <Pressable style={s.backdrop} onPress={() => setAmountModal(false)}>
          <Pressable style={s.modal} onPress={() => {}}>
            <Text style={s.modalTitle}>סכום הרכישה</Text>
            <TextInput style={s.modalInput} value={amountVal} onChangeText={setAmountVal} placeholder="0" placeholderTextColor={c.muted} keyboardType="numeric" autoFocus />
            <View style={s.modalActions}>
              <Pressable style={[s.mBtn, s.mBtnGhost]} onPress={() => setAmountModal(false)}><Text style={s.mBtnGhostText}>ביטול</Text></Pressable>
              <Pressable style={[s.mBtn, s.mBtnPrimary]} onPress={confirmAmount}><Text style={s.mBtnPrimaryText}>שמירה</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={reasonModal} transparent animationType="fade" onRequestClose={() => setReasonModal(false)}>
        <Pressable style={s.backdrop} onPress={() => setReasonModal(false)}>
          <Pressable style={s.modal} onPress={() => {}}>
            <Text style={s.modalTitle}>למה לא רלוונטי?</Text>
            {loadingReasons ? (
              <ActivityIndicator color={c.primary} />
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
                  <TextInput style={[s.modalInput, { flex: 1 }]} value={newReason} onChangeText={setNewReason} placeholder="סיבה חדשה…" placeholderTextColor={c.muted} />
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

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  name: { color: c.text, fontSize: 22, fontWeight: '800', textAlign: 'right' },
  sub: { color: c.muted, fontSize: 13, textAlign: 'right', marginTop: 2 },
  label: { color: c.muted, fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, padding: 12 },
  phone: { color: c.text, fontSize: 17, fontWeight: '600' },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  pillText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statusWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  statusChipText: { fontSize: 13, fontWeight: '600' },
  deal: { color: c.ok, fontWeight: '700', textAlign: 'right', marginTop: 8 },
  noteInput: { backgroundColor: c.surface, borderColor: c.borderStrong, borderWidth: 1, borderRadius: 12, padding: 12, color: c.text, fontSize: 15, minHeight: 60, textAlign: 'right', textAlignVertical: 'top' },
  addBtn: { backgroundColor: c.primary, borderRadius: 999, paddingVertical: 13, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  noteItem: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 12 },
  noteTime: { color: c.muted2, fontSize: 12, textAlign: 'right' },
  noteBody: { color: c.text, fontSize: 15, textAlign: 'right', marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 18, padding: 18, gap: 12, width: '100%', maxWidth: 460, alignSelf: 'center' },
  modalTitle: { color: c.text, fontSize: 18, fontWeight: '800', textAlign: 'right' },
  modalInput: { backgroundColor: c.surface2, borderColor: c.borderStrong, borderWidth: 1, borderRadius: 12, padding: 12, color: c.text, fontSize: 16, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 8 },
  mBtn: { borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', flex: 1 },
  mBtnPrimary: { backgroundColor: c.primary, flex: 0, paddingHorizontal: 20 },
  mBtnPrimaryText: { color: '#fff', fontWeight: '700' },
  mBtnGhost: { borderColor: c.borderStrong, borderWidth: 1 },
  mBtnGhostText: { color: c.text2, fontWeight: '600' },
  reasonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reasonChip: { backgroundColor: c.surface2, borderColor: c.borderStrong, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  reasonChipText: { color: c.text, fontSize: 14, fontWeight: '500' },
});
