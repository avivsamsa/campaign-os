import { useMemo } from 'react';
import { Alert, I18nManager, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { deleteAccount } from '../lib/api';
import { API_BASE } from '../lib/config';
import { useColors, useTheme, type ThemeMode } from '../lib/theme-context';
import type { Palette } from '../lib/theme';

const rowDir = I18nManager.isRTL ? 'row' : 'row-reverse';
const chevron = I18nManager.isRTL ? 'chevron-left' : 'chevron-right';

const MODES: { key: ThemeMode; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'system', label: 'אוטומטי', icon: 'smartphone' },
  { key: 'light', label: 'בהיר', icon: 'sun' },
  { key: 'dark', label: 'כהה', icon: 'moon' },
];

export default function Settings() {
  const { clientName, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  async function logout() {
    await signOut();
    router.replace('/login');
  }

  async function doDelete() {
    try {
      const d = await deleteAccount();
      if (d?.demo) {
        Alert.alert('הדגמה', 'בפורטל הדגמה המחיקה מושבתת.');
        return;
      }
      await signOut();
      router.replace('/login');
    } catch (e) {
      Alert.alert('שגיאה', e instanceof Error ? e.message : 'המחיקה נכשלה');
    }
  }

  function confirmDelete() {
    Alert.alert(
      'מחיקת חשבון',
      'הגישה שלך לפורטל תימחק ותנותק/י מיד. הלידים נשמרים אצל הסוכנות. הפעולה בלתי הפיכה.',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק חשבון', style: 'destructive', onPress: doDelete },
      ],
    );
  }

  const Link = ({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) => (
    <Pressable style={({ pressed }) => [s.linkRow, { flexDirection: rowDir }, pressed && { backgroundColor: c.surface2 }]} onPress={onPress}>
      <View style={[s.linkLeft, { flexDirection: rowDir }]}>
        <Feather name={icon} size={18} color={c.muted} />
        <Text style={s.linkText}>{label}</Text>
      </View>
      <Feather name={chevron} size={18} color={c.muted2} />
    </Pressable>
  );

  return (
    <ScrollView style={s.wrap} contentContainerStyle={s.content}>
      {/* פרופיל הלקוח */}
      <View style={s.profile}>
        <View style={s.avatar}><Feather name="user" size={30} color={c.primary} /></View>
        <Text style={s.name}>{clientName ?? 'הפורטל שלי'}</Text>
      </View>

      {/* מראה */}
      <View style={s.block}>
        <Text style={s.sectionTitle}>מראה</Text>
        <View style={[s.segment, { flexDirection: rowDir }]}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable key={m.key} style={[s.segBtn, active && s.segBtnActive]} onPress={() => setMode(m.key)}>
                <Feather name={m.icon} size={16} color={active ? c.white : c.muted} />
                <Text style={[s.segText, active && { color: c.white }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* מידע ומדיניות */}
      <View style={s.block}>
        <Text style={s.sectionTitle}>מידע ומדיניות</Text>
        <View style={s.group}>
          <Link icon="shield" label="מדיניות פרטיות" onPress={() => Linking.openURL(`${API_BASE}/privacy`)} />
          <View style={s.divider} />
          <Link icon="file-text" label="תנאי שימוש" onPress={() => Linking.openURL(`${API_BASE}/terms`)} />
          <View style={s.divider} />
          <Link icon="mail" label="יצירת קשר ותמיכה" onPress={() => Linking.openURL('mailto:m@avivsamsa.co.il')} />
        </View>
      </View>

      {/* דוחף את פעולות החשבון לתחתית */}
      <View style={{ flex: 1, minHeight: 24 }} />

      <Pressable style={s.logoutBtn} onPress={logout}>
        <Text style={s.logoutText}>התנתקות</Text>
      </Pressable>

      <Pressable style={s.deleteLink} onPress={confirmDelete} hitSlop={8}>
        <Text style={s.deleteText}>מחיקת חשבון</Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg },
  content: { padding: 16, gap: 18, flexGrow: 1, paddingBottom: 28 },
  profile: { alignItems: 'center', gap: 12, paddingTop: 18, paddingBottom: 4 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { color: c.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  block: { gap: 8 },
  sectionTitle: { color: c.muted, fontSize: 13, fontWeight: '700', textAlign: 'right', marginHorizontal: 2 },
  segment: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, padding: 4, gap: 4 },
  segBtn: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10 },
  segBtnActive: { backgroundColor: c.primary },
  segText: { color: c.muted, fontSize: 14, fontWeight: '700' },
  group: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  linkRow: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15 },
  linkLeft: { alignItems: 'center', gap: 12 },
  linkText: { color: c.text, fontSize: 15.5, fontWeight: '600' },
  divider: { height: 1, backgroundColor: c.border, marginHorizontal: 16 },
  logoutBtn: { backgroundColor: c.surface, borderColor: c.borderStrong, borderWidth: 1, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  logoutText: { color: c.text, fontSize: 16, fontWeight: '600' },
  deleteLink: { alignItems: 'center', paddingVertical: 10, marginTop: 2 },
  deleteText: { color: c.muted2, fontSize: 13, fontWeight: '500' },
});
