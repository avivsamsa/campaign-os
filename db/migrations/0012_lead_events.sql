-- פאזה 13 — יומן פעילות: הופך את lead_notes ליומן אירועים מלא.
-- kind: 'note' (ידני) | 'status' (שינוי סטטוס) | 'purchase' (רכישה) | 'irrelevant' (לא רלוונטי).
-- meta: פרטי האירוע (from/to סטטוס, סכום, סיבה) — לתצוגה בציר הזמן.
alter table lead_notes add column if not exists kind text not null default 'note';
alter table lead_notes add column if not exists meta jsonb;
