# HYW — Fakturoid → Pohoda Sync Dashboard

Admin dashboard pro sync vystavených faktur z Fakturoidu do Stormware POHODA. Zobrazuje sync běhy, stav importu jednotlivých faktur, raw HTTP logy a umožňuje manuální retry. Pro účetní iProdukce a tech správce.

## Stack
Next.js 15 (App Router) + TypeScript + Tailwind + Supabase + Vercel.

## Lokální vývoj

```bash
npm install
cp .env.example .env.local   # vyplň hodnoty z DEV Supabase projektu
npm run dev
```

Otevři <http://localhost:3000>.

## Databáze

SQL pro Supabase je v `migrations/001_initial.sql`. Spusť v DEV projektu (SQL Editor → paste → Run). Při deployi spusť stejný soubor v PROD projektu.

## PRD

Plný PRD v `PRD.md` a jako issue na GitHubu (label `prd`).
