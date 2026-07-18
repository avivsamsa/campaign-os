import * as SecureStore from 'expo-secure-store';
import { API_BASE, TOKEN_KEY } from './config';

async function authHeaders(): Promise<Record<string, string>> {
  const t = await SecureStore.getItemAsync(TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export type Lead = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  deal_value: number | null;
  created_at: string;
  notes_count: number;
  reason_label: string | null;
  category_id: string | null;
  category_name: string | null;
};

export type CustomStatus = { id: string; label: string; color: string };
export type Note = { id: string; body: string; kind?: string; meta?: any; created_at: string };

export async function login(slug: string, password: string) {
  const r = await fetch(`${API_BASE}/api/portal/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, password }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'התחברות נכשלה');
  return d as { token: string; client?: { name: string } };
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, { headers: await authHeaders() });
  if (r.status === 401) throw new Error('UNAUTHORIZED');
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error('UNAUTHORIZED');
  if (!r.ok) throw new Error((d as any).error || String(r.status));
  return d as T;
}

export const getLeads = () => get<{ leads: Lead[] }>('/api/portal/leads').then((d) => d.leads);
export const getStatuses = () =>
  get<{ statuses: CustomStatus[] }>('/api/portal/statuses').then((d) => d.statuses ?? []);
export const addStatus = (label: string, color: string) =>
  send<{ status: CustomStatus }>('/api/portal/statuses', 'POST', { label, color });
export const getNotes = (id: string) =>
  get<{ notes: Note[] }>(`/api/portal/leads/${id}/notes`).then((d) => d.notes ?? []);
export const addNote = (id: string, body: string) =>
  send<{ note: Note }>(`/api/portal/leads/${id}/notes`, 'POST', { body });
export const updateLead = (
  id: string,
  patch: { status?: string; deal_value?: number | null; reason_id?: string },
) => send(`/api/portal/leads/${id}`, 'PATCH', patch);
export const deleteAccount = () =>
  send<{ ok: boolean; demo?: boolean }>('/api/portal/account', 'DELETE');

export type DashboardData = {
  client_name: string;
  totals: { leads: number; new: number; closed: number; revenue: number; profit: number };
  categories: { key: string; name: string; count: number; new_count: number }[];
};
export const getDashboard = () => get<DashboardData>('/api/portal/dashboard');

export type Message = { id: string; title: string; body: string; created_at: string };
export const getMessages = () =>
  get<{ messages: Message[] }>('/api/portal/messages').then((d) => d.messages ?? []);

export type Reason = { id: string; label: string };
export const getReasons = (category: string | null) =>
  get<{ admin: Reason[]; client: Reason[] }>(`/api/portal/reasons?category=${category ?? ''}`);
export const addReason = (label: string, category: string | null) =>
  send<{ reason: Reason }>('/api/portal/reasons', 'POST', { label, category });
