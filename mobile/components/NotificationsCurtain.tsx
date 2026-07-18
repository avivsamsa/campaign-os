import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  I18nManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import type { Lead } from '../lib/api';

const rowDir = I18nManager.isRTL ? 'row' : 'row-reverse';
const H = Dimensions.get('window').height;

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'הרגע';
  if (m < 60) return `לפני ${m} ד׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} ש׳`;
  const d = Math.floor(h / 24);
  return `לפני ${d} י׳`;
}

export function NotificationsCurtain({
  visible,
  leads,
  onClose,
  onOpenLead,
}: {
  visible: boolean;
  leads: Lead[];
  onClose: () => void;
  onOpenLead: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const t = useRef(new Animated.Value(0)).current; // 0 סגור, 1 פתוח

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(t, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(t, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [-H * 0.9, 0] });
  const backdrop = t.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          s.panel,
          { paddingTop: insets.top + 10, transform: [{ translateY }] },
        ]}
      >
        <View style={[s.head, { flexDirection: rowDir }]}>
          <Text style={s.title}>התראות</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="סגירה">
            <Feather name="x" size={22} color={colors.muted} />
          </Pressable>
        </View>

        {leads.length === 0 ? (
          <View style={s.empty}>
            <Feather name="bell" size={28} color={colors.muted2} />
            <Text style={s.emptyText}>אין התראות חדשות</Text>
            <Text style={s.emptySub}>כאן יופיעו לידים חדשים ברגע שייכנסו</Text>
          </View>
        ) : (
          <ScrollView style={{ maxHeight: H * 0.6 }} showsVerticalScrollIndicator={false}>
            {leads.map((l) => (
              <Pressable
                key={l.id}
                style={({ pressed }) => [s.row, { flexDirection: rowDir }, pressed && s.rowPressed]}
                onPress={() => {
                  onClose();
                  onOpenLead(l.id);
                }}
              >
                <View style={s.dot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowName} numberOfLines={1}>
                    {l.name || 'ליד חדש'}
                  </Text>
                  <Text style={s.rowMeta} numberOfLines={1}>
                    {l.category_name ? `${l.category_name} · ` : ''}
                    ליד חדש ממתין לטיפול
                  </Text>
                </View>
                <Text style={s.rowTime}>{timeAgo(l.created_at)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={{ height: 8 }} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  head: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  title: { color: colors.text, fontSize: 19, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 34, gap: 8 },
  emptyText: { color: colors.text2, fontSize: 15, fontWeight: '700', marginTop: 4 },
  emptySub: { color: colors.muted2, fontSize: 13 },
  row: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: { backgroundColor: colors.surface2 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
  rowName: { color: colors.text, fontSize: 15.5, fontWeight: '700', textAlign: 'right' },
  rowMeta: { color: colors.muted, fontSize: 12.5, textAlign: 'right', marginTop: 2 },
  rowTime: { color: colors.muted2, fontSize: 12, fontVariant: ['tabular-nums'] },
});
