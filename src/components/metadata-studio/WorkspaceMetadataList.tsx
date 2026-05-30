import { useCallback } from "react";
import { listAllWorkspaces, listAllWorkspaceItems } from "../../lib/metadata/metadata-studio-api";
import { MetadataDataTable } from "./MetadataDataTable";

export function WorkspaceMetadataList() {
  const fetcher = useCallback(() => listAllWorkspaces(), []);
  return <MetadataDataTable label="Workspaces" tableKey="workspaces" fetcher={fetcher} />;
}

export function WorkspaceItemList() {
  const fetcher = useCallback(() => listAllWorkspaceItems(), []);
  return <MetadataDataTable label="Workspace Items" tableKey="workspace_items" fetcher={fetcher} />;
}
