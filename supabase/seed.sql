-- Optional demo data, matching the design prototype's seed categories and
-- products (docs/design/tara-shop-prototype-logic.js). NOT applied
-- automatically by any migration — run manually (SQL Editor, or
-- `supabase db reset` if the CLI is linked) if you want sample data to test
-- the Sale screen with. Safe to ignore/delete once real products are added
-- through the Products screen.

insert into categories (name) values
  ('Cà phê'),
  ('Trà & Đá xay'),
  ('Bánh & Ăn nhẹ'),
  ('Đồ uống khác')
on conflict (name) do nothing;

insert into products (name, price, category_id)
select v.name, v.price, c.id
from (
  values
    ('Cà phê Đen', 20000, 'Cà phê'),
    ('Cà phê sữa', 25000, 'Cà phê'),
    ('Bạc xỉu', 27000, 'Cà phê'),
    ('Trà đào', 30000, 'Trà & Đá xay'),
    ('Trà vải', 30000, 'Trà & Đá xay'),
    ('Matcha đá xay', 35000, 'Trà & Đá xay'),
    ('Bánh mì thịt', 20000, 'Bánh & Ăn nhẹ'),
    ('Bánh croissant', 18000, 'Bánh & Ăn nhẹ'),
    ('Nước cam', 25000, 'Đồ uống khác'),
    ('Soda chanh', 22000, 'Đồ uống khác')
) as v(name, price, category_name)
join categories c on c.name = v.category_name
where not exists (select 1 from products p where p.name = v.name);
