-- 0015_product_master_rpcs.sql
-- Permission-aware RPC wrappers for product-domain write operations.
-- These enforce the four Product permissions (view_products, create_product, update_product, delete_product)
-- via the existing company_role_permissions and company_role_assignments tables.
-- They are safe alternatives to direct table writes for production use.

-- ── Helper: check if current user has a specific permission for a company ──────

CREATE OR REPLACE FUNCTION wh.current_user_has_product_permission(
  p_tenant_id UUID,
  p_permission_key TEXT
) RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.company_role_assignments cra
    JOIN app.company_roles cr ON cra.role_id = cr.id AND cr.tenant_id = p_tenant_id AND cr.is_active = true
    JOIN app.company_role_permissions crp ON crp.role_id = cr.id AND crp.permission_key = p_permission_key AND crp.is_granted = true
    WHERE cra.user_id = auth.uid() AND cra.is_active = true
  );
$$;

-- ── Categories ──────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION wh.create_category(
  p_tenant_id UUID,
  p_code TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL
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

  INSERT INTO wh.product_categories (tenant_id, code, name, description, created_by)
  VALUES (p_tenant_id, p_code, p_name, p_description, auth.uid())
  RETURNING to_jsonb(wh.product_categories.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A category with this code already exists for this company.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION wh.update_category(
  p_id UUID,
  p_code TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
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

CREATE OR REPLACE FUNCTION wh.deactivate_category(
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

  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'delete_product') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: delete_product required');
  END IF;

  UPDATE wh.product_categories SET is_active = false, updated_by = auth.uid() WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── Units of Measure ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION wh.create_uom(
  p_tenant_id UUID,
  p_code TEXT,
  p_name TEXT,
  p_description TEXT DEFAULT NULL
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

  INSERT INTO wh.units_of_measure (tenant_id, code, name, description, created_by)
  VALUES (p_tenant_id, p_code, p_name, p_description, auth.uid())
  RETURNING to_jsonb(wh.units_of_measure.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A UOM with this code already exists for this company.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION wh.update_uom(
  p_id UUID,
  p_code TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
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

CREATE OR REPLACE FUNCTION wh.deactivate_uom(
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

  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'delete_product') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: delete_product required');
  END IF;

  UPDATE wh.units_of_measure SET is_active = false, updated_by = auth.uid() WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── Products ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION wh.create_product_v2(
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

  IF p_expiry_tracking AND NOT p_batch_tracking THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Expiry tracking requires batch tracking to be enabled.');
  END IF;

  INSERT INTO wh.products (
    tenant_id, category_id, uom_id, sku, name, description,
    barcode, qr_value, reorder_point, reorder_quantity,
    batch_tracking, expiry_tracking, created_by
  ) VALUES (
    p_tenant_id, p_category_id, p_uom_id, p_sku, p_name, p_description,
    p_barcode, p_qr_value, p_reorder_point, p_reorder_quantity,
    p_batch_tracking, p_expiry_tracking, auth.uid()
  )
  RETURNING to_jsonb(wh.products.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A product with this SKU or barcode already exists for this company.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION wh.update_product_v2(
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
  v_current_batch BOOLEAN;
  v_current_expiry BOOLEAN;
BEGIN
  SELECT tenant_id, batch_tracking, expiry_tracking
  INTO v_tenant_id, v_current_batch, v_current_expiry
  FROM wh.products WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Product not found');
  END IF;

  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'update_product') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: update_product required');
  END IF;

  IF COALESCE(p_expiry_tracking, v_current_expiry) AND NOT COALESCE(p_batch_tracking, v_current_batch) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Expiry tracking requires batch tracking to be enabled.');
  END IF;

  UPDATE wh.products
  SET category_id = COALESCE(p_category_id, category_id),
      uom_id = COALESCE(p_uom_id, uom_id),
      sku = COALESCE(p_sku, sku),
      name = COALESCE(p_name, name),
      description = COALESCE(p_description, description),
      barcode = COALESCE(p_barcode, barcode),
      qr_value = COALESCE(p_qr_value, qr_value),
      reorder_point = COALESCE(p_reorder_point, reorder_point),
      reorder_quantity = COALESCE(p_reorder_quantity, reorder_quantity),
      batch_tracking = COALESCE(p_batch_tracking, batch_tracking),
      expiry_tracking = COALESCE(p_expiry_tracking, expiry_tracking),
      updated_by = auth.uid()
  WHERE id = p_id
  RETURNING to_jsonb(wh.products.*) INTO v_result;

  RETURN jsonb_build_object('ok', true, 'data', v_result);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A product with this SKU or barcode already exists for this company.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION wh.deactivate_product_v2(
  p_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM wh.products WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Product not found');
  END IF;

  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'delete_product') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: delete_product required');
  END IF;

  UPDATE wh.products SET is_active = false, updated_by = auth.uid() WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION wh.reactivate_product_v2(
  p_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM wh.products WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Product not found');
  END IF;

  IF NOT wh.current_user_has_product_permission(v_tenant_id, 'update_product') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permission denied: update_product required');
  END IF;

  UPDATE wh.products SET is_active = true, updated_by = auth.uid() WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Revoke direct execute from anon/public; only authenticated users can call
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA wh FROM anon, public;
