import { useMemo, useState } from 'react';
import { FlatList, I18nManager, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { useData } from '../lib/data';
import { useColors } from '../lib/theme-context';
import { CONTENT_MAX, type Palette } from '../lib/theme';
import type { Lead, Message } from '../lib/api';
import { FadeIn } from '../lib/anim';

const rowDir = I18nManager.isRTL ? 'row' : 'row-reverse';

type Item =
  | { kind: 'message'; at: number; msg: Message }
  | { kind: 'lead'; at: number; lead: Lead };

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'הרגע';
  if (m < 60) return `לפני ${m} ד׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} ש׳`;
  const d = Math.floor(h / 24);
  if (d < 7) return `לפני ${d} י׳`;
  return `לפני ${Math.floor(d / 7)} שב׳`;
}

function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join('').toUpperCase() || '?';
}

// תוכן ההתראות בלבד (בלי כותרת/החלקה) — משמש כדף ב-pager וגם ב-route העצמאי.
export default function NotificationsView() {
  const { leads, messages, readLeads, ready, refresh } = useData();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [refreshing, setRefreshing] = useState(false);

  // סימון "נקרא" מתבצע ע"י מארח ה-pager כשמגיעים לדף ההתראות (onPageSelected).

  const isLeadRead = (l: Lead) => readLeads.has(l.id) || l.status !== 'new';

  const items = useMemo<Item[]>(() => {
    const msg: Item[] = messages.map((m) => ({ kind: 'message', at: new Date(m.created_at).getTime(), msg: m }));
    const ld: Item[] = leads
      .filter((l) => l.status === 'new' || readLeads.has(l.id))
      .map((l) => ({ kind: 'lead', at: new Date(l.created_at).getTime(), lead: l }));
    return [...msg, ...ld].sort((a, b) => b.at - a.at);
  }, [messages, leads, readLeads]);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <View style={s.wrap}>
      <FlatList
        data={items}
        keyExtractor={(it) => (it.kind === 'message' ? `m_${it.msg.id}` : `l_${it.lead.id}`)}
        contentContainerStyle={{ paddingBottom: 24, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
        ListHeaderComponent={items.length ? <Text style={s.sectionHead}>חדש</Text> : null}
        ListEmptyComponent={
          !ready ? null : (
            <View style={s.empty}>
              <View style={s.emptyIcon}><Feather name="bell" size={26} color={c.muted} /></View>
              <Text style={s.emptyText}>אין התראות חדשות</Text>
              <Text style={s.emptySub}>כאן יופיעו עדכונים מהסוכנות ולידים חדשים</Text>
            </View>
          )
        }
        renderItem={({ item, index }) =>
          item.kind === 'message' ? (
            <FadeIn index={index} delay={20}>
              <View style={[s.row, { flexDirection: rowDir }]}>
                <View style={s.avatarWrap}>
                  <View style={[s.avatar, { backgroundColor: c.primarySoft }]}>
                    <FontAwesome name="bullhorn" size={18} color={c.primary} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.titleBold} numberOfLines={1}>{item.msg.title}</Text>
                  <Text style={s.body} numberOfLines={3}>{item.msg.body}</Text>
                  <Text style={s.meta}>{timeAgo(item.msg.created_at)}</Text>
                </View>
              </View>
            </FadeIn>
          ) : (
            (() => {
              const read = isLeadRead(item.lead);
              return (
                <FadeIn index={index} delay={20}>
                  <Pressable
                    style={({ pressed }) => [s.row, { flexDirection: rowDir }, !read && s.rowUnread, pressed && s.rowPressed]}
                    onPress={() => router.push(`/lead/${item.lead.id}`)}
                  >
                    <View style={s.avatarWrap}>
                      <View style={[s.avatar, read && { opacity: 0.75 }]}><Text style={s.avatarTxt}>{initials(item.lead.name)}</Text></View>
                      <View style={[s.avatarBadge, read && { backgroundColor: c.muted2 }]}><Feather name="user-plus" size={11} color="#fff" /></View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.title} numberOfLines={2}>
                        <Text style={read ? s.titleRead : s.titleBold}>{item.lead.name || 'ליד חדש'}</Text>
                        {' - ליד חדש ממתין לטיפול'}
                      </Text>
                      <Text style={s.meta} numberOfLines={1}>
                        {item.lead.category_name ? `${item.lead.category_name} · ` : ''}
                        {timeAgo(item.lead.created_at)}
                      </Text>
                    </View>
                    {read ? null : <View style={s.unreadDot} />}
                  </Pressable>
                </FadeIn>
              );
            })()
          )
        }
      />
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg },
  sectionHead: { color: c.text, fontSize: 20, fontWeight: '800', textAlign: 'right', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  row: { alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border },
  rowUnread: { backgroundColor: c.primarySoft, borderBottomColor: 'transparent' },
  rowPressed: { backgroundColor: c.surface2 },
  avatarWrap: { width: 54, height: 54 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  avatarTxt: { color: c.text2, fontSize: 19, fontWeight: '800' },
  avatarBadge: { position: 'absolute', bottom: -1, left: -1, width: 22, height: 22, borderRadius: 11, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.bg },
  title: { color: c.text2, fontSize: 15, textAlign: 'right', lineHeight: 21 },
  titleBold: { color: c.text, fontWeight: '800', fontSize: 15.5, textAlign: 'right' },
  titleRead: { color: c.muted, fontWeight: '600', fontSize: 15.5, textAlign: 'right' },
  body: { color: c.text2, fontSize: 14, textAlign: 'right', marginTop: 3, lineHeight: 20 },
  meta: { color: c.muted, fontSize: 13, textAlign: 'right', marginTop: 3 },
  unreadDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: c.primary },
  empty: { alignItems: 'center', paddingTop: 90, gap: 8 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyText: { color: c.text2, fontSize: 16, fontWeight: '700' },
  emptySub: { color: c.muted2, fontSize: 13.5 },
});
