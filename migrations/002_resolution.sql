-- 002_resolution.sql
-- HYW — Sporná modifikace (S4): manuální review pro fakturu, která byla
-- aktualizovaná ve Fakturoidu po importu. Účetní zapíše poznámku a označí
-- jako resolved.
--
-- Migrace je idempotentní — lze ji bezpečně spustit opakovaně.

-- Nové sloupce pro řešení sporných modifikací
alter table invoice_imports
  add column if not exists resolution_note text,
  add column if not exists resolved_at     timestamptz,
  add column if not exists resolved_by     uuid references auth.users(id);

-- Rozšíření CHECK constraintu o nový status 'resolved'.
-- DROP IF EXISTS + ADD je idempotentní: druhý běh dropne existující
-- a vytvoří ho znovu se stejnou definicí.
alter table invoice_imports drop constraint if exists invoice_imports_status_check;
alter table invoice_imports add constraint invoice_imports_status_check
  check (status in ('pending','success','failed','skipped','needs_review','resolved'));

-- Partial CHECK: pokud je status 'resolved', resolution_note musí být
-- not null a neprázdná po trimu. Vynucuje business pravidlo na DB úrovni.
alter table invoice_imports drop constraint if exists invoice_imports_resolved_has_note;
alter table invoice_imports add constraint invoice_imports_resolved_has_note
  check (status <> 'resolved' or (resolution_note is not null and length(trim(resolution_note)) > 0));

-- Index pro výpis vyřešených (řazeno podle resolved_at desc)
create index if not exists idx_invoice_imports_resolved
  on invoice_imports(resolved_at desc)
  where status = 'resolved' and deleted_at is null;
