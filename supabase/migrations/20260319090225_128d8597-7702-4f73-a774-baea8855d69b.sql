UPDATE public.leads 
SET instagram_handle = regexp_replace(
  regexp_replace(instagram_handle, '^https?://(www\.)?instagram\.com/', ''),
  '[/?#].*$', ''
)
WHERE instagram_handle LIKE '%instagram.com%';