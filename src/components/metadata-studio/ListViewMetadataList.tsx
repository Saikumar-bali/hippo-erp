import { useCallback } from "react";
import { listAllListViews, listAllDocTypeActions } from "../../lib/metadata/metadata-studio-api";
import { MetadataDataTable } from "./MetadataDataTable";

export function ListViewMetadataList() {
  const fetcher = useCallback(() => listAllListViews(), []);
  return <MetadataDataTable label="List Views" fetcher={fetcher} />;
}

export function DocTypeActionList() {
  const fetcher = useCallback(() => listAllDocTypeActions(), []);
  return <MetadataDataTable label="DocType Actions" fetcher={fetcher} />;
}
