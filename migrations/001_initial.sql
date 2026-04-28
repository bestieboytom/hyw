-- 001_initial.sql
-- HYW — Fakturoid → Pohoda sync admin dashboard
-- Spusť v Supabase SQL Editoru (DEV projekt). Pro PROD spusť stejný soubor po deploy.

-- ============================================================================
-- SYNC_RUNS — jeden běh sync služby (webhook / cron / manuální)
-- ============================================================================
create table sync_runs (
  id                  integer generated always as identity primary key,
  trigger             text not null check (trigger in ('webhook','cron','manual')),
  status              text not null check (status in ('running','success','partial','failed')),
  invoices_total      integer not null default 0,
  invoices_succeeded  integer not null default 0,
  invoices_failed     integer not null default 0,
  invoices_skipped    integer not null default 0,
  trigger_payload     jsonb,
  error_summary       text,
  started_at          timestamptz not null default now(),
  finished_at         timestamptz,
  created_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  user_id             uuid references auth.users(id)
);

create index idx_sync_runs_status on sync_runs(status) where deleted_at is null;
create index idx_sync_runs_started_at on sync_runs(started_at desc) where deleted_at is null;

alter table sync_runs enable row level security;
create policy "sync_runs_allow_all" on sync_runs for all using (true) with check (true);

-- ============================================================================
-- INVOICE_IMPORTS — jedna faktura z Fakturoidu, její stav a payloady
-- ============================================================================
create table invoice_imports (
  id                   integer generated always as identity primary key,
  sync_run_id          integer references sync_runs(id) on delete cascade,
  fakturoid_id         bigint not null,
  fakturoid_number     text not null,
  fakturoid_updated_at timestamptz,
  pohoda_id            text,
  pohoda_doc_number    text,
  status               text not null check (status in ('pending','success','failed','skipped','needs_review')),
  error_code           text,
  error_message        text,
  attempt_count        integer not null default 0,
  next_retry_at        timestamptz,
  fakturoid_snapshot   jsonb,
  pohoda_request       text,
  pohoda_response      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  user_id              uuid references auth.users(id)
);

-- Tvrdá idempotence: stejný fakturoid_id smí existovat jen jednou (mezi živými řádky)
create unique index uq_invoice_imports_fakturoid_id
  on invoice_imports(fakturoid_id)
  where deleted_at is null;

create index idx_invoice_imports_status on invoice_imports(status) where deleted_at is null;
create index idx_invoice_imports_sync_run on invoice_imports(sync_run_id);
create index idx_invoice_imports_retry
  on invoice_imports(next_retry_at)
  where status = 'failed' and deleted_at is null;

alter table invoice_imports enable row level security;
create policy "invoice_imports_allow_all" on invoice_imports for all using (true) with check (true);

-- ============================================================================
-- API_CALL_LOG — raw HTTP volání proti Fakturoidu / Pohodě
-- ============================================================================
create table api_call_log (
  id                integer generated always as identity primary key,
  sync_run_id       integer references sync_runs(id) on delete cascade,
  invoice_import_id integer references invoice_imports(id) on delete cascade,
  service           text not null check (service in ('fakturoid','pohoda')),
  method            text not null,
  url               text,
  request_body      text,
  response_status   integer,
  response_body     text,
  duration_ms       integer,
  created_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index idx_api_call_log_invoice on api_call_log(invoice_import_id);
create index idx_api_call_log_run on api_call_log(sync_run_id);
create index idx_api_call_log_created on api_call_log(created_at desc);

alter table api_call_log enable row level security;
create policy "api_call_log_allow_all" on api_call_log for all using (true) with check (true);

-- ============================================================================
-- updated_at trigger pro invoice_imports
-- ============================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_invoice_imports_updated_at
  before update on invoice_imports
  for each row execute function set_updated_at();
