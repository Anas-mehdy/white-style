export type BatchStatus = 'queued' | 'processing' | 'completed' | 'partially_completed' | 'failed';
export type ItemStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ImageAgentBatch {
  id: string;
  created_by: string;
  status: BatchStatus;
  total_items: number;
  completed_items: number;
  failed_items: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface ImageAgentItem {
  id: string;
  batch_id: string;
  source_image_path: string;
  result_image_path?: string | null;
  result_mime_type?: string | null;
  status: ItemStatus;
  attempt_count: number;
  error_message?: string | null;
  provider?: string | null;
  provider_model?: string | null;
  provider_interaction_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface SignedImageItem extends ImageAgentItem {
  source_url?: string | null;
  result_url?: string | null;
}

export interface ImageAgentUsage {
  totalLimit: number;
  usedCount: number;
  remainingCount: number;
}

export interface BatchDetailResponse {
  batch: ImageAgentBatch;
  items: SignedImageItem[];
}
