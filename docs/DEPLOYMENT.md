# Deploying Miyenka

Three pieces: a Supabase project (database, auth, storage, scheduled jobs), a
Vercel deployment (the Next.js app), and credentials for Paystack and
Flutterwave.

---

## 1. Supabase

### Create the project and apply the schema

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Migrations in `supabase/migrations/` apply in filename order and cover the
schema, business-logic functions, row-level security, storage buckets and the
launch catalogue.

Verify them first against a throwaway PostgreSQL instance:

```bash
./supabase/tests/run.sh
```

### Create the first owner

Row-level security means nobody can reach the admin area until an owner
exists. After signing up through the storefront with the address that should
own the account, run this once in the SQL editor:

```sql
insert into admin_users (user_id, email, role, is_active)
select id, email, 'owner', true
from auth.users
where email = 'owner@yourdomain.com'
on conflict (email) do update
  set role = 'owner', is_active = true, user_id = excluded.user_id;
```

Every subsequent admin is invited from **Admin → Admins** by email.

### Auth configuration

In **Authentication → URL Configuration**:

- Site URL: your production domain
- Redirect URLs: `https://yourdomain.com/auth/callback`

For Google sign-in, enable the Google provider and add the same callback URL
to the Google Cloud OAuth client.

> Production redirect URLs must point at the production domain. Leaving a
> localhost URL in the allow-list is an account-takeover risk.

### Storage

The migrations create four buckets with their policies:

| Bucket | Visibility | Holds |
| --- | --- | --- |
| `product-media` | public | Product and campaign photography |
| `brand-media` | public | Hero video, brand films |
| `review-media` | public | Photos attached to published reviews |
| `custom-references` | **private** | Bespoke reference photos |

`custom-references` has no public read policy at all. Customers read only
objects beneath their own user-id prefix; admins read through the service-role
client or a signed URL.

### Scheduled FX refresh

```bash
supabase functions deploy refresh-exchange-rates
```

Then schedule it (SQL editor, with `pg_cron` and `pg_net` enabled):

```sql
select cron.schedule(
  'refresh-exchange-rates',
  '0 */6 * * *',
  $$ select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/refresh-exchange-rates',
       headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
     ) $$
);
```

If you would rather run it on Vercel, `vercel.json` already schedules
`/api/cron/refresh-fx` every six hours — set `CRON_SECRET` and skip the
Supabase schedule. Running both is harmless: conversion reads the most recent
active rate.

---

## 2. Vercel

Import the repository, then set the environment variables below.

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon key — RLS is what protects data |
| `NEXT_PUBLIC_SITE_URL` | public | Production origin, no trailing slash |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Bypasses RLS |
| `PAYSTACK_SECRET_KEY` | **server only** | |
| `PAYSTACK_PUBLIC_KEY` | server | |
| `FLUTTERWAVE_SECRET_KEY` | **server only** | |
| `FLUTTERWAVE_PUBLIC_KEY` | server | |
| `FLUTTERWAVE_WEBHOOK_HASH` | **server only** | The secret hash set in the Flutterwave dashboard |
| `RESEND_API_KEY` | **server only** | Optional; without it, emails are logged as skipped rather than failing |
| `EMAIL_FROM` | server | e.g. `Miyenka <orders@miyenka.com>` |
| `OPS_ALERT_EMAIL` | server | Receives stock-exception alerts |
| `CRON_SECRET` | **server only** | Only if using the Vercel cron route |
| `FX_API_URL` | server | Defaults to `https://open.er-api.com/v6/latest/NGN` |

**Never prefix a secret with `NEXT_PUBLIC_`.** That prefix inlines the value
into the browser bundle. The service-role key and the payment secrets must
stay server-side; `src/lib/env.ts` throws if `serverEnv()` is called from the
browser, but the naming rule is the real guard.

A payment provider with no credentials simply does not appear at checkout, so
you can launch with one and add the other later.

---

## 3. Payment providers

### Paystack

Webhook URL: `https://yourdomain.com/api/webhooks/paystack`

Paystack signs each delivery with an HMAC-SHA512 of the raw body using your
secret key. The handler verifies that signature before reading anything.

### Flutterwave

Webhook URL: `https://yourdomain.com/api/webhooks/flutterwave`

Set a **secret hash** in the Flutterwave dashboard and put the same value in
`FLUTTERWAVE_WEBHOOK_HASH`. Flutterwave sends this fixed hash rather than a
per-request signature, so the handler additionally derives each delivery's
identity from a digest of the body — otherwise every delivery would look
identical and replays could not be distinguished.

### How payment is treated

A webhook is a notification, never proof. For both providers the handler:

1. verifies the signature before reading the body,
2. re-fetches the transaction from the provider server-to-server,
3. claims the delivery against a unique `(provider, event_signature)` so a
   replay is acknowledged and dropped,
4. rejects under-payments and currency mismatches,
5. commits stock through `decrement_inventory()`, which is atomic.

If payment verifies but stock cannot be committed, the order is confirmed —
the customer has genuinely paid — and flagged as a stock exception for client
care, with an alert to `OPS_ALERT_EMAIL`. It is never silently completed.

---

## 4. Launch checklist

**Auth**
- [ ] Google sign-in completes and lands on `/account`
- [ ] Email/password sign-up sends a confirmation and completes
- [ ] Production redirect URLs contain no localhost entries

**Checkout**
- [ ] A guest can complete an order without an account
- [ ] Paystack test payment confirms the order
- [ ] Flutterwave test payment confirms the order
- [ ] Replaying a webhook delivery does not double-decrement stock
- [ ] Two concurrent buyers of the last unit: one succeeds, one becomes a
      stock exception, stock never goes negative
- [ ] Shipping resolves correctly for Lagos Island, elsewhere in Nigeria, and
      internationally

**Bespoke**
- [ ] A request records measurements and, when signed in, private references
- [ ] Admin can quote, and the customer link pays
- [ ] Payment creates a bespoke order without touching ready-to-wear stock

**Reviews**
- [ ] A review is refused before delivery
- [ ] It is accepted after delivery, and only once
- [ ] It appears publicly only after an admin publishes it

**Policy**
- [ ] Self-cancellation works inside the window and is refused outside it
- [ ] Changing the window in Admin takes effect immediately

**Customer care**
- [ ] One active number opens WhatsApp directly
- [ ] Two active numbers present a chooser

**Quality**
- [ ] Layouts hold from 320px upward
- [ ] Hero video plays, and its poster stands in under reduced-motion
- [ ] `/sitemap.xml` and `/robots.txt` return correctly
- [ ] `/admin` and `/account` redirect when signed out

---

## Operational notes

- **Nothing business-critical is hard-coded.** Shipping rates, the
  cancellation window, the free-delivery threshold, FX markup, WhatsApp
  numbers and homepage copy all live in `site_settings` or their own tables and
  are editable from Admin.
- **Historical orders are immutable.** Order lines snapshot the catalogue and
  orders store the FX rate used, so renaming or repricing a product never
  rewrites an old order.
- **Stock moves once.** It is never reduced at checkout, only after a verified
  payment, and it is returned if an order is cancelled.
