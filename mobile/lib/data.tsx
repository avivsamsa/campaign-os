import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getDashboard, getLeads, getMessages, getStatuses, type CustomStatus, type DashboardData, type Lead, type Message } from './api';
import { useAuth } from './auth';

type DataState = {
  leads: Lead[];
  dashboard: DashboardData | null;
  statuses: CustomStatus[];
  messages: Message[];
  unreadMessages: number;
  markMessagesSeen: () => void;
  ready: boolean;
  refresh: () => Promise<void>;
};

const DataContext = createContext<DataState>({
  leads: [],
  dashboard: null,
  statuses: [],
  messages: [],
  unreadMessages: 0,
  markMessagesSeen: () => {},
  ready: false,
  refresh: async () => {},
});

// hook לצליל/רטט — נרשם בנפרד (כדי לא לחייב תלות אודיו כאן)
let newLeadsHandler: ((leads: Lead[]) => void) | null = null;
export function onNewLeads(cb: ((leads: Lead[]) => void) | null) {
  newLeadsHandler = cb;
}

const POLL_MS = 12000;
const MSG_SEEN_KEY = 'messages_seen_at';

export function DataProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [seenAt, setSeenAt] = useState<number>(0);
  const [ready, setReady] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);
  const inflight = useRef(false);

  // טעינת חותמת "נצפה לאחרונה" של העדכונים
  useEffect(() => {
    SecureStore.getItemAsync(MSG_SEEN_KEY)
      .then((v) => { if (v) setSeenAt(Number(v) || 0); })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    if (!token || inflight.current) return;
    inflight.current = true;
    try {
      const [ls, dash, sts, msgs] = await Promise.all([
        getLeads(),
        getDashboard().catch(() => null),
        getStatuses().catch(() => [] as CustomStatus[]),
        getMessages().catch(() => [] as Message[]),
      ]);
      const fresh = ls.filter((l) => !seen.current.has(l.id));
      ls.forEach((l) => seen.current.add(l.id));
      if (!first.current && fresh.length > 0 && newLeadsHandler) newLeadsHandler(fresh);
      first.current = false;
      setLeads(ls);
      if (dash) setDashboard(dash);
      setStatuses(sts);
      setMessages(msgs);
      setReady(true);
    } catch {
      /* שקט — ננסה שוב בפולינג הבא */
    } finally {
      inflight.current = false;
    }
  }, [token]);

  // טעינה ראשונית / איפוס בהחלפת token
  useEffect(() => {
    if (!token) {
      setLeads([]);
      setDashboard(null);
      setStatuses([]);
      setMessages([]);
      setReady(false);
      seen.current.clear();
      first.current = true;
      return;
    }
    refresh();
  }, [token, refresh]);

  // פולינג ברקע + רענון בחזרה לפוקוס — עדכון לייב
  useEffect(() => {
    if (!token) return;
    const iv = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, POLL_MS);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refresh();
    });
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, [token, refresh]);

  const unreadMessages = useMemo(
    () => messages.filter((m) => new Date(m.created_at).getTime() > seenAt).length,
    [messages, seenAt],
  );

  const markMessagesSeen = useCallback(() => {
    const newest = messages.reduce((max, m) => Math.max(max, new Date(m.created_at).getTime()), 0);
    const stamp = Math.max(newest, Date.now());
    setSeenAt(stamp);
    SecureStore.setItemAsync(MSG_SEEN_KEY, String(stamp)).catch(() => {});
  }, [messages]);

  return (
    <DataContext.Provider
      value={{ leads, dashboard, statuses, messages, unreadMessages, markMessagesSeen, ready, refresh }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
