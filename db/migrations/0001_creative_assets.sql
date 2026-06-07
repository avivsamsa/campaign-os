-- פאזה 6 — נכס קריאטיב מלא (מעבר ל-thumbnail).
-- full_asset_url: image_url ברזולוציה מלאה (תמונה) או source של הווידאו.
-- asset_type: 'image' | 'video' — קובע איך ה-lightbox מציג.
alter table creatives add column if not exists full_asset_url text;
alter table creatives add column if not exists asset_type text;
