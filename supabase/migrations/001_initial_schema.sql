-- ============================================================
-- SproutStream — Supabase Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension (already on by default in Supabase)
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         text not null,
  avatar_url    text,
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing','active','canceled','past_due')),
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  referral_code  text unique default substring(md5(random()::text), 1, 8),
  referred_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- CHILDREN
-- ─────────────────────────────────────────────────────────────
create table if not exists public.children (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  age           int  not null check (age between 1 and 17),
  color         text not null default '#6C63FF',
  allowed_tags  text[] not null default '{}',
  pin_override  text,           -- null = use account-level PIN
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.children(user_id);

-- ─────────────────────────────────────────────────────────────
-- VIDEOS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.videos (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  description       text,
  cf_video_id       text unique,   -- Cloudflare Stream video ID
  cf_thumbnail_url  text,
  cf_stream_url     text,
  duration_seconds  int,
  tags              text[] not null default '{}',
  age_min           int not null default 0,
  status            text not null default 'processing'
    check (status in ('processing','ready','error')),
  file_size_bytes   bigint,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.videos(user_id);
create index on public.videos(user_id, status);

-- ─────────────────────────────────────────────────────────────
-- FAMILY VIEWERS
-- (People the account owner invites to watch — grandparents etc.)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.family_viewers (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  viewer_id   uuid references public.profiles(id) on delete set null,
  email       text not null,
  name        text,
  status      text not null default 'pending'
    check (status in ('pending','accepted','revoked')),
  invited_at  timestamptz not null default now()
);
create index on public.family_viewers(owner_id);
create index on public.family_viewers(email);

-- ─────────────────────────────────────────────────────────────
-- REFERRALS
-- ─────────────────────────────────────────────────────────────
create table if not exists public.referrals (
  id              uuid primary key default uuid_generate_v4(),
  referrer_id     uuid not null references public.profiles(id),
  referred_id     uuid not null references public.profiles(id),
  commission_rate numeric(4,2) not null default 2.00,  -- $2/month
  status          text not null default 'active'
    check (status in ('active','canceled')),
  created_at      timestamptz not null default now()
);
create index on public.referrals(referrer_id);

-- ─────────────────────────────────────────────────────────────
-- ACCOUNT SETTINGS (PIN etc.)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.account_settings (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  kid_pin         text not null default '1234',
  autoplay        boolean not null default true,
  notifications   boolean not null default true,
  updated_at      timestamptz not null default now()
);

-- Auto-create settings row when profile is created
create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.account_settings (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- Profiles: users can only read/update their own
alter table public.profiles enable row level security;
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id);

-- Children: owner only
alter table public.children enable row level security;
create policy "children: owner only" on public.children
  for all using (auth.uid() = user_id);

-- Videos: owner can do everything; invited viewers can select
alter table public.videos enable row level security;
create policy "videos: owner full access" on public.videos
  for all using (auth.uid() = user_id);
create policy "videos: family viewers can read" on public.videos
  for select using (
    exists (
      select 1 from public.family_viewers fv
      where fv.owner_id = videos.user_id
        and fv.viewer_id = auth.uid()
        and fv.status = 'accepted'
    )
  );

-- Family viewers: owner manages, viewers can read their own invite
alter table public.family_viewers enable row level security;
create policy "family_viewers: owner manages" on public.family_viewers
  for all using (auth.uid() = owner_id);
create policy "family_viewers: viewer reads own" on public.family_viewers
  for select using (auth.uid() = viewer_id);

-- Referrals: referrer can see their own
alter table public.referrals enable row level security;
create policy "referrals: referrer reads own" on public.referrals
  for select using (auth.uid() = referrer_id);

-- Account settings: own row only
alter table public.account_settings enable row level security;
create policy "settings: own row" on public.account_settings
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.children
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.videos
  for each row execute procedure public.set_updated_at();
create trigger set_updated_at before update on public.account_settings
  for each row execute procedure public.set_updated_at();
