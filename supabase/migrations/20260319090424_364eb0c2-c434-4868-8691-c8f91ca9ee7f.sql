UPDATE public.leads 
SET instagram_handle = ltrim(instagram_handle, '@')
WHERE instagram_handle LIKE '@%';