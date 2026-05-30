import { useCallback, useEffect, useState } from "react";
import type {
  FullDocTypeConfig,
  ErpModuleMeta,
} from "./types";
import {
  getModules,
  getFullDocTypeConfig,
} from "./metadata-api";

const configCache = new Map<string, FullDocTypeConfig>();
let modulesCache: ErpModuleMeta[] | null = null;

export function clearMetadataCache() {
  configCache.clear();
  modulesCache = null;
}

export async function loadModules(): Promise<ErpModuleMeta[]> {
  if (modulesCache) return modulesCache;
  const modules = await getModules();
  modulesCache = modules;
  return modules;
}

export async function loadDocTypeConfig(doctypeKey: string): Promise<FullDocTypeConfig | null> {
  const cached = configCache.get(doctypeKey);
  if (cached) return cached;

  const config = await getFullDocTypeConfig(doctypeKey);
  if (config) {
    configCache.set(doctypeKey, config);
  }
  return config;
}

export function useDocTypeConfig(doctypeKey: string | null) {
  const [config, setConfig] = useState<FullDocTypeConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctypeKey) {
      setConfig(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadDocTypeConfig(doctypeKey)
      .then((cfg) => {
        if (!cancelled) {
          setConfig(cfg);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load DocType config");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [doctypeKey]);

  return { config, loading, error };
}

export function useModules() {
  const [modules, setModules] = useState<ErpModuleMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mods = await loadModules();
      setModules(mods);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return { modules, loading, error, refresh };
}
