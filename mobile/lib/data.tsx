import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
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
  readLeads: Set<string>;
  markLeadRead: (id: string) => void;
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
  readLeads: new Set(),
  markLeadRead: () => {},
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
const READ_LEADS_KEY = 'read_leads';
const READ_LEADS_CAP = 200;

export function DataProvider({ children }: { children: ReactNode }) {
  const { token, signOut } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [seenAt, setSeenAt] = useState<number>(0);
  const [readLeads, setReadLeads] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);
  const inflight = useRef(false);

  // טעינת חותמת "נצפה לאחרונה" של העדכונים + רשימת לידים שנקראו
  useEffect(() => {
    SecureStore.getItemAsync(MSG_SEEN_KEY)
      .then((v) => { if (v) setSeenAt(Number(v) || 0); })
      .catch(() => {});
    SecureStore.getItemAsync(READ_LEADS_KEY)
      .then((v) => { if (v) { try { setReadLeads(new Set(JSON.parse(v))); } catch { /* ignore */ } } })
      .catch(() => {});
  }, []);

  const markLeadRead = useCallback((id: string) => {
    setReadLeads((prev) => {
      if (prev.has(id)) return prev;
      const arr = [...prev, id].slice(-READ_LEADS_CAP);
      SecureStore.setItemAsync(READ_LEADS_KEY, JSON.stringify(arr)).catch(() => {});
      return new Set(arr);
    });
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
    } catch (e) {
      // סשן פג תוקף (טוקן ישן) → נתק והחזר להתחברות. אחרת נשארים תקועים בטעינה אינסופית.
      if (e instanceof Error && e.message === 'UNAUTHORIZED') {
        await signOut();
        router.replace('/login');
        return;
      }
      /* שגיאה זמנית אחרת — ננסה שוב בפולינג הבא */
    } finally {
      // תמיד לסמן "מוכן" כדי שהמסך יציג תוכן/מצב-ריק במקום ספינר נצחי.
      setReady(true);
      inflight.current = false;
    }
  }, [token, signOut]);

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
      value={{ leads, dashboard, statuses, messages, unreadMessages, markMessagesSeen, readLeads, markLeadRead, ready, refresh }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
