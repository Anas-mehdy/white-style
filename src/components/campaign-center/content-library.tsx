"use client";

import { ContentToolbar } from "./content-toolbar";
import { ContentGrid } from "./content-grid";
import { ContentLibraryItem } from "./types";

interface ContentLibraryProps {
  items: ContentLibraryItem[];
  isLoading: boolean;
  onSelectForCampaign: (item: ContentLibraryItem) => void;
  onShowDetails: (item: ContentLibraryItem) => void;
  onShowAIEditor: (item: ContentLibraryItem) => void;
  onSyncTrigger: () => void;
  isSyncing: boolean;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  onPageChange: (newOffset: number) => void;
  onSearch: (term: string) => void;
  onFilterChange: (filters: { platform: string; contentType: string; status: string }) => void;
  onSortChange: (sort: string) => void;
}

export function ContentLibrary({
  items,
  isLoading,
  onSelectForCampaign,
  onShowDetails,
  onShowAIEditor,
  onSyncTrigger,
  isSyncing,
  pagination,
  onPageChange,
  onSearch,
  onFilterChange,
  onSortChange,
}: ContentLibraryProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <ContentToolbar
        onSearch={onSearch}
        onFilterChange={onFilterChange}
        onSortChange={onSortChange}
        isLoading={isLoading}
      />
      <ContentGrid
        items={items}
        isLoading={isLoading}
        onSelectForCampaign={onSelectForCampaign}
        onShowDetails={onShowDetails}
        onShowAIEditor={onShowAIEditor}
        onSyncTrigger={onSyncTrigger}
        isSyncing={isSyncing}
        pagination={pagination}
        onPageChange={onPageChange}
      />
    </div>
  );
}
