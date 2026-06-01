import { useCallback } from "react";
import { listAllWorkspaces } from "../../lib/metadata/metadata-studio-api";
import { MetadataDataTable } from "./MetadataDataTable";
import { WorkspaceItemsManager } from "./WorkspaceItemsManager";

export function WorkspaceMetadataList() {
  const fetcher = useCallback(() => listAllWorkspaces(), []);
  return <MetadataDataTable label="Workspaces" tableKey="workspaces" fetcher={fetcher} />;
}

export function WorkspaceItemList() {
  return <WorkspaceItemsManager />;
}
