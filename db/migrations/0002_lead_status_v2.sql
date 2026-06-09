-- סטטוסי לידים מורחבים: פייפליין מכירה ולא רק new/contacted/closed/lost.
-- מסירים את ה-check הישן, ממפים ערכים ישנים לחדשים, מוסיפים check חדש.

alter table leads drop constraint if exists leads_status_check;

-- נורמליזציה של דאטה קיים שלא נמצא בסט החדש
update leads set status = 'irrelevant' where status = 'lost';
update leads set status = 'followup'   where status = 'contacted';

alter table leads add constraint leads_status_check check (
  status in (
    'new',
    'no_answer_1',
    'no_answer_2',
    'followup',
    'meeting_scheduled',
    'whatsapp',
    'quote_sent',
    'closed',
    'irrelevant'
  )
);
