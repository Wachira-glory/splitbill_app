-- Create Bills Table
CREATE TABLE IF NOT EXISTS public.unda_bills_mirror (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    bill_name TEXT,
    total_goal DECIMAL DEFAULT 0,
    owner_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    raw_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Items Table
CREATE TABLE IF NOT EXISTS public.unda_items_mirror (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES public.unda_bills_mirror(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    status TEXT DEFAULT 'unpaid',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and Allow ALL actions
ALTER TABLE public.unda_bills_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unda_items_mirror ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage own bills" ON public.unda_bills_mirror FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "Manage own items" ON public.unda_items_mirror FOR ALL USING (
    EXISTS (SELECT 1 FROM public.unda_bills_mirror WHERE id = unda_items_mirror.bill_id AND owner_id = auth.uid())
);

-- REFRESH THE API (This fixes the 404)
NOTIFY pgrst, 'reload schema';