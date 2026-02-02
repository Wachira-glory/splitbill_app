-- New Parent Table: Bills
CREATE TABLE IF NOT EXISTS public.app_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_name TEXT NOT NULL,
    total_goal DECIMAL DEFAULT 0,
    owner_email TEXT NOT NULL, -- The "Email Claim" column
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New Child Table: Items
CREATE TABLE IF NOT EXISTS public.app_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES public.app_bills(id) ON DELETE CASCADE,
    item_name TEXT,
    amount DECIMAL NOT NULL,
    status TEXT DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.app_bills ENABLE ROW LEVEL SECURITY;

-- SELECT: Only see what matches your email
CREATE POLICY "Users can view own bills"
ON public.app_bills FOR SELECT
USING (owner_email = current_setting('request.jwt.claims', true)::json->>'email');

-- INSERT: Only add bills if you attach your own email
CREATE POLICY "Users can insert own bills"
ON public.app_bills FOR INSERT
WITH CHECK (owner_email = current_setting('request.jwt.claims', true)::json->>'email');

-- UPDATE: Only edit if you own it
CREATE POLICY "Users can update own bills"
ON public.app_bills FOR UPDATE
USING (owner_email = current_setting('request.jwt.claims', true)::json->>'email');

-- DELETE: Only delete if you own it
CREATE POLICY "Users can delete own bills"
ON public.app_bills FOR DELETE
USING (owner_email = current_setting('request.jwt.claims', true)::json->>'email');
ALTER TABLE public.app_items ENABLE ROW LEVEL SECURITY;

-- Combine all actions into one logic: 
-- "You can touch this item if you own the parent bill via email."
CREATE POLICY "Users can manage items of their bills"
ON public.app_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_bills 
    WHERE public.app_bills.id = public.app_items.bill_id 
    AND public.app_bills.owner_email = current_setting('request.jwt.claims', true)::json->>'email'
  )
);