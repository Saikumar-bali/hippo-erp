import {
  listCategories, getCategory, createCategory, updateCategory, deactivateCategory, reactivateCategory,
  listUoms, getUom, createUom, updateUom, deactivateUom, reactivateUom,
  listProducts, getProduct, createProduct, updateProduct, deactivateProduct, reactivateProduct,
} from "../../lib/product-api";
import { supabase } from "../../lib/supabase";

export interface DocTypeApi {
  list: (tenantId: string) => Promise<unknown[]>;
  get: (id: string, tenantId?: string) => Promise<unknown>;
  create?: (payload: Record<string, unknown>) => Promise<unknown>;
  update?: (id: string, payload: Record<string, unknown>, tenantId?: string) => Promise<unknown>;
  deactivate?: (id: string, tenantId?: string) => Promise<void>;
  reactivate?: (id: string, tenantId?: string) => Promise<void>;
}

const doctypeApiRegistry = new Map<string, DocTypeApi>();

function register(key: string, api: DocTypeApi) {
  doctypeApiRegistry.set(key, api);
}

register("product_category", {
  list: (tenantId) => listCategories(tenantId),
  get: (id) => getCategory(id),
  create: (p) => createCategory(p as Parameters<typeof createCategory>[0]),
  update: (id, p) => updateCategory(id, p as Parameters<typeof updateCategory>[1]),
  deactivate: (id) => deactivateCategory(id),
  reactivate: (id) => reactivateCategory(id),
});

register("unit_of_measure", {
  list: (tenantId) => listUoms(tenantId),
  get: (id) => getUom(id),
  create: (p) => createUom(p as Parameters<typeof createUom>[0]),
  update: (id, p) => updateUom(id, p as Parameters<typeof updateUom>[1]),
  deactivate: (id) => deactivateUom(id),
  reactivate: (id) => reactivateUom(id),
});

register("product", {
  list: (tenantId) => listProducts(tenantId),
  get: (id) => getProduct(id),
  create: (p) => createProduct(p as unknown as Parameters<typeof createProduct>[0]),
  update: (id, p) => updateProduct(id, p as Parameters<typeof updateProduct>[1]),
  deactivate: (id) => deactivateProduct(id),
  reactivate: (id) => reactivateProduct(id),
});

export async function detectAndRegisterGenericDocTypeApi(doctypeKey: string): Promise<DocTypeApi | null> {
  const { data, error } = await supabase
    .schema("app")
    .from("erp_doctypes")
    .select("doctype_key, storage_strategy")
    .eq("doctype_key", doctypeKey)
    .single();

  if (error || !data) return null;

  if ((data as { storage_strategy: string }).storage_strategy === "generic_json") {
    const { createGenericDocTypeApi } = await import("../../lib/metadata/generic-doctype-api");
    const api = createGenericDocTypeApi(doctypeKey);
    doctypeApiRegistry.set(doctypeKey, api);
    return api;
  }

  return null;
}

export function getDocTypeApi(doctypeKey: string): DocTypeApi | null {
  return doctypeApiRegistry.get(doctypeKey) ?? null;
}

export function registerDocTypeApi(key: string, api: DocTypeApi) {
  doctypeApiRegistry.set(key, api);
}
