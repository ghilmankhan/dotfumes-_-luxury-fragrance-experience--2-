-- The first image migration was already applied to the linked project before
-- the position constraint was added. Keep this small follow-up for that project.
create unique index if not exists product_images_unique_position on public.product_images(product_id, position);
