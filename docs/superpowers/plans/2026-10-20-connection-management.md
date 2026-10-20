# 人脉全息档案系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a private, single-owner relationship archive with searchable people, detailed holographic profile cards, reciprocal connections, explainable relationship prompts, import/export, and a GitHub Pages-compatible frontend.

**Architecture:** React/Vite SPA using HashRouter for GitHub Pages, typed domain rules, a repository interface with Supabase and local development adapters, Supabase migrations/RLS/storage, and a constrained archive-card visual system.

**Tech Stack:** React 19, TypeScript, Vite, TanStack Query/Table, React Hook Form, Zod, Tailwind CSS, Supabase, lunar-typescript, Vitest, Testing Library, Playwright.

**Spec:** The approved plan supplied in the implementation request.

## Global Constraints

- Single owner; no public registration, OAuth, sharing, or collaboration.
- Login placeholders are exactly `187手机` and `leeds`; neither is a real credential.
- Relationship tiers are `soul`, `close`, `friend`, and `acquaintance`.
- Influence is `weak | medium | strong`; intimacy is `distant | medium | close`.
- Contacts have a tier; reference-only people do not and never appear in the archive.
- Mutual connections are undirected and unique.
- Custom fields are global: short text, long text, number, date, single select, multi select.
- Relationship cadence is always user-set; there are no default cadence values.
- Important dates support Gregorian and lunar calendars with annual recurrence.
- Deleted people remain recoverable for 30 days.
- UI copy is Simplified Chinese; dates use Asia/Shanghai.
- Production data uses Supabase; local fallback exists only for development and demonstration.
- GitHub Pages deployment uses HashRouter and relative Vite asset URLs.

## Review Focus

- A reference person must never leak into archive rows after being linked.
- Adding a mutual contact twice must not create duplicate reciprocal cards.
- A missing lunar leap month must produce an explicit regular-month fallback.
- Search must find hidden profile details without exposing another user.
- Login placeholders must never be treated as credentials.

## Task 1: Domain Rules

**Files:** `src/domain/types.ts`, `src/domain/schema.ts`, `src/domain/coach.ts`, `src/domain/dates.ts`, `src/domain/search.ts`, `src/domain/import.ts`; tests beside each unit.

- [ ] Write failing tests for tier filtering, display-column defaults, coach statuses, lunar fallback, global search, CSV mapping and duplicate detection.
- [ ] Run the focused test command and verify the missing behavior fails.
- [ ] Implement the smallest pure functions and Zod schemas that satisfy the tests.
- [ ] Run the focused and full unit suites.
- [ ] Commit the domain layer.

## Task 2: Persistence

**Files:** `src/data/repository.ts`, `src/data/local-repository.ts`, `src/data/supabase-repository.ts`, `src/data/sample-data.ts`; tests in `src/data`.

- [ ] Write failing tests for contact CRUD, soft delete/restore, reciprocal connection uniqueness, reference promotion, custom fields and import.
- [ ] Verify tests fail because the repository contract is not implemented.
- [ ] Implement a local repository with seeded demo data and the matching Supabase adapter.
- [ ] Run focused and full suites.
- [ ] Commit the persistence layer.

## Task 3: Application Shell and Archive

**Files:** `src/App.tsx`, `src/main.tsx`, route and archive components under `src/features`.

- [ ] Write failing component tests for exact login placeholders, four archive tabs, acquaintance-only name default, search and navigation into a person.
- [ ] Verify red.
- [ ] Implement authentication gate, query provider, layout, archive table and responsive mobile list.
- [ ] Run tests and production build.
- [ ] Commit the archive experience.

## Task 4: Profile and Relationship Editing

**Files:** profile components and forms under `src/features/person`.

- [ ] Write failing tests for loading a complete profile, editing basic fields, adding a detail entry, adding a mutual contact and promoting a reference.
- [ ] Implement the profile dossier, editors, attachments, goals, family, career, dates and custom values.
- [ ] Run tests and build.
- [ ] Commit profile behavior.

## Task 5: Coach, Settings and Portability

**Files:** coach and settings components under `src/features`.

- [ ] Write failing tests for coach prompts, custom-field management, recycle-bin restore, CSV preview and JSON export.
- [ ] Implement the relevant screens and repository hooks.
- [ ] Run tests and build.
- [ ] Commit these features.

## Task 6: Deployment and Quality Gates

**Files:** Supabase migrations, `.github/workflows/pages.yml`, `README.md`, Playwright config.

- [ ] Add Supabase schema, RLS, storage policies, search and cleanup functions.
- [ ] Add GitHub Pages workflow with repository-relative base path.
- [ ] Add a Playwright smoke scenario for login and archive.
- [ ] Run the full test suite, build, and visual checks at desktop and mobile widths.
- [ ] Commit deployment artifacts and documentation.

