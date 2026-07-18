import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { deleteAccount } from '../lib/api';
import { colors } from '../lib/theme';

export default function Settings() {
  const { clientName, signOut } = useAuth();

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

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: 16, gap: 14 }}>
      <View style={s.card}>
        <Text style={s.label}>אזור עבודה</Text>
        <Text style={s.value}>{clientName ?? 'הפורטל שלי'}</Text>
      </View>

      <Pressable style={s.btn} onPress={logout}>
        <Text style={s.btnText}>התנתקות</Text>
      </Pressable>

      <Pressable style={[s.btn, s.dangerBtn]} onPress={confirmDelete}>
        <Text style={[s.btnText, { color: colors.danger }]}>מחיקת חשבון</Text>
      </Pressable>

      <Text style={s.note}>
        מחיקת החשבון מסירה את הגישה שלך לפורטל בלבד. הלידים שייכים לסוכנות ונשמרים אצלה.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16 },
  label: { color: colors.muted, fontSize: 13, textAlign: 'right' },
  value: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'right', marginTop: 4 },
  btn: {
    backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1,
    borderRadius: 12, paddingVertical: 15, alignItems: 'center',
  },
  btnText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  dangerBtn: { borderColor: colors.danger },
  note: { color: colors.muted2, fontSize: 13, textAlign: 'right', lineHeight: 20, marginTop: 4 },
});
