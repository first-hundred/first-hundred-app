DROP POLICY IF EXISTS "own usage insert" ON public.usage;
DROP POLICY IF EXISTS "own usage update" ON public.usage;
DROP POLICY IF EXISTS "own usage delete" ON public.usage;
REVOKE INSERT, UPDATE, DELETE ON public.usage FROM authenticated, anon;
GRANT SELECT ON public.usage TO authenticated;
GRANT ALL ON public.usage TO service_role;