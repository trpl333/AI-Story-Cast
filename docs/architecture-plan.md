# AIStoryCast — Product & Engineering Blueprint

Concise roadmap for evolving AIStoryCast from the current marketing site + `/demo` into a real SaaS: interactive public-domain reading with narration, synced text, and passage discussion. **This document is planning only** — implementation follows phase gates below.

---

## 1. Product phases

| Phase | Name | Goal |
|-------|------|------|
| **0** | Frontend cleanup / demo polish | Stable marketing site, honest copy, `/demo` reader slice, local assets, no fake social proof. **Exit:** ship-quality landing + demo. |
| **1** | Product / app blueprint | App shell, routing, empty or stubbed screens aligned with final IA (library, reader, settings). **Exit:** navigable product skeleton behind a single “app” entry. |
| **2** | Auth + subscription skeleton | Login/signup, session handling, Stripe (or similar) products/prices, webhook-driven entitlement flags. **Exit:** real users, fake or empty premium features OK. |
| **3** | Backend demo engine | API for curated titles, chapter metadata, static or pre-generated audio URLs, reader config JSON. **Exit:** `/demo`-class experience driven by API + DB, not only hardcoded frontmatter. |
| **4** | Gutenberg ingestion pipeline | Ingest PG (and similar) sources: normalize text, chapters, stable IDs, legal metadata, versioning. **Exit:** repeatable pipeline + admin or script-triggered refresh. |
| **5** | Audio generation / voice casting | TTS or vendor pipelines, narrator + character lanes, caching, cost controls, per-title voice presets. **Exit:** user can play a full chapter with designed voices. |
| **6** | Discussion / dissection layer | Passage-scoped chat, LLM with citations/context window tied to offsets, moderation, rate limits, audit logging. **Exit:** paid-safe discussion MVP. |
| **7** | Production hardening | Observability, backups, GDPR flows, abuse prevention, performance budgets, incident runbooks, SLAs. **Exit:** launch-ready operations. |

**Auth (Phase 2 prep):** The app ships with a **browser-local mock** session at the root (`MockAuthProvider`) and a stable `useAuth()` contract. The preferred path to **Supabase Auth** — provider swap, session hydration, protected routes, login/signup/logout, and `getAccessToken()` for future APIs — is documented in [`docs/auth-supabase-migration.md`](auth-supabase-migration.md). `@supabase/supabase-js` is already in `package.json` but not wired under `src/` yet.

**Ordering note:** Phases 4–6 overlap in practice (e.g. audio before full ingestion for one pilot title). Keep **Curated Library** (see [§8 — Content source modes](#8-content-source-modes--book-acquisition)) as the only content path until Phase 3–4 are stable.

---

## 2. Route map / page map

Single SPA is fine; split **layouts** (marketing chrome vs app chrome) and **guards** (public vs `requiresAuth` vs `requiresPaid`).

| Route | Page / layout | Role |
|-------|----------------|------|
| `/` | Marketing home | Public. Value prop, waitlist/CTA, links to `/demo`, `/pricing`, `/login`. |
| `/demo` | Demo reader | **Public.** Fixed curated sample (e.g. Alice Ch. I); may remain unauthenticated indefinitely as proof of experience. |
| `/pricing` | Pricing & plans | Public. Compare tiers; primary CTA → `/signup` (or Stripe Checkout when wired). |
| `/login` | Login | Public (unauthenticated). Redirect to `/app` if already logged in. |
| `/signup` | Signup | Public (unauthenticated). Same redirect rule as login. |
| `/app` | App dashboard | **Protected** (`requiresAuth`). Continue reading, stubs for recommendations; entry after login. |
| `/app/library` | Library (curated catalog) | **Protected** (`requiresAuth`). Browse/search MVP curated list; no upload here in early MVP. |
| `/app/read/:bookId/:chapterId` | Book reader | **Protected** (`requiresAuth`). Audio + text + discuss shell; **feature flags** inside for paid-only capabilities (see §4). |
| `/app/account` or `/app/settings` | Account & settings | **Protected** (`requiresAuth`). Profile, password, subscription status, billing portal link, delete account. |
| `/admin/*` *(optional)* | Internal ops | **`requiresAdmin`** (role flag or separate auth). Ingestion triggers, book visibility, support lookups — **not** in early MVP UI; document route for when you need it. |
| `*` | Not found | Public. |

**Conventions:** Prefer `/app/...` prefix for all authenticated product surfaces so marketing stays root-level and caches/CDN rules stay simple.

---

## 3. User states / access model

Four **roles** (last is optional for MVP engineering, useful for operations).

### 3.1 Anonymous visitor

| Can | Cannot |
|-----|--------|
| All **public** marketing routes (`/`, `/pricing`, `/login`, `/signup`) | Save progress, bookmarks, or per-user reader state |
| **`/demo`** full interactive slice we ship publicly | Access `/app/*` (redirect to login if they hit a deep link) |
| Submit waitlist / marketing forms (if offered) | Call authenticated APIs |

**Intent:** Always ship a **zero-friction** path: landing + demo proves the product without an account.

### 3.2 Logged-in free user

| Can | Cannot |
|-----|--------|
| Everything anonymous can do | Claim paid-only entitlements (higher LLM quota, priority audio, etc.) |
| **`/app`**, **`/app/library`**, **`/app/read/...`** for curated titles we expose to free tier | Upload books or “Create a book” (not in MVP — [§8](#8-content-source-modes--book-acquisition)) |
| **Save progress / bookmarks** (once implemented) | Bypass rate limits that protect cost drivers |

**Intent:** Account = **persistence + trust** (email, ToS acceptance), not a paywall on “seeing” the curated reader.

### 3.3 Paid subscriber

| Can | Notes |
|-----|--------|
| Everything free tier can do | Stripe `active` (or equivalent) drives `plan_tier` |
| **Higher limits** on cost drivers: passage discussion, optional longer audio sessions, future priority queue | Exact numbers = product decision; enforce server-side |
| **Stripe Customer Portal** for plan management | Linked from `/app/account` |

**Intent:** Subscription pays for **scale, cost, and premium behavior** — not for basic “open a PD book” if we want a generous free tier for growth.

### 3.4 Admin / internal *(optional but planned)*

| Can | Cannot |
|-----|--------|
| Curated catalog CRUD, feature flags, ingestion triggers, read-only user lookup for support | Use admin routes as a bypass for **billing** — entitlements still come from Stripe/subscription state |

**Intent:** Separate **`admin`** role from **`subscriber`**; keep audit logs for admin actions.

### Recommended model (summary)

1. **Public by default:** marketing + `/demo` + pricing + auth pages.  
2. **Login required** for any `/app/*` surface.  
3. **Paid gating** only where unit economics demand it (discussion, heavy generation, future upload/create).  
4. **Admin** off critical path until you operate catalog at scale.

---

## 4. Public vs protected boundaries (early MVP)

This section is the **source of truth** for what ships open vs gated in the first SaaS-shaped releases.

### 4.1 Public (no login)

- `/`, `/pricing`, `/login`, `/signup`, `/demo`, marketing legal pages when they exist, 404.
- **Capabilities:** read marketing copy; use **demo reader** as implemented (placeholder or real sample audio); view pricing; start auth flows.

### 4.2 Requires login (free tier allowed)

- **All** `/app/*` routes in §2 once the app shell exists.
- **Capabilities:** library list for curated books we expose; reader for allowed `bookId`/`chapterId`; account/settings; persisted progress when built.

### 4.3 Requires paid subscription

**Early MVP — start with zero paid-only routes** (everything in `/app` is free once logged in) *or* gate **one** high-cost feature only, for example:

- **Passage discussion / LLM** → paid-only from day one of Phase 6, **or**
- **Full chapter audio** → paid-only if TTS cost is high, **or**
- Both free with **strict server quotas** for free tier.

Pick **one** story for v1 billing so Stripe + product copy stay honest. Expand paid surface as costs prove out.

### 4.4 Requires admin

- `/admin/*` only; never required for normal readers.

### Boundary rules (engineering)

- **Browser never decides entitlement alone:** API returns 401/403 + feature flags; UI mirrors for UX only.
- **`/demo` may duplicate** parts of `/app/read/...` UX — that’s OK; avoid requiring login on `/demo` unless legally necessary.

---

## 5. Core services

| Component | Responsibility |
|-----------|------------------|
| **Frontend web app** | React (current) SPA or later SSR for SEO; talks only to your API + Stripe.js. |
| **Backend API** | REST or GraphQL: catalog, chapters, reader state, discussion requests, webhooks, admin. |
| **Auth** | Sessions/JWT, OAuth providers, email verification, password resets. |
| **Billing** | Stripe Customer, Subscription, Customer Portal; webhooks update `plan_tier` in DB. |
| **Database** | Users, subscriptions, books, chapters, audio assets metadata, discussion threads, usage counters. |
| **Book ingestion** | PG pipeline, checksums, text normalization, chapter boundaries (Phase 4). |
| **Audio generation** | Job queue: TTS / external APIs, store artifacts, attach to `chapter_id` + voice profile (Phase 5). |
| **Discussion engine** | Retrieve passage context by offsets; call LLM; log prompts/responses; enforce limits (Phase 6). |
| **Storage** | Object store (S3-compatible) for audio, optional EPUB/PDF uploads later, generated assets. |
| **Background jobs** | Queue worker(s) for ingestion, TTS batches, cleanup, webhook retries. |

---

## 6. Technical recommendations (MVP-oriented)

| Layer | Recommendation | Notes |
|-------|----------------|-------|
| **Frontend** | Keep **Vite + React + TypeScript**; add React Router layouts for marketing vs app; TanStack Query for server state. | Matches current repo. |
| **Backend** | **Node (NestJS or Fastify)** or **Python (FastAPI)** — pick one team strength. | Bias: Fastify/Nest if JS everywhere. |
| **Database** | **PostgreSQL** (Neon, RDS, or Supabase Postgres). | Relational fits catalog, entitlements, usage. |
| **Auth** | **Supabase Auth**, **Clerk**, or **Auth.js** + your DB user row. | Clerk/Supabase speed MVP; Auth.js if you want minimal vendor lock-in. |
| **Billing** | **Stripe Billing** (Checkout + Customer Portal + webhooks). | Industry default for SaaS skeleton. |
| **File storage** | **S3** (R2, GCS, or AWS). | Private ACL; signed URLs for audio. |
| **Background jobs** | **BullMQ** + Redis, or **Cloud Tasks** / **SQS** + workers. | Start with one worker process on same provider as API. |
| **TTS** | One vendor first (**ElevenLabs**, **Amazon Polly**, **Google Cloud TTS**) — standardize an internal `AudioJob` interface. | Swap vendors behind adapter; cache aggressively. |
| **Future LLM layer** | **OpenAI / Anthropic** via server-side only; abstract `DiscussionProvider` for models + prompts. | Never expose API keys in the browser. |

---

## 7. MVP advice

### 7.1 MVP product boundary (intentionally **not** building yet)

Even if listed elsewhere in long-term architecture, **exclude from early MVP**:

- **User upload** and **Create a book** flows ([§8](#8-content-source-modes--book-acquisition)).
- Full **Gutenberg-scale** automation before one **curated** title is excellent end-to-end.
- **Social**, **public sharing**, **reviews**, **book clubs** as product surfaces.
- **Native mobile apps** (responsive web only).
- **Multi-tenant white-label**, **B2B org billing**, **enterprise SSO** (unless you explicitly pivot).
- **Admin UI** beyond scripts / DB — add `/admin` when ops pain justifies it.

**Still OK in MVP:** hardcoded or JSON-driven second chapter; fake “recommended for you”; client-only discuss stub on `/demo`; one Stripe price.

### 7.2 Do **not** build yet (engineering detail)

- Upload pipeline, virus scanning, rights attestation.
- Generative book wizard, prompt libraries, output moderation at scale.
- Multi-region active-active, custom model training.

### 7.3 Fake or hardcode temporarily

- **Second and third titles** in UI: one **Alice** (or single pilot) path end-to-end beats ten stub books.
- **Recommendations** and **social** features: static cards or empty states.
- **Discussion:** stub “coming soon” until Phase 6, or server echo only after Phase 2.

### 7.4 Next **3** concrete implementation milestones (suggested order)

1. **Phase 1 slice:** App layout + **protected** `/app/library` + `/app/read/...` shell reading **static JSON** for one curated book (auth gate from day one on `/app/*`, or add gate immediately after shell works).
2. **Phase 2 slice:** Auth + Stripe Checkout for one paid tier + webhook writing `subscription_status` + **one** paid-only or quota-gated capability (see §4.3).
3. **Phase 3 slice:** Minimal API + DB tables for `books`, `chapters`, `audio_assets`; serve pre-baked MP3 for chapter 1; wire reader to API instead of hardcoded demo text only.

---

## 8. Content source modes / book acquisition modes

AIStoryCast can eventually support **three** ways content enters the system. **Only the first is on the early MVP path**; the others are **planned** so schema, legal copy, and storage do not paint us into a corner.

### 8.1 Curated Library *(early MVP — default)*

- **Definition:** AIStoryCast hosts and serves a **catalog chosen by the product team** (starting with public-domain classics such as *Alice’s Adventures in Wonderland*).
- **Why first:** Predictable rights (PD or cleared licenses), controlled demos, repeatable ingestion, and a single QA surface for audio + sync + discussion.
- **Engineering:** First-class `books` / `chapters` rows, pipeline from Gutenberg (or similar), versioned text, stable IDs for audio and discussion anchoring.
- **MVP scope:** Ship and iterate here until reader + auth + billing + one narration pipeline are credible.

### 8.2 User Upload *(planned later — not day-one MVP)*

- **Definition:** Users upload their own files to read inside AIStoryCast (with optional future TTS/discussion).
- **Likely formats:** **TXT** and **EPUB** first; **PDF** later (layout extraction, larger abuse surface).
- **Product:** Clear **terms of use** (user warrants rights), upload limits, and optional “personal library only” vs “shareable” flags later.
- **Engineering implications:** Virus/malware scanning, size quotas, async parsing workers, normalized chapter model same as Curated (`book_source = upload`), **isolated storage prefixes** per user, retention and deletion jobs, **no** assumption that all books flow through PG pipeline.

### 8.3 Create a Book *(planned later — separate product surface)*

- **Definition:** Users ask AIStoryCast to **generate or assemble** a new book, story, or narrated experience (personalized fiction, children’s story from a prompt, etc.).
- **Why later:** Different pricing, safety, moderation, copyright output ownership, and quality bar than PD classics.
- **Engineering implications:** Separate **content type** or `book_origin = generated`, prompt/version storage, stronger logging, **usage-based billing** hooks, optional human-in-the-loop review flags; likely **different rate limits** and **model routing** than passage-level discussion on static text.

### Summary table

| Mode | MVP | Primary risk / cost |
|------|-----|---------------------|
| Curated Library | **Yes** | Editorial + pipeline maintenance |
| User Upload | **No** (design for it) | Rights + malware + parsing edge cases |
| Create a Book | **No** (design for it) | Safety, IP, compute spend, user expectations |

---

## Architecture implications (brief)

- **Data model:** Prefer a **`book_source`** (or equivalent enum: `curated` | `upload` | `generated`) and **`owner_user_id`** nullable for curated global titles — avoids duplicate tables later.
- **Storage:** Curated assets in a known prefix; uploads in **user-scoped** prefixes with lifecycle policies.
- **API:** Reader and discussion endpoints should accept **book id + chapter id + byte/char offsets** so all three modes converge on the same reader contract once normalized.
- **Access:** Centralize **`requiresAuth` / `requiresPaid` / `requiresAdmin`** in API middleware and mirror in the React router for UX.
- **Billing:** Curated subscription vs **metered** “Create” or heavy upload processing may need **separate Stripe products** or metered billing later.
- **Legal / UX:** Terms and in-product copy should **name** upload and generation as future capabilities so expectations match the roadmap.

---

*Last updated: access model + route boundaries tightened for MVP clarity.*
