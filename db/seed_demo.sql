-- seed_demo.sql — לקוח דמו מלא ("מטבחי לוטוס") לצילומי מסך ולבודקי אפל.
-- בטוח להרצה חוזרת: מנקה ומזריע מחדש רק את לקוח ה-demo (slug='demo').
-- אינו נוגע באף לקוח אחר.

do $$
declare
  v_client uuid;
  p_kitchen uuid := '11111111-0000-4000-8000-000000000001';
  p_bath    uuid := '11111111-0000-4000-8000-000000000002';
  p_doors   uuid := '11111111-0000-4000-8000-000000000003';
  l_sara uuid := 'aaaa0000-0000-4000-8000-000000000004';
  l_nir  uuid := 'aaaa0000-0000-4000-8000-000000000015';
begin
  select id into v_client from clients where lower(slug) = 'demo';
  if v_client is null then
    raise exception 'demo client (slug=demo) not found';
  end if;

  -- שם עסק + רווח גולמי
  update clients set name = 'מטבחי לוטוס', gross_margin = 0.4 where id = v_client;

  -- ניקוי seed קודם (לקוח הדמו בלבד)
  delete from lead_notes where lead_id in (select id from leads where client_id = v_client);
  delete from leads where client_id = v_client;
  delete from lead_form_routes where client_id = v_client;
  delete from products where client_id = v_client;
  delete from portal_messages where client_id = v_client;

  -- קטגוריות (מוצרים) + הגדרת רווח
  insert into products (id, client_id, name, profit_mode, price, margin_pct) values
    (p_kitchen, v_client, 'מטבחים',        'margin', 45000, 0.35),
    (p_bath,    v_client, 'ארונות אמבטיה', 'margin',  8000, 0.40),
    (p_doors,   v_client, 'דלתות פנים',    'margin',  6000, 0.45);

  -- ניתוב טופס → קטגוריה
  insert into lead_form_routes (form_id, client_id, product_id) values
    ('demo_form_kitchen', v_client, p_kitchen),
    ('demo_form_bath',    v_client, p_bath),
    ('demo_form_doors',   v_client, p_doors);

  -- ── לידים ─────────────────────────────────────────────
  -- מטבחים
  insert into leads (id, client_id, name, phone, email, status, deal_value, source, form_id, created_at, closed_at) values
    (l_sara, v_client, 'שרה פרידמן', '+972524234504', 'sara@example.com', 'closed', 52000, 'meta', 'demo_form_kitchen', now() - interval '3 days', now() - interval '1 day');

  insert into leads (client_id, name, phone, email, status, deal_value, source, form_id, created_at, closed_at) values
    (v_client, 'אלה נוי',      '+972546234523', 'ella@example.com',  'new',              null, 'meta', 'demo_form_kitchen', now() - interval '35 minutes', null),
    (v_client, 'יוסי כהן',     '+972521234501', 'yossi@example.com', 'new',              null, 'meta', 'demo_form_kitchen', now() - interval '6 hours',    null),
    (v_client, 'מיכל לוי',     '+972522234502', 'michal@example.com','new',              null, 'meta', 'demo_form_kitchen', now() - interval '1 day',      null),
    (v_client, 'אבי מזרחי',    '+972523234503', 'avi@example.com',   'meeting_scheduled',null, 'meta', 'demo_form_kitchen', now() - interval '2 days',     null),
    (v_client, 'דוד ביטון',    '+972525234505', 'david@example.com', 'quote_sent',       null, 'meta', 'demo_form_kitchen', now() - interval '4 days',     null),
    (v_client, 'נועה שפירא',   '+972526234506', 'noa@example.com',   'no_answer_1',      null, 'meta', 'demo_form_kitchen', now() - interval '5 days',     null),
    (v_client, 'איתי גולן',    '+972527234507', 'itay@example.com',  'closed',          41000, 'meta', 'demo_form_kitchen', now() - interval '6 days',     now() - interval '3 days'),
    (v_client, 'רונית אזולאי', '+972528234508', 'ronit@example.com', 'followup',         null, 'meta', 'demo_form_kitchen', now() - interval '7 days',     null),
    (v_client, 'עומר דהן',     '+972529234509', 'omer@example.com',  'closed',          38000, 'meta', 'demo_form_kitchen', now() - interval '9 days',     now() - interval '6 days'),
    (v_client, 'לינוי חדד',    '+972521234510', 'linoy@example.com', 'irrelevant',       null, 'meta', 'demo_form_kitchen', now() - interval '10 days',    null);

  -- ארונות אמבטיה
  insert into leads (id, client_id, name, phone, email, status, deal_value, source, form_id, created_at, closed_at) values
    (l_nir, v_client, 'ניר קפלן', '+972535234515', 'nir@example.com', 'closed', 7500, 'meta', 'demo_form_bath', now() - interval '7 days', now() - interval '5 days');

  insert into leads (client_id, name, phone, email, status, deal_value, source, form_id, created_at, closed_at) values
    (v_client, 'גל נחום',    '+972532234511', 'gal@example.com',   'new',              null, 'meta', 'demo_form_bath', now() - interval '3 hours', null),
    (v_client, 'בר קדוש',    '+972547234524', 'bar@example.com',   'new',              null, 'meta', 'demo_form_bath', now() - interval '4 hours', null),
    (v_client, 'תמר ברק',    '+972532234512', 'tamar@example.com', 'whatsapp',         null, 'meta', 'demo_form_bath', now() - interval '1 day',   null),
    (v_client, 'יואב סגל',   '+972533234513', 'yoav@example.com',  'closed',           9200, 'meta', 'demo_form_bath', now() - interval '4 days',  now() - interval '2 days'),
    (v_client, 'הדס מלכה',   '+972534234514', 'hadas@example.com', 'no_answer_2',      null, 'meta', 'demo_form_bath', now() - interval '5 days',  null),
    (v_client, 'אור בן דוד', '+972536234516', 'or@example.com',    'meeting_scheduled',null, 'meta', 'demo_form_bath', now() - interval '8 days',  null),
    (v_client, 'ריף חלבי',   '+972537234517', 'rif@example.com',   'followup',         null, 'meta', 'demo_form_bath', now() - interval '11 days', null);

  -- דלתות פנים
  insert into leads (client_id, name, phone, email, status, deal_value, source, form_id, created_at, closed_at) values
    (v_client, 'שי אלון',    '+972541234518', 'shay@example.com',  'new',        null, 'meta', 'demo_form_doors', now() - interval '10 hours', null),
    (v_client, 'מור טל',     '+972542234519', 'mor@example.com',   'quote_sent', null, 'meta', 'demo_form_doors', now() - interval '2 days',    null),
    (v_client, 'עדן רז',     '+972543234520', 'eden@example.com',  'closed',     6800, 'meta', 'demo_form_doors', now() - interval '5 days',    now() - interval '3 days'),
    (v_client, 'ליאור פרץ',  '+972544234521', 'lior@example.com',  'closed',     5400, 'meta', 'demo_form_doors', now() - interval '8 days',    now() - interval '6 days'),
    (v_client, 'דנה שמש',    '+972545234522', 'dana@example.com',  'no_answer_1',null, 'meta', 'demo_form_doors', now() - interval '12 days',   null);

  -- ── יומן פעילות לשני לידים (לתצוגת פרטי ליד) ──────────
  insert into lead_notes (lead_id, kind, body, meta, created_at) values
    (l_sara, 'note',     'התקשרתי, מעוניינת במטבח מודרני בגוון לבן. שלחתי קטלוג בוואטסאפ.', null,                                          now() - interval '2 days 4 hours'),
    (l_sara, 'note',     'נקבעה פגישת מדידה בבית הלקוחה ליום ראשון.',                        null,                                          now() - interval '2 days'),
    (l_sara, 'status',   '',                                                                 '{"from":"meeting_scheduled","to":"closed"}', now() - interval '1 day'),
    (l_sara, 'purchase', '',                                                                 '{"amount":52000}',                            now() - interval '1 day'),
    (l_nir,  'note',     'ביקש הצעת מחיר לארון אמבטיה 120 סמ עם כיור כפול.',                  null,                                          now() - interval '6 days'),
    (l_nir,  'status',   '',                                                                 '{"from":"quote_sent","to":"closed"}',        now() - interval '5 days'),
    (l_nir,  'purchase', '',                                                                 '{"amount":7500}',                             now() - interval '5 days');

  -- ── עדכונים מהסוכנות (התראות) ─────────────────────────
  insert into portal_messages (client_id, title, body, created_at) values
    (v_client, 'הדוח החודשי שלך מוכן 📊', 'סיכום ביצועי הקמפיינים לחודש האחרון זמין. סהכ 24 לידים ו-7 מכירות בהיקף של כ-160 אלף שקל. עבודה מצוינת!', now() - interval '1 day'),
    (v_client, 'קמפיין חדש עלה לאוויר 🚀', 'השקנו עבורך קמפיין חדש לקטגוריית דלתות פנים. צפויים לידים נוספים בימים הקרובים.',                        now() - interval '3 days'),
    (v_client, 'טיפ לשיפור המרות',        'לידים שמקבלים מענה תוך 5 דקות סוגרים פי 3. מומלץ לחזור מהר ללידים חדשים!',                                now() - interval '5 days');

  raise notice 'Demo client seeded: %', v_client;
end $$;
