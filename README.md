# Miyenka

Luxury women's fashion e-commerce — mini, midi, maxi and statement gowns.

Next.js (App Router) · Supabase (Postgres, Auth, Storage, Edge Functions) ·
Paystack + Flutterwave · deployed on Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + payment credentials
npm run dev
```

## Database

Migrations are version-controlled in `supabase/migrations/` and applied in
filename order.

```bash
supabase db push          # apply to a linked project
./supabase/tests/run.sh   # migrate + test against a throwaway Postgres
```

`supabase/tests/` spins up a local PostgreSQL 16 instance, shims the
Supabase-managed `auth`/`storage` primitives, applies every migration and
asserts the rules that must hold even when the UI is bypassed:

- stock is never reduced at checkout, only after a verified payment
- two concurrent buyers cannot oversell the last unit
- a replayed payment webhook cannot double-decrement stock
- reviews require a paid, delivered order containing that product, once only
- the cancellation window is admin-configurable and takes effect immediately
- the anon key cannot reach unpublished products, other customers' orders,
  guest orders, pending reviews, private bespoke media or admin-only settings

## Brand assets

| Path | Contents |
| --- | --- |
| `public/brand/` | Official butterfly-gold logo |
| `public/media/` | Hero video and brand story films |
| `public/lookbook/` | Approved campaign and product photography |
| `docs/reference/` | Internal reference only — deliberately not served |

## Security posture

- Row-level security on every table; default deny.
- The service-role key is server-only and never imported into client code.
- Payment webhooks are signature-verified and idempotent.
- Bespoke reference photos live in a private bucket with no public read policy.
- All mutable business values live in `site_settings`, editable from Admin.
