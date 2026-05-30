import { useCallback } from "react";
import { listAllDocfields } from "../../lib/metadata/metadata-studio-api";
import { MetadataDataTable } from "./MetadataDataTable";

export function DocFieldList() {
  const fetcher = useCallback(() => listAllDocfields(), []);
  return <MetadataDataTable label="DocFields" fetcher={fetcher} />;
}
