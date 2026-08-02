-- מצב ההתראה האחרון שנשלח על סטטוס חשבון המודעות (למניעת push חוזר כל שעה).
-- ערך = "<account_status>.<disable_reason>" בזמן בעיה; null כשהחשבון בריא.
alter table clients add column if not exists account_alert_key text;
