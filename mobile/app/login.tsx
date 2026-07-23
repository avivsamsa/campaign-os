import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { API_BASE } from '../lib/config';
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

  const disabled = busy || !slug.trim() || !password;

  return (
    <View style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeIn style={s.hero} offset={16}>
            <Image source={require('../assets/icon.png')} style={s.logo} />
            <Text style={s.brand}>AVIVSAMSA PPC</Text>
          </FadeIn>

          <FadeIn delay={120} style={s.form}>
            <TextInput
              style={s.input}
              value={slug}
              onChangeText={setSlug}
              placeholder="שם הפורטל"
              placeholderTextColor={c.muted2}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              accessibilityLabel="שם הפורטל"
            />
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="סיסמה"
              placeholderTextColor={c.muted2}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={submit}
              accessibilityLabel="סיסמה"
            />

            {err ? <Text style={s.errText}>{err}</Text> : null}

            <Pressable
              style={({ pressed }) => [s.btn, disabled && s.btnDisabled, pressed && !disabled && s.btnPressed]}
              onPress={submit}
              disabled={disabled}
              accessibilityLabel="כניסה"
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>כניסה</Text>}
            </Pressable>

            <Text style={s.legal}>
              בהתחברות אני מאשר/ת את{' '}
              <Text style={s.link} onPress={() => Linking.openURL(`${API_BASE}/terms`)}>תנאי השימוש</Text>
              {' '}ואת{' '}
              <Text style={s.link} onPress={() => Linking.openURL(`${API_BASE}/privacy`)}>מדיניות הפרטיות</Text>
            </Text>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' },
  hero: { alignItems: 'center', marginBottom: 40 },
  logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 18 },
  brand: { color: c.text, fontSize: 21, fontWeight: '800', letterSpacing: 3 },
  form: { gap: 12, width: '100%', maxWidth: 400 },
  input: {
    backgroundColor: c.surface,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 17,
    color: c.text,
    fontSize: 16,
    textAlign: 'right',
  },
  errText: { color: c.danger, fontSize: 13.5, textAlign: 'center', fontWeight: '600' },
  btn: { backgroundColor: c.primary, borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 6 },
  btnDisabled: { opacity: 0.4 },
  btnPressed: { opacity: 0.85 },
  btnText: { color: '#fff', fontSize: 16.5, fontWeight: '800', letterSpacing: 0.5 },
  legal: { color: c.muted2, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 14, paddingHorizontal: 8 },
  link: { color: c.muted, fontWeight: '700', textDecorationLine: 'underline' },
});
