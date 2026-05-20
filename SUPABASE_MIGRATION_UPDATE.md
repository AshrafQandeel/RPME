# Supabase Data API Security Update

Supabase is changing how tables in the `public` schema are exposed to the Data API. To ensure your application continues to function after these changes (October 30, 2026 for existing projects, or immediately for new projects), you must explicitly grant permissions to the database roles.

## Instructions

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Go to the **SQL Editor** in the left sidebar.
4. Create a **New query**.
5. Copy and paste the following SQL script into the editor.
6. Click **Run**.

## SQL Migration Script

```sql
-- 1. Grant access to public role (anon)
-- Allows the app to check system status and search sanctions before full login if required
GRANT SELECT ON public.sanctions TO anon;
GRANT SELECT ON public.system_metadata TO anon;

-- 2. Grant access to authenticated role
-- This allows logged-in users to perform their required actions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.ingestion_logs TO authenticated;
GRANT SELECT, INSERT ON public.system_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_metadata TO authenticated;

-- 3. Grant access to service_role (Admin)
-- Ensuring internal processes and maintenance tasks have full access
GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.sanctions TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.ingestion_logs TO service_role;
GRANT ALL ON public.system_logs TO service_role;
GRANT ALL ON public.system_metadata TO service_role;

-- 4. Enable Row Level Security (RLS)
-- It is recommended to have RLS enabled on all tables for security.
-- Note: If you already have RLS enabled, these commands will have no negative effect.
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metadata ENABLE ROW LEVEL SECURITY;

-- 5. Default Permissive Policies (Optional but recommended if you haven't set up specific RLS policies)
-- These allow authenticated users to interact with the data according to the grants above.
-- If you already have custom policies, you may choose to skip these.

DO $$ 
BEGIN
    -- Policy for clients
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'Enable access for authenticated users') THEN
        CREATE POLICY "Enable access for authenticated users" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- Policy for sanctions (Read-only for public, all for authenticated)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sanctions' AND policyname = 'Enable read for all') THEN
        CREATE POLICY "Enable read for all" ON public.sanctions FOR SELECT TO public USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sanctions' AND policyname = 'Enable all for authenticated') THEN
        CREATE POLICY "Enable all for authenticated" ON public.sanctions FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;

    -- Policy for profiles
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can see all profiles') THEN
        CREATE POLICY "Users can see all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.email() = email);
    END IF;
END $$;
```

## Why is this necessary?
Supabase is moving towards a "Secure by Default" model where tables are not automatically reachable via the browser-side Data API (`supabase-js`). By running this script, you explicitly tell Postgres that it is safe to allow your application to interact with these specific tables.

If you encounter a `42501` error in the future, it means a `GRANT` is still missing for a specific operation.
