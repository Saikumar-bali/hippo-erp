import { useCallback } from "react";
import { listAllDoctypes } from "../../lib/metadata/metadata-studio-api";
import { MetadataDataTable } from "./MetadataDataTable";

export function DocTypeDetail() {
  const fetcher = useCallback(() => listAllDoctypes(), []);
  return <MetadataDataTable label="DocType Details" tableKey="doctypes" fetcher={fetcher} />;
}
