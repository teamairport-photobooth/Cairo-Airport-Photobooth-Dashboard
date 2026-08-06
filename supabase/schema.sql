-- Cairo Airport AI Photobooth - Supabase Database Schema & Initial Seed

-- 1. Allowed Users Whitelist Table (Invite-Only Access)
CREATE TABLE IF NOT EXISTS public.allowed_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'ADMIN', -- 'ADMIN' or 'REGULAR'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Profiles Table (Maps to Supabase Auth profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'REGULAR', -- 'ADMIN' or 'REGULAR'
    avatar_url TEXT,
    assigned_project_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused', 'exhausted'
    daily_limit INT NOT NULL DEFAULT 500,
    current_generations INT NOT NULL DEFAULT 0,
    max_usage INT DEFAULT 500,
    total_usage INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    cloudinary_cloud_name TEXT,
    cloudinary_api_key TEXT,
    cloudinary_api_secret TEXT,
    cloudinary_tag TEXT DEFAULT 'cairo-airport-photobooth',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Usage Logs Table
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    amount INT NOT NULL DEFAULT 1,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Global Settings Table
CREATE TABLE IF NOT EXISTS public.global_settings (
    id TEXT PRIMARY KEY DEFAULT 'current',
    cloudinary_cloud_name TEXT,
    cloudinary_api_key TEXT,
    cloudinary_api_secret TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Allowed Users RLS
DROP POLICY IF EXISTS "Allow public read of allowed_users" ON public.allowed_users;
DROP POLICY IF EXISTS "Allow authenticated manage allowed_users" ON public.allowed_users;
CREATE POLICY "Allow public read of allowed_users" ON public.allowed_users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated manage allowed_users" ON public.allowed_users FOR ALL TO authenticated USING (true);

-- Profiles RLS
DROP POLICY IF EXISTS "Profiles public read" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert profile" ON public.profiles;
CREATE POLICY "Profiles public read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow insert profile" ON public.profiles FOR INSERT WITH CHECK (true);

-- Projects & Settings RLS
DROP POLICY IF EXISTS "Public read projects" ON public.projects;
DROP POLICY IF EXISTS "Public update projects" ON public.projects;
DROP POLICY IF EXISTS "Public insert projects" ON public.projects;
DROP POLICY IF EXISTS "Public settings read" ON public.global_settings;
DROP POLICY IF EXISTS "Public settings update" ON public.global_settings;
CREATE POLICY "Public read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Public update projects" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Public insert projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Public settings read" ON public.global_settings FOR SELECT USING (true);
CREATE POLICY "Public settings update" ON public.global_settings FOR ALL USING (true);

-- 8. Strict Trigger: ONLY create profile if email is in allowed_users!
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT := NULL;
BEGIN
    -- Check if user's email is in allowed_users (case-insensitive)
    SELECT role INTO user_role 
    FROM public.allowed_users 
    WHERE LOWER(email) = LOWER(new.email);

    -- STRICT GUARD: Only create a profile row if the user is whitelisted!
    IF user_role IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
        VALUES (
            new.id,
            new.email,
            coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
            new.raw_user_meta_data->>'avatar_url',
            user_role
        )
        ON CONFLICT (id) DO UPDATE 
        SET full_name = EXCLUDED.full_name,
            avatar_url = EXCLUDED.avatar_url,
            role = EXCLUDED.role;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Initial Seed Data
INSERT INTO public.projects (
    name, description, status, daily_limit, current_generations, cloudinary_tag
) VALUES (
    'Cairo Airport AI Photobooth', 'Main AI Photobooth instance at Cairo International Airport', 'active', 500, 0, 'cairo-airport-photobooth'
) ON CONFLICT DO NOTHING;

INSERT INTO public.global_settings (id) VALUES ('current') ON CONFLICT DO NOTHING;
