-- 0014_product_master_enhancements.sql
-- Phase 2: Add missing fields, indexes, and audit columns to product-domain tables.

-- ── Products ──────────────────────────────────────────────────────────────────

ALTER TABLE wh.products
  ADD COLUMN IF NOT EXISTS description      TEXT,
  ADD COLUMN IF NOT EXISTS qr_value         TEXT,
  ADD COLUMN IF NOT EXISTS reorder_quantity  NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_tracking    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiry_tracking   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by        UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by        UUID REFERENCES auth.users(id);

COMMENT ON COLUMN wh.products.qr_value        IS 'QR code value, may differ from barcode';
COMMENT ON COLUMN wh.products.reorder_quantity IS 'Quantity to order when reorder point is triggered';
COMMENT ON COLUMN wh.products.batch_tracking   IS 'Enable per-batch tracking for this product';
COMMENT ON COLUMN wh.products.expiry_tracking  IS 'Enable expiry-date tracking (requires batch_tracking)';

CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_tenant_unq
  ON wh.products (tenant_id, barcode)
  WHERE barcode IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS products_tenant_name_idx
  ON wh.products (tenant_id, name);

CREATE INDEX IF NOT EXISTS products_tenant_active_idx
  ON wh.products (tenant_id, is_active);

-- ── Product Categories ────────────────────────────────────────────────────────

ALTER TABLE wh.product_categories
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_by   UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by   UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS categories_tenant_active_idx
  ON wh.product_categories (tenant_id, is_active);

-- ── Units of Measure ──────────────────────────────────────────────────────────

ALTER TABLE wh.units_of_measure
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_by   UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by   UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS uom_tenant_active_idx
  ON wh.units_of_measure (tenant_id, is_active);

-- ── Triggers (reuse existing app.update_updated_at_column) ────────────────────

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON wh.products
  FOR EACH ROW
  EXECUTE FUNCTION app.update_updated_at_column();

CREATE TRIGGER trg_product_categories_updated_at
  BEFORE UPDATE ON wh.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION app.update_updated_at_column();

CREATE TRIGGER trg_units_of_measure_updated_at
  BEFORE UPDATE ON wh.units_of_measure
  FOR EACH ROW
  EXECUTE FUNCTION app.update_updated_at_column();
