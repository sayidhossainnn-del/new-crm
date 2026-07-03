# Flinza Works CRM

A prospect-pipeline CRM built for Flinza Works (Meta ad creative agency). Next.js 14 (App Router) +
Supabase (Postgres + Auth), deployed on Vercel.

## What's connected

- **Database**: Supabase project `flinza-crm` (`eorjmkkfecahzzfnnhtg`), table `public.prospects`.
  This is the same live table your earlier CRM build already used — this app reads/writes the
  same 11 real prospects (Sundelle, Notbranded, Viole Grace, etc.), it doesn't duplicate them.
- **Auth**: Supabase Auth (email + password). Every route except `/login` requires a signed-in
  session — enforced in `middleware.js`.
- **RLS**: Row Level Security is ON for `prospects`. Only `authenticated` Supabase users can
  read/write — the table used to be open to anyone with the anon key; that's now locked down.

## Run it locally

```powershell
npm install
npm run dev
```

Then open http://localhost:3000 — you'll land on `/login`. Click "Sign up" to create your
account (use your real email — Supabase sends a confirmation email by default), then sign in.

`.env.local` already has your real Supabase URL + anon key in it, so this works out of the box.

## Security note — please read

Two other tables in this same Supabase project (`public.leads`, `public.activity`) currently have
**RLS disabled**, meaning anyone with the anon key can read/write them. This app doesn't use those
tables, so I left them alone rather than silently changing them. If you want them locked down too,
run this in the Supabase SQL editor (or ask me and I'll do it):

```sql
alter table public.leads enable row level security;
alter table public.activity enable row level security;
-- then add policies, e.g. for authenticated-only access:
create policy "authenticated read" on public.leads for select to authenticated using (true);
create policy "authenticated write" on public.leads for all to authenticated using (true) with check (true);
create policy "authenticated read" on public.activity for select to authenticated using (true);
create policy "authenticated write" on public.activity for all to authenticated using (true) with check (true);
```

## Deploy to Vercel

Easiest path — connect GitHub (see below) then import the repo at vercel.com/new. Add these two
Environment Variables in the Vercel project settings (Production + Preview + Development):

```
NEXT_PUBLIC_SUPABASE_URL=https://eorjmkkfecahzzfnnhtg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<see .env.local>
```

## Push this to GitHub (PowerShell)

Run from inside this folder:

```powershell
git init
git add .
git commit -m "Flinza Works CRM - Supabase auth + live prospects backend"
git branch -M main
git remote add origin https://github.com/sayidhossainnn-del/flinza-crm.git
git push -u origin main
```

If that repo doesn't exist yet, create it first at https://github.com/new (name it
`flinza-crm`, keep it **private** since `.env.local` pattern is gitignored but the repo will still
contain your Supabase URL in this README) — or reuse your existing `sayidhossainnn-del/crm` repo
by pointing `origin` at that URL instead.

`.env.local` is in `.gitignore` and will NOT be pushed to GitHub. When you connect the repo to
Vercel, add the two environment variables there manually (see above).
