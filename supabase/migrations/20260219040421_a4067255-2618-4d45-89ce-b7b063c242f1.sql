
ALTER TABLE public.leads ADD COLUMN city text DEFAULT 'Toronto';

-- Set all existing leads to Toronto
UPDATE public.leads SET city = 'Toronto' WHERE city IS NULL;
