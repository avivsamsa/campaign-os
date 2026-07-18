import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { addReason, addStatus, getReasons, updateLead, type CustomStatus, type Reason } from '../lib/api';
import { useColors } from '../lib/theme-context';
import { BUILTIN_STATUSES, STATUS_COLOR_NAMES, STATUS_COLORS, customStatusHex, statusColor, statusLabel, type Palette } from '../lib/theme';

/**
 * דף-תחתית לשינוי סטטוס ליד במקום (בלי להיכנס לפרטי הליד).
 * סטטוס רגיל → מחיל מיד; "רכישה" → קלט סכום; "לא רלוונטי" → בחירת סיבה.
 */
export function StatusSheet({
  visible,
  leadId,
  categoryId,
  currentStatus,
  customStatuses,
  onClose,
  onChanged,
}: {
  visible: boolean;
  leadId: string | null;
  categoryId: string | null;
  currentStatus: string | null;
  customStatuses: CustomStatus[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [step, setStep] = useState<'list' | 'amount' | 'reason' | 'custom'>('list');
  const [busy, setBusy] = useState(false);
  const [amountVal, setAmountVal] = useState('');
  const [reasons, setReasons] = useState<{ admin: Reason[]; client: Reason[] }>({ admin: [], client: [] });
  const [loadingReasons, setLoadingReasons] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState<string>('blue');

  useEffect(() => {
    if (visible) { setStep('list'); setAmountVal(''); setNewReason(''); setNewLabel(''); setNewColor('blue'); }
  }, [visible, leadId]);

  if (!leadId) return null;

  async function apply(patch: Parameters<typeof updateLead>[1]) {
    setBusy(true);
    try {
      await updateLead(leadId!, patch);
      onChanged();
      onClose();
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'עדכון נכשל');
    } finally {
      setBusy(false);
    }
  }

  async function pick(st: string) {
    if (st === currentStatus) { onClose(); return; }
    if (st === 'closed') { setStep('amount'); return; }
    if (st === 'irrelevant') {
      setStep('reason');
      setLoadingReasons(true);
      try { setReasons(await getReasons(categoryId)); }
      catch { setReasons({ admin: [], client: [] }); }
      finally { setLoadingReasons(false); }
      return;
    }
    apply({ status: st });
  }

  async function addOther() {
    const label = newReason.trim();
    if (!label) return;
    try {
      const d = await addReason(label, categoryId);
      setNewReason('');
      apply({ status: 'irrelevant', reason_id: d.reason.id });
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'הוספת סיבה נכשלה');
    }
  }

  async function createCustom() {
    const label = newLabel.trim();
    if (!label || busy) return;
    setBusy(true);
    try {
      const d = await addStatus(label, newColor);
      await updateLead(leadId!, { status: d.status.id });
      onChanged();
      onClose();
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'יצירת סטטוס נכשלה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <View style={s.handle} />

          {step === 'list' && (
            <>
              <Text style={s.title}>שינוי סטטוס</Text>
              <View style={s.wrap}>
                {BUILTIN_STATUSES.map((st) => {
                  const active = currentStatus === st;
                  const col = statusColor[st] ?? c.primary;
                  return (
                    <Pressable key={st} onPress={() => pick(st)} style={[s.chip, { borderColor: col }, active && { backgroundColor: col + '33' }]}>
                      <Text style={[s.chipText, { color: active ? col : c.text2 }]}>{statusLabel[st]}</Text>
                    </Pressable>
                  );
                })}
                {customStatuses.map((cs) => {
                  const active = currentStatus === cs.id;
                  const col = customStatusHex(cs.color);
                  return (
                    <Pressable key={cs.id} onPress={() => pick(cs.id)} style={[s.chip, { borderColor: col }, active && { backgroundColor: col + '33' }]}>
                      <Text style={[s.chipText, { color: active ? col : c.text2 }]}>{cs.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable style={[s.addStatusBtn, { flexDirection: 'row' }]} onPress={() => setStep('custom')}>
                <Feather name="plus" size={16} color={c.primary} />
                <Text style={s.addStatusText}>סטטוס מותאם אישית</Text>
              </Pressable>
            </>
          )}

          {step === 'custom' && (
            <>
              <Text style={s.title}>סטטוס חדש</Text>
              <TextInput style={s.input} value={newLabel} onChangeText={setNewLabel} placeholder="שם הסטטוס (למשל: בהמתנה למסמכים)" placeholderTextColor={c.muted} autoFocus maxLength={30} />
              <View style={[s.wrap, { justifyContent: 'flex-start' }]}>
                {STATUS_COLOR_NAMES.map((name) => (
                  <Pressable key={name} onPress={() => setNewColor(name)} style={[s.swatch, { backgroundColor: STATUS_COLORS[name] }, newColor === name && s.swatchActive]}>
                    {newColor === name ? <Feather name="check" size={16} color="#fff" /> : null}
                  </Pressable>
                ))}
              </View>
              <View style={s.actions}>
                <Pressable style={[s.btn, s.ghost]} onPress={() => setStep('list')}><Text style={s.ghostText}>חזרה</Text></Pressable>
                <Pressable style={[s.btn, s.primary, (!newLabel.trim() || busy) && { opacity: 0.5 }]} disabled={!newLabel.trim() || busy} onPress={createCustom}>
                  <Text style={s.primaryText}>{busy ? '...' : 'יצירה והחלה'}</Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 'amount' && (
            <>
              <Text style={s.title}>סכום הרכישה</Text>
              <TextInput style={s.input} value={amountVal} onChangeText={setAmountVal} placeholder="0" placeholderTextColor={c.muted} keyboardType="numeric" autoFocus />
              <View style={s.actions}>
                <Pressable style={[s.btn, s.ghost]} onPress={() => setStep('list')}><Text style={s.ghostText}>חזרה</Text></Pressable>
                <Pressable style={[s.btn, s.primary]} disabled={busy} onPress={() => apply({ status: 'closed', deal_value: amountVal ? Number(amountVal.replace(/[^\d.]/g, '')) : null })}>
                  <Text style={s.primaryText}>{busy ? '...' : 'שמירה'}</Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 'reason' && (
            <>
              <Text style={s.title}>למה לא רלוונטי?</Text>
              {loadingReasons ? (
                <ActivityIndicator color={c.primary} />
              ) : (
                <>
                  <View style={s.wrap}>
                    {[...reasons.admin, ...reasons.client].map((r) => (
                      <Pressable key={r.id} style={s.reasonChip} onPress={() => apply({ status: 'irrelevant', reason_id: r.id })}>
                        <Text style={s.reasonText}>{r.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={s.addRow}>
                    <TextInput style={[s.input, { flex: 1 }]} value={newReason} onChangeText={setNewReason} placeholder="סיבה חדשה..." placeholderTextColor={c.muted} />
                    <Pressable style={[s.btn, s.primary, !newReason.trim() && { opacity: 0.5 }]} disabled={!newReason.trim()} onPress={addOther}><Text style={s.primaryText}>הוסף</Text></Pressable>
                  </View>
                  <Pressable style={[s.btn, s.ghost, { marginTop: 4 }]} onPress={() => setStep('list')}><Text style={s.ghostText}>חזרה</Text></Pressable>
                </>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, gap: 14 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginBottom: 2 },
  title: { color: c.text, fontSize: 18, fontWeight: '800', textAlign: 'right' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { fontSize: 14, fontWeight: '700' },
  input: { backgroundColor: c.surface2, borderColor: c.borderStrong, borderWidth: 1, borderRadius: 12, padding: 13, color: c.text, fontSize: 16, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 10 },
  addRow: { flexDirection: 'row', gap: 8 },
  btn: { borderRadius: 999, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: c.primary },
  primaryText: { color: '#fff', fontWeight: '800' },
  ghost: { borderColor: c.borderStrong, borderWidth: 1, flex: 1 },
  ghostText: { color: c.text2, fontWeight: '700' },
  reasonChip: { backgroundColor: c.surface2, borderColor: c.borderStrong, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  reasonText: { color: c.text, fontSize: 14, fontWeight: '500' },
  addStatusBtn: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: c.primary, backgroundColor: c.primarySoft, marginTop: 2 },
  addStatusText: { color: c.primary, fontSize: 14.5, fontWeight: '700' },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: c.text },
});
