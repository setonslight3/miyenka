# Miyenka

Luxury women's fashion e-commerce. Next.js (App Router) + Supabase + Paystack
and Flutterwave, deployed on Vercel.

## Checks

```bash
npm run typecheck          # tsc --noEmit
npm run lint               # eslint .
npm run build              # next build
./supabase/tests/run.sh    # migrations + 59 assertions on a throwaway Postgres
```

`.env.local` is needed for `build` (copy from `.env.example`; placeholder
values are enough to compile).

## Layout

| Path | Contents |
| --- | --- |
| `src/app/` | Routes. `admin/` is the dashboard, `api/` the route handlers |
| `src/lib/commerce/` | Pricing, orders, catalogue, bespoke, settings |
| `src/lib/payments/` | Provider adapters and the webhook processor |
| `src/lib/admin/` | Admin guard and Server Actions |
| `supabase/migrations/` | Schema, functions, RLS, storage, seed — applied in filename order |
| `supabase/tests/` | Test runner and suites |
| `docs/DEPLOYMENT.md` | Supabase, Vercel and provider setup, plus the launch checklist |

## Rules this codebase holds to

These are enforced in the database and covered by `supabase/tests/`, so please
do not work around them in application code:

- **Prices are recomputed server-side.** `priceCart()` reads every figure from
  the database. The client sends identifiers and quantities only.
- **Stock moves once, after payment.** Never at checkout. `decrement_inventory()`
  locks rows and commits all lines or none; `orders.inventory_committed` makes a
  replayed webhook a no-op.
- **Webhooks are notifications, not proof.** Verify the signature, then re-fetch
  the transaction from the provider before trusting it.
- **Reviews require a paid, delivered order** containing that product, once per
  line. Enforced by the reviews INSERT policy via `can_review_order_item()`, so
  review writes must go through the caller's session, never the service-role
  client.
- **Authorization is re-checked in every admin page and Server Action** through
  `requireAdmin()`/`requireOwner()`. The proxy is not the gate.
- **The service-role key is server-only.** Never import `createAdminClient` into
  a Client Component, and never prefix a secret with `NEXT_PUBLIC_`.
- **Bespoke reference photos are private.** The `custom-references` bucket has no
  public read policy; uploads are scoped to the uploader's user-id prefix.
- **Mutable business values live in `site_settings`** or their own tables, not in
  code — the cancellation window, shipping rates, FX markup, WhatsApp numbers
  and homepage copy are all admin-editable.

## Regenerating database types

`src/lib/supabase/database.types.ts` is generated. After changing a migration:

```bash
./scripts/gen-database-types.sh
```

## Brand

Cream and black carry structure, gold carries luxury, pink is an accent only,
burgundy supplies fashion accents. Serif display (Cormorant Garamond) with a
clean sans (Jost). Supplied assets live in `public/brand`, `public/media` and
`public/lookbook`; `docs/reference/` is internal reference and is deliberately
not served.
