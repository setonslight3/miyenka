-- Fixture for the concurrent last-item purchase test in race.sh:
-- one unit of stock, two orders that each want it.
delete from order_items where order_id in (select id from orders where order_number like 'RACE-%');
delete from orders where order_number like 'RACE-%';

do $$
declare v_size uuid; v_a uuid; v_b uuid;
begin
  select ps.id into v_size
    from product_sizes ps
    join product_variants pv on pv.id = ps.variant_id
    join products p on p.id = pv.product_id
   where p.slug = 'butterfly-corset-mini' and ps.size = 'L';

  update product_sizes set quantity = 1 where id = v_size;

  insert into orders (order_number, guest_email, status, total_minor)
  values ('RACE-A', 'a@example.com', 'pending_payment', 41500000) returning id into v_a;
  insert into orders (order_number, guest_email, status, total_minor)
  values ('RACE-B', 'b@example.com', 'pending_payment', 41500000) returning id into v_b;

  insert into order_items (order_id, product_size_id, product_name, unit_price_minor, quantity, line_total_minor)
  values (v_a, v_size, 'Butterfly Corset Mini', 41500000, 1, 41500000),
         (v_b, v_size, 'Butterfly Corset Mini', 41500000, 1, 41500000);
end $$;
