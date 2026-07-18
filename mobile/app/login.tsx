import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth';
import { login } from '../lib/api';
import { colors } from '../lib/theme';

export default function Login() {
  const { signIn } = useAuth();
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    setErr('');
    setBusy(true);
    try {
      const clean = slug.trim().toLowerCase();
      const d = await login(clean, password);
      await signIn(d.token, d.client?.name ?? null);
      router.replace('/leads');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.wrap}
    >
      <View style={s.card}>
        <View style={s.logo} />
        <Text style={s.title}>פורטל לקוח</Text>
        <Text style={s.sub}>הזן/י שם פורטל וסיסמה כדי להיכנס</Text>
        <TextInput
          style={s.input}
          value={slug}
          onChangeText={setSlug}
          placeholder="שם הפורטל"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          placeholder="סיסמה"
          placeholderTextColor={colors.muted}
          secureTextEntry
        />
        {err ? <Text style={s.err}>{err}</Text> : null}
        <Pressable style={[s.btn, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy || !slug || !password}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>כניסה</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: 22 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 24,
    gap: 12,
  },
  logo: { width: 54, height: 54, borderRadius: 14, backgroundColor: colors.primary, marginBottom: 4 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'right' },
  sub: { color: colors.muted, fontSize: 14, textAlign: 'right', marginBottom: 6 },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 16,
    textAlign: 'right',
  },
  err: { color: colors.danger, textAlign: 'right', fontSize: 14 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
