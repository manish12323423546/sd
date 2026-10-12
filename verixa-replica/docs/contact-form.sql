-- Verixa replica contact form: insert-only storage. Run once in the Supabase SQL editor.
create table if not exists public.verixa_contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  phone text check (phone is null or char_length(phone) <= 40),
  subject text not null check (char_length(subject) between 1 and 200),
  message text not null check (char_length(message) between 2 and 4000)
);

comment on table public.verixa_contact_messages is
  'Verixa replica: messages from the website contact form. Insert only via verixa_submit_contact(); never readable by anon/authenticated.';

alter table public.verixa_contact_messages enable row level security;
revoke all on public.verixa_contact_messages from anon, authenticated;

create or replace function public.verixa_submit_contact(p_name text, p_phone text, p_subject text, p_message text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_id uuid;
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 120
     or char_length(btrim(coalesce(p_subject, ''))) not between 1 and 200
     or char_length(btrim(coalesce(p_message, ''))) not between 2 and 4000
     or char_length(coalesce(p_phone, '')) > 40 then
    raise sqlstate 'PT400' using message = 'invalid_request';
  end if;

  -- Site-wide limit: 60 messages per hour.
  if (select count(*) from public.verixa_contact_messages where created_at > now() - interval '1 hour') >= 60 then
    raise sqlstate 'PT429' using message = 'rate_limited';
  end if;

  insert into public.verixa_contact_messages (name, phone, subject, message)
  values (btrim(p_name), nullif(btrim(coalesce(p_phone, '')), ''), btrim(p_subject), btrim(p_message))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.verixa_submit_contact(text, text, text, text) from public;
grant execute on function public.verixa_submit_contact(text, text, text, text) to anon;
