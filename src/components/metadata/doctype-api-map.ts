import {
  listCategories, getCategory, createCategory, updateCategory, deactivateCategory, reactivateCategory,
  listUoms, getUom, createUom, updateUom, deactivateUom, reactivateUom,
  listProducts, getProduct, createProduct, updateProduct, deactivateProduct, reactivateProduct,
} from "../../lib/product-api";

export interface DocTypeApi {
  list: (tenantId: string) => Promise<unknown[]>;
  get: (id: string) => Promise<unknown>;
  create?: (payload: Record<string, unknown>) => Promise<unknown>;
  update?: (id: string, payload: Record<string, unknown>) => Promise<unknown>;
  deactivate?: (id: string) => Promise<void>;
  reactivate?: (id: string) => Promise<void>;
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

export function getDocTypeApi(doctypeKey: string): DocTypeApi | null {
  return doctypeApiRegistry.get(doctypeKey) ?? null;
}

export function registerDocTypeApi(key: string, api: DocTypeApi) {
  doctypeApiRegistry.set(key, api);
}
