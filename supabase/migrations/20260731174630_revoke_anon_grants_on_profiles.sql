-- profiles is never meant to be readable/writable by unauthenticated
-- requests. RLS already blocks anon (no policy exists for it), but the
-- table carried broad default-privilege grants to anon from table
-- creation; revoke them explicitly for defense in depth / least privilege.
revoke all on public.profiles from anon;
