import { useCallback } from "react";
import { listAllFormLayouts, listAllNamingSeries, listAllWorkflows } from "../../lib/metadata/metadata-studio-api";
import { MetadataDataTable } from "./MetadataDataTable";

export function FormLayoutMetadataList() {
  const fetcher = useCallback(() => listAllFormLayouts(), []);
  return <MetadataDataTable label="Form Layouts" fetcher={fetcher} />;
}

export function NamingSeriesList() {
  const fetcher = useCallback(() => listAllNamingSeries(), []);
  return <MetadataDataTable label="Naming Series" fetcher={fetcher} />;
}

export function WorkflowList() {
  const fetcher = useCallback(() => listAllWorkflows(), []);
  return <MetadataDataTable label="Workflows" fetcher={fetcher} />;
}
