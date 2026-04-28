# PRD: HYW — Fakturoid → Pohoda Sync Dashboard

**Verze:** 0.1 (workshop MVP)
**Datum:** 2026-04-28
**Status:** schváleno k scaffoldu

> Tohle je **workshop scope** plnohodnotného produktového záměru
> *Fakturoid → Pohoda Invoice Sync*. Workshop staví **jen admin dashboard
> a logovací DB část** — skutečný worker, mServer XML komunikace,
> mapping engine a alerting jsou v backlog issues.

## Problém
iProdukce s.r.o. fakturuje ve Fakturoidu, účtuje v Pohodě (iPodnik). Hotové řešení Dativery je black box bez transparentního logu a custom mapování. Potřebujeme vlastní synchronizaci s plnou viditelností.

## Cílový uživatel
Účetní iProdukce (kontrola importu, řešení chyb) + Tom jako technický správce.

## User Stories

- Jako účetní chci **vidět seznam všech sync běhů** se statusem a počty, abych věděla, jestli noční sync proběhl.
- Jako účetní chci **otevřít detail jedné faktury** a vidět Fakturoid snapshot, vygenerované Pohoda XML i odpověď mServeru, abych pochopila proč selhal import.
- Jako účetní chci **filtrovat faktury podle statusu** (`failed`, `needs_review`, `pending`), abych se mohla soustředit jen na případy k řešení.
- Jako účetní chci **manuálně retry-ovat selhanou fakturu** jedním klikem, abych nemusela rozumět internímu workflow.
- Jako tech správce chci **vidět raw HTTP volání** (request body / response body) za každou fakturou, abych mohl debugovat mapping chyby.

## MVP Scope

### In scope (pro `/hack-scaffold`)
- Next.js 14 admin dashboard (App Router, TS, Tailwind)
- Supabase Postgres se 3 tabulkami: `sync_runs`, `invoice_imports`, `api_call_log`
- RLS permissive policy (workshop MVP, auth později)
- INT identity PK; `fakturoid_id` jako `bigint` s UNIQUE indexem (idempotence)
- Soft delete přes `deleted_at` ve všech tabulkách
- Stránky:
  - `/` — list sync_runs (status, počty, čas)
  - `/runs/[id]` — detail běhu se seznamem invoice_imports
  - `/imports` — globální list invoice_imports s filtrem podle statusu a search podle čísla faktury
  - `/imports/[id]` — detail jedné faktury (snapshot, Pohoda request/response, api_call_log)
- Webhook stub `POST /api/webhooks/fakturoid` — přijme payload, založí pending záznam, vrátí 200
- UI tlačítko Retry — flipne status na `pending` (skutečný worker tohle později vezme)
- Mobile-first responzivní (Tailwind breakpointy)
- Vercel cron stub pro retention `api_call_log` po 30 dnech (`/api/cron/cleanup`)

### Out of scope (workshop) — viz backlog issues
- Skutečná Fakturoid OAuth + polling + retry worker
- Pohoda mServer XML generation + HTTP komunikace
- Worker proces na VPS, Tailscale tunel, Docker compose
- Mapping rules engine (předkontace, středisko/činnost/zakázka, DPH, reverse charge, vývoz)
- Cizí měna (EUR/USD) handling
- Zálohové faktury, opravné daňové doklady, daňové doklady k záloze
- Email digest + Slack/Discord alerting
- Per-customer mapping overrides
- Auth (Supabase Auth) + audit log akcí v UI
- Backfill historických faktur
- Auto-create subjektů v Pohoda adresáři
- Resolve subjektu přes IČO lookup proti Pohoda adresáři

## Datový model

### Tabulka: `sync_runs`
| Sloupec | Typ | Popis |
|---|---|---|
| `id` | `integer` (PK identity) | |
| `trigger` | `text` | `webhook` / `cron` / `manual` |
| `status` | `text` | `running` / `success` / `partial` / `failed` |
| `invoices_total` | `integer` | |
| `invoices_succeeded` | `integer` | |
| `invoices_failed` | `integer` | |
| `invoices_skipped` | `integer` | |
| `trigger_payload` | `jsonb` | webhook payload nebo cron metadata |
| `error_summary` | `text` | |
| `started_at` | `timestamptz` | |
| `finished_at` | `timestamptz` | |
| `created_at` | `timestamptz` default `now()` | |
| `deleted_at` | `timestamptz` | soft delete |
| `user_id` | `uuid` → `auth.users` | pro pozdější auth |

### Tabulka: `invoice_imports`
| Sloupec | Typ | Popis |
|---|---|---|
| `id` | `integer` (PK identity) | |
| `sync_run_id` | `integer` → `sync_runs` (cascade) | |
| `fakturoid_id` | `bigint` | externí ID; UNIQUE mezi živými řádky |
| `fakturoid_number` | `text` | |
| `fakturoid_updated_at` | `timestamptz` | |
| `pohoda_id` | `text` | null dokud neimportováno |
| `pohoda_doc_number` | `text` | |
| `status` | `text` | `pending` / `success` / `failed` / `skipped` / `needs_review` |
| `error_code` | `text` | |
| `error_message` | `text` | |
| `attempt_count` | `integer` default 0 | |
| `next_retry_at` | `timestamptz` | |
| `fakturoid_snapshot` | `jsonb` | celý invoice payload |
| `pohoda_request` | `text` | XML poslané mServeru |
| `pohoda_response` | `text` | XML odpověď mServeru |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` (trigger) | |
| `deleted_at` | `timestamptz` | soft delete |
| `user_id` | `uuid` → `auth.users` | |

### Tabulka: `api_call_log`
| Sloupec | Typ | Popis |
|---|---|---|
| `id` | `integer` (PK identity) | |
| `sync_run_id` | `integer` → `sync_runs` (cascade) | |
| `invoice_import_id` | `integer` → `invoice_imports` (cascade) | |
| `service` | `text` | `fakturoid` / `pohoda` |
| `method` | `text` | HTTP metoda |
| `url` | `text` | |
| `request_body` | `text` | |
| `response_status` | `integer` | |
| `response_body` | `text` | |
| `duration_ms` | `integer` | |
| `created_at` | `timestamptz` default `now()` | |
| `deleted_at` | `timestamptz` | retention 30 dní (cron) |

## Diagram vztahů

(Mermaid ER diagram je v GitHub issue, kde se renderuje nativně.)

## SQL pro Supabase

Plný SQL je v `migrations/001_initial.sql`. Spusť v **DEV** Supabase projektu přes SQL Editor. Až budeš deployovat, stejný soubor spusť i v **PROD** projektu.

## Klíčová rozhodnutí

- **INT identity PK** všude (workshop konvence, čitelný debug). `fakturoid_id` jako `bigint` zůstává jako externí reference.
- **Idempotence** přes `UNIQUE(fakturoid_id) WHERE deleted_at IS NULL`. Druhý webhook se stejným ID padne na DB constraint, kód chytí a vrátí 200.
- **Soft delete** přes `deleted_at` — nic se neztrácí. Cascading hard delete je definovaný pro vzácný případ skutečného `DELETE`.
- **`api_call_log` retention 30 dní** — Vercel cron `/api/cron/cleanup` nastaví `deleted_at` na řádky starší 30 dní (hard cleanup volitelně později).
- **Status enum jako `text` + CHECK constraint** ne PG enum (jednodušší přidat hodnotu bez `ALTER TYPE`).

## Externí služby

Pro **workshop scope** žádné externí služby kromě Supabase + Vercel nepotřebuje. Skutečné integrace přijdou v backlog issues:

- Fakturoid API (OAuth client credentials) — backlog
- Pohoda mServer (HTTP + Basic auth, Tailscale/VPN tunel) — backlog
- Brevo / Resend (email digest) — backlog
- Discord / Slack webhook (alerting) — backlog
