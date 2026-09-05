"""
Generates src/lib/supabase/database.types.ts by introspecting a PostgreSQL
database that has the Miyenka migrations applied.

Invoked by scripts/gen-database-types.sh, which stands up a throwaway instance
first. Against a linked Supabase project you can instead use the official
`supabase gen types typescript --linked`; this exists so the types can be
regenerated offline and stay in lockstep with the migrations.
"""

import os
import subprocess

def q(sql):
    out = subprocess.run(
        ['psql', '-h', os.environ.get('PGHOST', '/tmp'),
         '-p', os.environ.get('PGPORT', '5433'),
         '-U', os.environ.get('PGUSER', 'postgres'),
         '-d', os.environ.get('PGDATABASE', 'miyenka'),
         '-tAF', '\x1f', '-c', sql],
        capture_output=True, text=True, check=True).stdout
    return [l.split('\x1f') for l in out.strip().split('\n') if l]

TS = {
 'uuid':'string','text':'string','citext':'string','bpchar':'string','character':'string',
 'character varying':'string','varchar':'string','date':'string',
 'timestamp with time zone':'string','timestamp without time zone':'string',
 'boolean':'boolean','integer':'number','bigint':'number','smallint':'number',
 'numeric':'number','double precision':'number','real':'number',
 'jsonb':'Json','json':'Json','ARRAY':'string[]',
}

enums = {}
for name, label in q("""
select t.typname, e.enumlabel
from pg_type t join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname='public' order by t.typname, e.enumsortorder"""):
    enums.setdefault(name, []).append(label)

cols = q("""
select c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable,
       (c.column_default is not null or c.is_identity='YES')::text
from information_schema.columns c
join information_schema.tables t
  on t.table_name=c.table_name and t.table_schema=c.table_schema
where c.table_schema='public' and t.table_type='BASE TABLE'
order by c.table_name, c.ordinal_position""")

tables = {}
for tname, cname, dtype, udt, nullable, has_default in cols:
    if dtype == 'USER-DEFINED' and udt in enums:
        ts = f'Database["public"]["Enums"]["{udt}"]'
    elif dtype == 'ARRAY':
        ts = 'string[]'
    else:
        ts = TS.get(dtype, 'string')
    tables.setdefault(tname, []).append({
        'name': cname, 'ts': ts,
        'nullable': nullable == 'YES',
        'optional': has_default == 'true' or nullable == 'YES',
    })

fks = q("""
select
  con.conname,
  src.relname as table_name,
  (select string_agg(a.attname, ',' order by k.ord)
     from unnest(con.conkey) with ordinality k(attnum, ord)
     join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum) as cols,
  tgt.relname as ref_table,
  (select string_agg(a.attname, ',' order by k.ord)
     from unnest(con.confkey) with ordinality k(attnum, ord)
     join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k.attnum) as ref_cols,
  (exists (
     select 1 from pg_index i
     where i.indrelid = con.conrelid and i.indisunique
       and i.indnatts = array_length(con.conkey, 1)
       and i.indkey::int2[] @> con.conkey and con.conkey @> i.indkey::int2[]
  ))::text as one_to_one
from pg_constraint con
join pg_class src on src.oid = con.conrelid
join pg_class tgt on tgt.oid = con.confrelid
join pg_namespace n on n.oid = src.relnamespace
where con.contype = 'f' and n.nspname = 'public'
order by src.relname, con.conname""")

rels = {}
for conname, tname, cols_, ref_table, ref_cols, one_to_one in fks:
    rels.setdefault(tname, []).append({
        'name': conname,
        'cols': cols_.split(','),
        'ref_table': ref_table,
        'ref_cols': ref_cols.split(','),
        'one_to_one': one_to_one == 'true',
    })

funcs = q("""
select p.proname
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f'
  and not exists (select 1 from pg_depend d join pg_extension x on x.oid=d.refobjid where d.objid=p.oid and d.deptype='e')
order by p.proname""")

L = []
L.append('// Generated from supabase/migrations by scripts/gen-database-types.sh.')
L.append('// Do not edit by hand: change a migration and regenerate.')
L.append('')
L.append('export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];')
L.append('')
L.append('export type Database = {')
L.append('  public: {')
L.append('    Tables: {')
for t in sorted(tables):
    L.append(f'      {t}: {{')
    for kind in ('Row','Insert','Update'):
        L.append(f'        {kind}: {{')
        for c in tables[t]:
            ts = c['ts'] + (' | null' if c['nullable'] else '')
            if kind == 'Row':
                L.append(f'          {c["name"]}: {ts};')
            elif kind == 'Insert':
                opt = '?' if c['optional'] else ''
                L.append(f'          {c["name"]}{opt}: {ts};')
            else:
                L.append(f'          {c["name"]}?: {ts};')
        L.append('        };')
    trs = rels.get(t, [])
    if not trs:
        L.append('        Relationships: [];')
    else:
        L.append('        Relationships: [')
        for r in trs:
            cols_ts = ', '.join(f'"{c}"' for c in r['cols'])
            refc_ts = ', '.join(f'"{c}"' for c in r['ref_cols'])
            L.append('          {')
            L.append(f'            foreignKeyName: "{r["name"]}";')
            L.append(f'            columns: [{cols_ts}];')
            L.append(f'            isOneToOne: {"true" if r["one_to_one"] else "false"};')
            L.append(f'            referencedRelation: "{r["ref_table"]}";')
            L.append(f'            referencedColumns: [{refc_ts}];')
            L.append('          },')
        L.append('        ];')
    L.append('      };')
L.append('    };')
L.append('    Views: { [_ in never]: never };')
# Precise signatures for the RPCs the application calls. Anything not listed
# falls back to a permissive signature.
PRECISE = {
    'is_active_admin': '{ Args: { check_user_id?: string }; Returns: boolean }',
    'is_owner': '{ Args: { check_user_id?: string }; Returns: boolean }',
    'decrement_inventory': '{ Args: { p_order_id: string }; Returns: { committed: boolean; reason: string; shortfalls?: Json } }',
    'restore_inventory': '{ Args: { p_order_id: string }; Returns: { restored: boolean; reason?: string } }',
    'can_review_order_item': '{ Args: { p_order_item_id: string; p_user_id?: string }; Returns: boolean }',
    'can_cancel_order': '{ Args: { p_order_id: string }; Returns: boolean }',
    'resolve_shipping_zone': '{ Args: { p_country: string; p_state?: string }; Returns: string | null }',
    'active_fx_rate': '{ Args: { p_quote_currency: string; p_base?: string }; Returns: number | null }',
    'available_quantity': '{ Args: { p_product_size_id: string }; Returns: number }',
    'next_order_number': '{ Args: Record<string, never>; Returns: string }',
    'next_quote_number': '{ Args: Record<string, never>; Returns: string }',
    'get_setting': '{ Args: { setting_key: string; fallback?: Json }; Returns: Json }',
    'product_rating': '{ Args: { p_product_id: string }; Returns: { average: number | null; total: number }[] }',
    'increment_promotion_usage': '{ Args: { p_promotion_id: string }; Returns: number }',
    'reviewable_items': '{ Args: { p_user_id?: string }; Returns: { order_item_id: string; order_id: string; order_number: string; product_id: string; product_name: string; product_slug: string | null; image_url: string | null; delivered_at: string | null }[] }',
}

L.append('    Functions: {')
for (fn,) in funcs:
    L.append(f'      {fn}: {PRECISE.get(fn, "{ Args: Record<string, unknown>; Returns: Json }")};')
L.append('    };')
L.append('    Enums: {')
for e in sorted(enums):
    L.append(f'      {e}: {" | ".join(chr(39)+v+chr(39) for v in enums[e])};')
L.append('    };')
L.append('    CompositeTypes: { [_ in never]: never };')
L.append('  };')
L.append('};')
L.append('')
L.append('export type Tables<T extends keyof Database["public"]["Tables"]> =')
L.append('  Database["public"]["Tables"][T]["Row"];')
L.append('export type TablesInsert<T extends keyof Database["public"]["Tables"]> =')
L.append('  Database["public"]["Tables"][T]["Insert"];')
L.append('export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =')
L.append('  Database["public"]["Tables"][T]["Update"];')
L.append('export type Enums<T extends keyof Database["public"]["Enums"]> =')
L.append('  Database["public"]["Enums"][T];')
L.append('')

open(os.environ.get('OUT', 'src/lib/supabase/database.types.ts'), 'w').write('\n'.join(L))
print(f'{len(tables)} tables, {len(enums)} enums, {len(funcs)} functions')
