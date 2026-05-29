-- 0018_uom_professional.sql
-- Professional polish: additional fields for units of measure.

ALTER TABLE wh.units_of_measure
  ADD COLUMN IF NOT EXISTS symbol TEXT,
  ADD COLUMN IF NOT EXISTS decimal_precision INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS uom_type TEXT;
