import { useMemo, useState } from 'react';
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
import { useColors } from '../lib/theme-context';
import type { Palette } from '../lib/theme';
import { FadeIn } from '../lib/anim';

export default function Login() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
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
      router.replace('/dashboard');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <View style={s.glow} pointerEvents="none" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeIn style={s.hero} offset={18}>
            <Image source={require('../assets/icon.png')} style={s.logo} />
            <Text style={s.brand}>AVIVSAMSA PPC</Text>
            <Text style={s.tagline}>הפורטל שלך - לידים בזמן אמת</Text>
          </FadeIn>

          <FadeIn delay={140} style={s.form}>
            <Text style={s.welcome}>ברוך/ה הבא/ה 👋</Text>
            <Text style={s.hint}>היכנס/י עם שם הפורטל והסיסמה שקיבלת.</Text>

            <View style={s.field}>
              <Text style={s.label}>שם הפורטל</Text>
              <TextInput
                style={s.input}
                value={slug}
                onChangeText={setSlug}
                placeholder="לדוגמה: mycompany"
                placeholderTextColor={c.muted2}
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
                placeholderTextColor={c.muted2}
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
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  glow: { position: 'absolute', top: -140, alignSelf: 'center', width: 380, height: 380, borderRadius: 190, backgroundColor: c.primary, opacity: c.isDark ? 0.16 : 0.1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 34 },
  logo: { width: 82, height: 82, borderRadius: 20, marginBottom: 16 },
  brand: { color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: 0.3 },
  tagline: { color: c.muted, fontSize: 14, marginTop: 6 },
  form: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 24, padding: 22, gap: 14 },
  welcome: { color: c.text, fontSize: 20, fontWeight: '800', textAlign: 'right' },
  hint: { color: c.muted, fontSize: 13.5, textAlign: 'right', marginTop: -6, marginBottom: 4 },
  field: { gap: 7 },
  label: { color: c.text2, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  input: { backgroundColor: c.surface2, borderColor: c.borderStrong, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, color: c.text, fontSize: 16, textAlign: 'right' },
  errBox: { backgroundColor: 'rgba(217,83,79,0.14)', borderRadius: 12, padding: 12 },
  errText: { color: c.danger, fontSize: 14, textAlign: 'right', fontWeight: '600' },
  btn: { backgroundColor: c.primary, borderRadius: 999, paddingVertical: 17, alignItems: 'center', marginTop: 6, shadowColor: c.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  btnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  btnPressed: { opacity: 0.85 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  foot: { color: c.muted2, fontSize: 12.5, textAlign: 'center', marginTop: 4 },
});
