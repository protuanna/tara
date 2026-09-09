-- Extra customer profile fields needed to migrate data from the old POS
-- (sobanhang.com): email, avatar (photo URL, same "just store the URL"
-- shape as products.image_url — no upload flow, just display), and
-- address. All optional — the existing "add customer" quick-add flow only
-- ever collects name/phone, so most rows will have these as null.
alter table customers add column email text;
alter table customers add column avatar_url text;
alter table customers add column address text;
