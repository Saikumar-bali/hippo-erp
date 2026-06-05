import { useEffect, useMemo, useState } from "react";
import { getCurrentUserDocTypeFieldAccess } from "../access-control-api";
import type { DocTypeFieldAccessRecord } from "../access-control";

export function useDocTypeFieldAccess(doctypeKey: string | null, companyId: string | null) {
  const [fieldAccess, setFieldAccess] = useState<DocTypeFieldAccessRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctypeKey || !companyId) {
      setFieldAccess([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getCurrentUserDocTypeFieldAccess(companyId, doctypeKey)
      .then((rows) => {
        if (!cancelled) {
          setFieldAccess(rows);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load field access");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, doctypeKey]);

  const readableFieldnames = useMemo(
    () => new Set(fieldAccess.filter((row) => row.can_read).map((row) => row.fieldname)),
    [fieldAccess],
  );

  const writableFieldnames = useMemo(
    () => new Set(fieldAccess.filter((row) => row.can_write).map((row) => row.fieldname)),
    [fieldAccess],
  );

  const permlevelByFieldname = useMemo(
    () => new Map(fieldAccess.map((row) => [row.fieldname, row.permlevel])),
    [fieldAccess],
  );

  return {
    fieldAccess,
    readableFieldnames,
    writableFieldnames,
    permlevelByFieldname,
    loading,
    error,
  };
}
