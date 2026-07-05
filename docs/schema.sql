-- Create Teams table
CREATE TABLE IF NOT EXISTS public.teams (
    team_id TEXT PRIMARY KEY,
    team_name TEXT NOT NULL,
    problem_statement TEXT,
    members JSONB DEFAULT '[]'::jsonb,
    pdf_url TEXT,
    status TEXT DEFAULT 'pending',
    score JSONB DEFAULT '{}'::jsonb,
    evaluator_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Evaluators table
CREATE TABLE IF NOT EXISTS public.evaluators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create Team Leaders table
CREATE TABLE IF NOT EXISTS public.team_leaders (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Optional: Enable Row Level Security (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_leaders ENABLE ROW LEVEL SECURITY;

-- Optional: Create basic policies to allow service role access
CREATE POLICY "Allow all access to service_role" ON public.teams
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
    
CREATE POLICY "Allow all access to service_role" ON public.evaluators
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all access to service_role" ON public.team_leaders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
