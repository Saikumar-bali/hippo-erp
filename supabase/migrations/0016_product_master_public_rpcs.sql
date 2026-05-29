-- 0016_product_master_public_rpcs.sql
-- Public-schema RPC wrappers for product-domain CRUD.
-- These allow supabase.rpc('function_name') calls without exposing the wh schema.
-- Read functions check view_products; write functions delegate to wh.* (which check their own permissions).

-- ── Read: Product Categories ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_product_categories(
  p_tenant_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT wh.current_user_has_product_permission(p_tenant_id, 'view_products') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: view_products required');
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.code), '[]'::jsonb)
  INTO v_result
  FROM wh.product_categories t
  WHERE t.tenant_id = p_tenant_id;
  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_product_category(
  p_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM wh.product_categories WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Category not found');
  END IF;
  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'view_products') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: view_products required');
  END IF;
  SELECT to_jsonb(t) INTO v_result FROM wh.product_categories t WHERE id = p_id;
  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

-- ── Write: Product Categories (delegate to wh.*) ────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_product_category(
  p_tenant_id UUID,
  p_code TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.create_category(p_tenant_id, p_code, p_name, p_description);
$$;

CREATE OR REPLACE FUNCTION public.update_product_category(
  p_id UUID,
  p_code TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.update_category(p_id, p_code, p_name, p_description);
$$;

CREATE OR REPLACE FUNCTION public.deactivate_product_category(
  p_id UUID
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.deactivate_category(p_id);
$$;

CREATE OR REPLACE FUNCTION public.reactivate_product_category(
  p_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM wh.product_categories WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Category not found');
  END IF;
  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'update_product') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: update_product required');
  END IF;
  UPDATE wh.product_categories SET is_active = true, updated_by = auth.uid() WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── Read: Units of Measure ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_units_of_measure(
  p_tenant_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT wh.current_user_has_product_permission(p_tenant_id, 'view_products') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: view_products required');
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.code), '[]'::jsonb)
  INTO v_result
  FROM wh.units_of_measure t
  WHERE t.tenant_id = p_tenant_id;
  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_unit_of_measure(
  p_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM wh.units_of_measure WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'UOM not found');
  END IF;
  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'view_products') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: view_products required');
  END IF;
  SELECT to_jsonb(t) INTO v_result FROM wh.units_of_measure t WHERE id = p_id;
  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

-- ── Write: Units of Measure (delegate to wh.*) ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_unit_of_measure(
  p_tenant_id UUID,
  p_code TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.create_uom(p_tenant_id, p_code, p_name, p_description);
$$;

CREATE OR REPLACE FUNCTION public.update_unit_of_measure(
  p_id UUID,
  p_code TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.update_uom(p_id, p_code, p_name, p_description);
$$;

CREATE OR REPLACE FUNCTION public.deactivate_unit_of_measure(
  p_id UUID
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.deactivate_uom(p_id);
$$;

CREATE OR REPLACE FUNCTION public.reactivate_unit_of_measure(
  p_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM wh.units_of_measure WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'UOM not found');
  END IF;
  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'update_product') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: update_product required');
  END IF;
  UPDATE wh.units_of_measure SET is_active = true, updated_by = auth.uid() WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── Read: Products ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_products(
  p_tenant_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT wh.current_user_has_product_permission(p_tenant_id, 'view_products') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: view_products required');
  END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.name), '[]'::jsonb)
  INTO v_result
  FROM wh.products t
  WHERE t.tenant_id = p_tenant_id;
  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_product(
  p_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM wh.products WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Product not found');
  END IF;
  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'view_products') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: view_products required');
  END IF;
  SELECT to_jsonb(t) INTO v_result FROM wh.products t WHERE id = p_id;
  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.search_products(
  p_tenant_id UUID,
  p_query TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
  v_like TEXT;
BEGIN
  IF NOT wh.current_user_has_product_permission(p_tenant_id, 'view_products') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: view_products required');
  END IF;
  v_like := '%' || p_query || '%';
  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.name), '[]'::jsonb)
  INTO v_result
  FROM wh.products t
  WHERE t.tenant_id = p_tenant_id
    AND (t.name ILIKE v_like OR t.sku ILIKE v_like OR t.barcode ILIKE v_like);
  RETURN jsonb_build_object('ok', true, 'data', v_result);
END;
$$;

-- ── Write: Products (delegate to wh.*) ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_product(
  p_tenant_id UUID,
  p_category_id UUID,
  p_uom_id UUID,
  p_sku TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_barcode TEXT DEFAULT NULL,
  p_qr_value TEXT DEFAULT NULL,
  p_reorder_point NUMERIC DEFAULT 0,
  p_reorder_quantity NUMERIC DEFAULT 0,
  p_batch_tracking BOOLEAN DEFAULT false,
  p_expiry_tracking BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.create_product_v2(
    p_tenant_id, p_category_id, p_uom_id, p_sku, p_name,
    p_description, p_barcode, p_qr_value, p_reorder_point,
    p_reorder_quantity, p_batch_tracking, p_expiry_tracking
  );
$$;

CREATE OR REPLACE FUNCTION public.update_product(
  p_id UUID,
  p_category_id UUID DEFAULT NULL,
  p_uom_id UUID DEFAULT NULL,
  p_sku TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_barcode TEXT DEFAULT NULL,
  p_qr_value TEXT DEFAULT NULL,
  p_reorder_point NUMERIC DEFAULT NULL,
  p_reorder_quantity NUMERIC DEFAULT NULL,
  p_batch_tracking BOOLEAN DEFAULT NULL,
  p_expiry_tracking BOOLEAN DEFAULT NULL
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.update_product_v2(
    p_id, p_category_id, p_uom_id, p_sku, p_name,
    p_description, p_barcode, p_qr_value, p_reorder_point,
    p_reorder_quantity, p_batch_tracking, p_expiry_tracking
  );
$$;

CREATE OR REPLACE FUNCTION public.deactivate_product(
  p_id UUID
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.deactivate_product_v2(p_id);
$$;

CREATE OR REPLACE FUNCTION public.reactivate_product(
  p_id UUID
) RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT wh.reactivate_product_v2(p_id);
$$;

-- Revoke from anon/public, but explicitly grant to authenticated so logged-in users can call
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
