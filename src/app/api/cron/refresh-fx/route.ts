import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE = 'NGN';

/**
 * FX refresh as a Vercel Cron target, mirroring the Supabase Edge Function.
 *
 * Either may be used; running both is harmless because active_fx_rate() reads
 * the most recent active row. Protected by CRON_SECRET so it cannot be
 * triggered by an arbitrary caller.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization');

  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [{ data: currenciesSetting }, { data: markupSetting }] = await Promise.all([
    supabase.from('site_settings').select('value').eq('key', 'supported_display_currencies').maybeSingle(),
    supabase.from('site_settings').select('value').eq('key', 'fx_markup_percent').maybeSingle(),
  ]);

  const currencies = (currenciesSetting?.value as string[] | null) ?? ['NGN', 'USD', 'GBP'];
  const markup = Number(markupSetting?.value ?? 0);
  const quotes = currencies.filter((code) => code !== BASE);
  if (!quotes.length) return NextResponse.json({ ok: true, updated: 0 });

  const endpoint = process.env.FX_API_URL ?? `https://open.er-api.com/v6/latest/${BASE}`;

  let rates: Record<string, number> = {};
  try {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`FX provider returned ${response.status}`);
    const payload = (await response.json()) as { rates?: Record<string, number> };
    rates = payload.rates ?? {};
  } catch (error) {
    console.error('FX fetch failed', error);
    // Existing rates stay active rather than being replaced with nothing.
    return NextResponse.json({ error: 'Could not fetch reference rates.' }, { status: 502 });
  }

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
    return NextResponse.json({ error: 'No usable rates returned.' }, { status: 502 });
  }

  await supabase
    .from('exchange_rates')
    .update({ is_active: false })
    .eq('base_currency', BASE)
    .in('quote_currency', rows.map((row) => row.quote_currency));

  const { error } = await supabase.from('exchange_rates').insert(rows);
  if (error) {
    return NextResponse.json({ error: 'Could not store rates.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: rows.length });
}
