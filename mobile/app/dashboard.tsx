import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data';
import { useColors } from '../lib/theme-context';
import type { Palette } from '../lib/theme';
import DashboardView from '../components/DashboardView';
import NotificationsView from '../components/NotificationsView';
import Settings from './settings';

// שלושת המסכים כדפי pager שכנים (כמו אינסטגרם): התראות | דשבורד | חשבון.
// layoutDirection="ltr" מקבע את הסדר הפיזי ומנטרל את היפוך ה-RTL של ה-pager.
const NOTIF = 0;
const DASH = 1;
const ACCOUNT = 2;

export default function Dashboard() {
  const { clientName } = useAuth();
  const { dashboard, leads, unreadMessages, readLeads, markMessagesSeen } = useData();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const pager = useRef<PagerView>(null);
  const [page, setPage] = useState(DASH);

  const unreadLeadCount = useMemo(
    () => leads.filter((l) => l.status === 'new' && !readLeads.has(l.id)).length,
    [leads, readLeads],
  );
  const newCount = unreadLeadCount + unreadMessages;

  const go = (i: number) => pager.current?.setPage(i);

  // עדכון הכותרת בזמן אמת תוך כדי ההחלקה — מחליף בנקודת האמצע (offset 0.5).
  function onPageScroll(e: { nativeEvent: { position: number; offset: number } }) {
    const { position, offset } = e.nativeEvent;
    const active = offset >= 0.5 ? position + 1 : position;
    setPage((prev) => (prev !== active ? active : prev));
  }

  function onPageSelected(e: { nativeEvent: { position: number } }) {
    const p = e.nativeEvent.position;
    setPage(p);
    if (p === NOTIF) markMessagesSeen();
  }

  const title =
    page === NOTIF ? 'התראות' : page === ACCOUNT ? 'חשבון' : (clientName ?? dashboard?.client_name ?? 'הבית שלי');

  const BackBtn = ({ dir }: { dir: 'left' | 'right' }) => (
    <Pressable onPress={() => go(DASH)} hitSlop={14} accessibilityLabel="חזרה" style={s.hBtn}>
      <Feather name={dir === 'right' ? 'chevron-right' : 'chevron-left'} size={27} color={c.text} />
    </Pressable>
  );

  return (
    <View style={s.wrap}>
      <Stack.Screen
        options={{
          title,
          // דשבורד: התראות (פעמון) בצד ימין, חשבון (איש) בצד שמאל.
          // חשבון: חץ חזרה בצד שמאל (פונה שמאלה). התראות: חץ חזרה בצד ימין (פונה ימינה).
          headerLeft:
            page === DASH
              ? () => (
                  <Pressable onPress={() => go(NOTIF)} hitSlop={12} accessibilityLabel="התראות" style={s.bellBtn}>
                    <Feather name="bell" size={22} color={c.text2} />
                    {newCount > 0 ? (
                      <View style={s.countPill}>
                        <Text style={s.countText}>{newCount}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                )
              : page === ACCOUNT
                ? () => <BackBtn dir="left" />
                : () => null,
          headerRight:
            page === DASH
              ? () => (
                  <Pressable onPress={() => go(ACCOUNT)} hitSlop={12} accessibilityLabel="חשבון" style={s.iconBtn}>
                    <Feather name="user" size={22} color={c.text2} />
                  </Pressable>
                )
              : page === NOTIF
                ? () => <BackBtn dir="right" />
                : () => null,
        }}
      />

      <PagerView
        ref={pager}
        style={s.pager}
        initialPage={DASH}
        layoutDirection="ltr"
        onPageScroll={onPageScroll}
        onPageSelected={onPageSelected}
      >
        <View key="notif" style={s.page}><NotificationsView /></View>
        <View key="dash" style={s.page}><DashboardView /></View>
        <View key="account" style={s.page}><Settings /></View>
      </PagerView>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg },
  pager: { flex: 1 },
  page: { flex: 1, backgroundColor: c.bg },
  hBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  bellBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2, paddingVertical: 4 },
  countPill: { backgroundColor: c.primary, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { color: '#fff', fontSize: 12, fontWeight: '800', includeFontPadding: false },
});
