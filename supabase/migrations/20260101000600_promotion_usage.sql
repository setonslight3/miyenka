-- ============================================================================
-- Miyenka — promotion redemption counter
--
-- Incremented only once a payment is verified, from the webhook processor.
-- Kept as a function so the read-modify-write happens atomically in the
-- database rather than as a racy select-then-update from the application.
-- ============================================================================

create or replace function increment_promotion_usage(p_promotion_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update promotions
     set usage_count = usage_count + 1
   where id = p_promotion_id
  returning usage_count into v_count;

  return coalesce(v_count, 0);
end;
$$;
