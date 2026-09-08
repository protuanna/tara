-- "Topping" surcharge, same shape as the existing shipping-fee (`fee`)
-- column: a flat amount added on top of subtotal before discount, with its
-- own preset picker in the UI (0Đ / 10.000Đ / "Khác").
alter table orders add column topping_fee integer not null default 0 check (topping_fee >= 0);
