-- 0017_product_category_professional.sql
-- Professional polish: additional fields for product categories.

ALTER TABLE wh.product_categories
  ADD COLUMN IF NOT EXISTS parent_category_id UUID REFERENCES wh.product_categories(id),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category_type TEXT;

CREATE INDEX IF NOT EXISTS categories_parent_idx
  ON wh.product_categories (parent_category_id);
