-- Explicit owner-only bootstrap for the account selected by the project owner.
-- Log in with Google once first. Never expose this operation through an RPC.
begin;
do $$
declare selected_user uuid;
declare matching_users integer;
begin
  select count(*), (array_agg(u.id))[1] into matching_users, selected_user
  from auth.users u
  where lower(u.email) = 'hoangtuanhung@gmail.com'
    and u.email_confirmed_at is not null
    and exists (
      select 1 from auth.identities i
      where i.user_id = u.id and i.provider = 'google'
    );
  if matching_users <> 1 then
    raise exception 'Expected exactly one confirmed Google account. Sign in first and check Authentication > Users.';
  end if;
  insert into public.hkpd_admin_access(user_id, approved)
  values (selected_user, true)
  on conflict (user_id) do update set approved = true, granted_at = now();
end $$;
commit;
