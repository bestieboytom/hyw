export type SyncRunStatus = 'running' | 'success' | 'partial' | 'failed';
export type SyncRunTrigger = 'webhook' | 'cron' | 'manual';

export type SyncRun = {
  id: number;
  trigger: SyncRunTrigger;
  status: SyncRunStatus;
  invoices_total: number;
  invoices_succeeded: number;
  invoices_failed: number;
  invoices_skipped: number;
  trigger_payload: unknown;
  error_summary: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
  deleted_at: string | null;
  user_id: string | null;
};

export type InvoiceImportStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'needs_review';

export type InvoiceImport = {
  id: number;
  sync_run_id: number | null;
  fakturoid_id: number;
  fakturoid_number: string;
  fakturoid_updated_at: string | null;
  pohoda_id: string | null;
  pohoda_doc_number: string | null;
  status: InvoiceImportStatus;
  error_code: string | null;
  error_message: string | null;
  attempt_count: number;
  next_retry_at: string | null;
  fakturoid_snapshot: unknown;
  pohoda_request: string | null;
  pohoda_response: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_id: string | null;
};

export type ApiCallLog = {
  id: number;
  sync_run_id: number | null;
  invoice_import_id: number | null;
  service: 'fakturoid' | 'pohoda';
  method: string;
  url: string | null;
  request_body: string | null;
  response_status: number | null;
  response_body: string | null;
  duration_ms: number | null;
  created_at: string;
  deleted_at: string | null;
};
