-- 0019_category_uom_professional_rpcs.sql
-- Update wh.* and public.* RPCs to support professional fields for categories and UOMs.

-- ── wh.create_category ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION wh.create_category(
  p_tenant_id UUID,
  p_code TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_parent_category_id UUID DEFAULT NULL,
  p_sort_order INTEGER DEFAULT 0,
  p_category_type TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT wh.current_user_has_product_permission(p_tenant_id, 'create_product') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: create_product required');
  END IF;

  INSERT INTO wh.product_categories (tenant_id, code, name, description, parent_category_id, sort_order, category_type, created_by)
  VALUES (p_tenant_id, p_code, p_name, p_description, p_parent_category_id, p_sort_order, p_category_type, auth.uid())
  RETURNING to_jsonb(wh.product_categories.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A category with this code already exists for this company.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ── wh.update_category ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION wh.update_category(
  p_id UUID,
  p_code TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_parent_category_id UUID DEFAULT NULL,
  p_sort_order INTEGER DEFAULT NULL,
  p_category_type TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM wh.product_categories WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Category not found');
  END IF;

  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'update_product') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: update_product required');
  END IF;

  UPDATE wh.product_categories
  SET code = COALESCE(p_code, code),
      name = COALESCE(p_name, name),
      description = COALESCE(p_description, description),
      parent_category_id = COALESCE(p_parent_category_id, parent_category_id),
      sort_order = COALESCE(p_sort_order, sort_order),
      category_type = COALESCE(p_category_type, category_type),
      updated_by = auth.uid()
  WHERE id = p_id
  RETURNING to_jsonb(wh.product_categories.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A category with this code already exists for this company.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ── wh.create_uom ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION wh.create_uom(
  p_tenant_id UUID,
  p_code TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_symbol TEXT DEFAULT NULL,
  p_decimal_precision INTEGER DEFAULT 0,
  p_uom_type TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT wh.current_user_has_product_permission(p_tenant_id, 'create_product') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: create_product required');
  END IF;

  INSERT INTO wh.units_of_measure (tenant_id, code, name, description, symbol, decimal_precision, uom_type, created_by)
  VALUES (p_tenant_id, p_code, p_name, p_description, p_symbol, p_decimal_precision, p_uom_type, auth.uid())
  RETURNING to_jsonb(wh.units_of_measure.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A UOM with this code already exists for this company.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ── wh.update_uom ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION wh.update_uom(
  p_id UUID,
  p_code TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_symbol TEXT DEFAULT NULL,
  p_decimal_precision INTEGER DEFAULT NULL,
  p_uom_type TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM wh.units_of_measure WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'UOM not found');
  END IF;

  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'update_product') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: update_product required');
  END IF;

  UPDATE wh.units_of_measure
  SET code = COALESCE(p_code, code),
      name = COALESCE(p_name, name),
      description = COALESCE(p_description, description),
      symbol = COALESCE(p_symbol, symbol),
      decimal_precision = COALESCE(p_decimal_precision, decimal_precision),
      uom_type = COALESCE(p_uom_type, uom_type),
      updated_by = auth.uid()
  WHERE id = p_id
  RETURNING to_jsonb(wh.units_of_measure.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A UOM with this code already exists for this company.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ── public.create_product_category ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_product_category(
  p_tenant_id UUID,
  p_code TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_parent_category_id UUID DEFAULT NULL,
  p_sort_order INTEGER DEFAULT 0,
  p_category_type TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.create_category(p_tenant_id, p_code, p_name, p_description, p_parent_category_id, p_sort_order, p_category_type);
$$;

-- ── public.update_product_category ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_product_category(
  p_id UUID,
  p_code TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_parent_category_id UUID DEFAULT NULL,
  p_sort_order INTEGER DEFAULT NULL,
  p_category_type TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.update_category(p_id, p_code, p_name, p_description, p_parent_category_id, p_sort_order, p_category_type);
$$;

-- ── public.create_unit_of_measure ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_unit_of_measure(
  p_tenant_id UUID,
  p_code TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_symbol TEXT DEFAULT NULL,
  p_decimal_precision INTEGER DEFAULT 0,
  p_uom_type TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.create_uom(p_tenant_id, p_code, p_name, p_description, p_symbol, p_decimal_precision, p_uom_type);
$$;

-- ── public.update_unit_of_measure ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_unit_of_measure(
  p_id UUID,
  p_code TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_symbol TEXT DEFAULT NULL,
  p_decimal_precision INTEGER DEFAULT NULL,
  p_uom_type TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.update_uom(p_id, p_code, p_name, p_description, p_symbol, p_decimal_precision, p_uom_type);
$$;
