import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { getDashboard, getLeads, getStatuses, type CustomStatus, type DashboardData, type Lead } from './api';
import { useAuth } from './auth';

type DataState = {
  leads: Lead[];
  dashboard: DashboardData | null;
  statuses: CustomStatus[];
  ready: boolean;
  refresh: () => Promise<void>;
};

const DataContext = createContext<DataState>({
  leads: [],
  dashboard: null,
  statuses: [],
  ready: false,
  refresh: async () => {},
});

// hook לצליל/רטט — נרשם בנפרד (כדי לא לחייב תלות אודיו כאן)
let newLeadsHandler: ((leads: Lead[]) => void) | null = null;
export function onNewLeads(cb: ((leads: Lead[]) => void) | null) {
  newLeadsHandler = cb;
}

const POLL_MS = 12000;

export function DataProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [statuses, setStatuses] = useState<CustomStatus[]>([]);
  const [ready, setReady] = useState(false);
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (!token || inflight.current) return;
    inflight.current = true;
    try {
      const [ls, dash, sts] = await Promise.all([
        getLeads(),
        getDashboard().catch(() => null),
        getStatuses().catch(() => [] as CustomStatus[]),
      ]);
      const fresh = ls.filter((l) => !seen.current.has(l.id));
      ls.forEach((l) => seen.current.add(l.id));
      if (!first.current && fresh.length > 0 && newLeadsHandler) newLeadsHandler(fresh);
      first.current = false;
      setLeads(ls);
      if (dash) setDashboard(dash);
      setStatuses(sts);
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

  return (
    <DataContext.Provider value={{ leads, dashboard, statuses, ready, refresh }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
