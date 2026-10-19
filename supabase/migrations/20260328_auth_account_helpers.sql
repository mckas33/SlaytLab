-- SlaytLab: hesap silme + parola politikası notları
-- Bu dosyayı Supabase SQL Editor'de çalıştırın.
-- slides.user_id için ON DELETE CASCADE (veya eşdeğer) yoksa önce
-- images/regions/questions ilişkilerini kontrol edin.

-- Kullanıcının kendi hesabını silmesi (auth.users)
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  jwt_session_id uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from auth.sessions as s
    where s.id = jwt_session_id
      and s.user_id = uid
      and s.created_at between now() - interval '5 minutes' and now()
  ) then
    raise exception 'Recent authentication required';
  end if;

  -- Uygulama verileri (RLS + user_id ile sınırlı)
  delete from public.slides where user_id = uid;

  -- Kimlik kaydı
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- Örnek RLS (tablolarınız zaten farklıysa uyarlayın):
-- alter table public.slides enable row level security;
-- create policy "slides_owner_all" on public.slides
--   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
