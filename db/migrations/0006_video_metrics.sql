-- פאזה 7 — מדדי מעורבות וידאו (Hook rate / ThruPlay).
-- video_plays: 3-second video plays (מ-actions action_type 'video_view') — למונה של Hook rate.
-- video_thruplays: ThruPlays (video_thruplay_watched_actions) — צפייה עד 15ש' / סיום.
-- Hook rate = video_plays / impressions · ThruPlay rate = video_thruplays / impressions.
-- Frequency לא נשמר — מחושב כ-impressions / reach במנוע המטריקות.
alter table daily_metrics add column if not exists video_plays integer default 0;
alter table daily_metrics add column if not exists video_thruplays integer default 0;
