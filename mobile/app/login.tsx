import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { login } from '../lib/api';
import { colors } from '../lib/theme';

export default function Login() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    if (busy || !slug.trim() || !password) return;
    setErr('');
    setBusy(true);
    try {
      const d = await login(slug.trim().toLowerCase(), password);
      await signIn(d.token, d.client?.name ?? null);
      router.replace('/leads');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      {/* זוהר רקע עדין */}
      <View style={s.glow} pointerEvents="none" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* גיבור מיתוגי */}
          <View style={s.hero}>
            <Image source={require('../assets/icon.png')} style={s.logo} />
            <Text style={s.brand}>Campaign OS</Text>
            <Text style={s.tagline}>הפורטל שלך — לידים בזמן אמת</Text>
          </View>

          {/* טופס */}
          <View style={s.form}>
            <Text style={s.welcome}>ברוך/ה הבא/ה 👋</Text>
            <Text style={s.hint}>היכנס/י עם שם הפורטל והסיסמה שקיבלת.</Text>

            <View style={s.field}>
              <Text style={s.label}>שם הפורטל</Text>
              <TextInput
                style={s.input}
                value={slug}
                onChangeText={setSlug}
                placeholder="לדוגמה: mycompany"
                placeholderTextColor={colors.muted2}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>סיסמה</Text>
              <TextInput
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.muted2}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            </View>

            {err ? (
              <View style={s.errBox}>
                <Text style={s.errText}>{err}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [s.btn, (busy || !slug.trim() || !password) && s.btnDisabled, pressed && s.btnPressed]}
              onPress={submit}
              disabled={busy || !slug.trim() || !password}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>כניסה</Text>}
            </Pressable>

            <Text style={s.foot}>המערכת תזכור אותך במכשיר זה.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  glow: {
    position: 'absolute',
    top: -140,
    alignSelf: 'center',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: colors.primary,
    opacity: 0.16,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 34 },
  logo: { width: 82, height: 82, borderRadius: 20, marginBottom: 16 },
  brand: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: 0.3 },
  tagline: { color: colors.muted, fontSize: 14, marginTop: 6 },
  form: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
    gap: 14,
  },
  welcome: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'right' },
  hint: { color: colors.muted, fontSize: 13.5, textAlign: 'right', marginTop: -6, marginBottom: 4 },
  field: { gap: 7 },
  label: { color: colors.text2, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: colors.text,
    fontSize: 16,
    textAlign: 'right',
  },
  errBox: { backgroundColor: 'rgba(217,83,79,0.14)', borderRadius: 12, padding: 12 },
  errText: { color: colors.danger, fontSize: 14, textAlign: 'right', fontWeight: '600' },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  btnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  btnPressed: { opacity: 0.85 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  foot: { color: colors.muted2, fontSize: 12.5, textAlign: 'center', marginTop: 4 },
});
