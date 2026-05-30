import { useCallback } from "react";
import { listAllDoctypes } from "../../lib/metadata/metadata-studio-api";
import { MetadataDataTable } from "./MetadataDataTable";

export function DocTypeList() {
  const fetcher = useCallback(() => listAllDoctypes(), []);
  return <MetadataDataTable label="DocTypes" tableKey="doctypes" fetcher={fetcher} />;
}
