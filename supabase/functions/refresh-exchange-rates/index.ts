/**
 * Scheduled FX refresh.
 *
 * Fetches reference rates for the currencies the storefront offers and writes
 * them to exchange_rates with a timestamp and source. Storefront conversion
 * reads the most recent active row via active_fx_rate(), and every order
 * freezes the rate it used at the moment it is paid — so a rate change never
 * rewrites a historical order.
 *
 * Deploy:
 *   supabase functions deploy refresh-exchange-rates
 *
 * Schedule (every 6 hours), from the SQL editor with pg_cron + pg_net:
 *   select cron.schedule(
 *     'refresh-exchange-rates',
 *     '0 *\/6 * * *',
 *     $$ select net.http_post(
 *          url := 'https://<project>.supabase.co/functions/v1/refresh-exchange-rates',
 *          headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
 *        ) $$
 *   );
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const BASE = 'NGN';

Deno.serve(async (request) => {
  // The function is invoked by the scheduler with the service-role key.
  const authorization = request.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!serviceRoleKey || authorization !== `Bearer ${serviceRoleKey}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
    { auth: { persistSession: false } },
  );

  // Which currencies to fetch, and any markup, are admin settings.
  const [{ data: currenciesSetting }, { data: markupSetting }] = await Promise.all([
    supabase.from('site_settings').select('value').eq('key', 'supported_display_currencies').maybeSingle(),
    supabase.from('site_settings').select('value').eq('key', 'fx_markup_percent').maybeSingle(),
  ]);

  const currencies = (currenciesSetting?.value as string[] | null) ?? ['NGN', 'USD', 'GBP'];
  const markup = Number(markupSetting?.value ?? 0);
  const quotes = currencies.filter((code) => code !== BASE);

  if (!quotes.length) {
    return Response.json({ ok: true, updated: 0, note: 'No quote currencies configured.' });
  }

  const endpoint = Deno.env.get('FX_API_URL') ?? `https://open.er-api.com/v6/latest/${BASE}`;

  let payload: { rates?: Record<string, number>; result?: string };
  try {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`FX provider returned ${response.status}`);
    payload = await response.json();
  } catch (error) {
    console.error('FX fetch failed', error);
    // Leave the existing rates in place rather than writing nothing usable.
    return Response.json(
      { error: 'Could not fetch reference rates.', detail: String(error) },
      { status: 502 },
    );
  }

  const rates = payload.rates ?? {};
  const rows = quotes
    .map((quote) => ({ quote, rate: Number(rates[quote]) }))
    .filter((row) => Number.isFinite(row.rate) && row.rate > 0)
    .map((row) => ({
      base_currency: BASE,
      quote_currency: row.quote,
      rate: row.rate,
      markup_percent: markup,
      source: new URL(endpoint).hostname,
      fetched_at: new Date().toISOString(),
      is_active: true,
    }));

  if (!rows.length) {
    return Response.json({ error: 'No usable rates in the provider response.' }, { status: 502 });
  }

  // Retire the previous rows, then insert the fresh ones. active_fx_rate()
  // takes the most recent active row, so a brief overlap is harmless.
  await supabase
    .from('exchange_rates')
    .update({ is_active: false })
    .eq('base_currency', BASE)
    .in('quote_currency', rows.map((row) => row.quote_currency));

  const { error } = await supabase.from('exchange_rates').insert(rows);

  if (error) {
    console.error('Could not store rates', error);
    return Response.json({ error: 'Could not store rates.' }, { status: 500 });
  }

  return Response.json({
    ok: true,
    updated: rows.length,
    rates: Object.fromEntries(rows.map((row) => [row.quote_currency, row.rate])),
  });
});
