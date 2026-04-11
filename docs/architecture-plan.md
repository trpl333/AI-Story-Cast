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

**Ordering note:** Phases 4–6 overlap in practice (e.g. audio before full ingestion for one pilot title). Keep **Curated Library** (see [Content source modes](#7-content-source-modes--book-acquisition)) as the only content path until Phase 3–4 are stable.

---

## 2. Core routes / pages (suggested route map)

| Route | Purpose |
|-------|---------|
| `/` | Marketing home |
| `/pricing` | Plans, FAQ, link to signup |
| `/login`, `/signup` | Auth (magic link, OAuth, or email+password — pick one MVP pattern) |
| `/demo` | **Public** interactive reader demo (curated sample; may stay unauthenticated forever) |
| `/app` or `/` post-login redirect | App dashboard (continue reading, recommendations stub) |
| `/app/library` | Search / browse **curated** catalog |
| `/app/read/:bookId/:chapterId` | Book reader (audio + text + discuss UI) |
| `/app/account` or `/app/settings` | Profile, subscription, invoices, delete account |
| `/*` catch-all | 404 |

**Marketing vs app:** Use layout splits (`(marketing)` vs `(app)`) in the router so nav chrome and auth guards stay clean.

---

## 3. User states

| Capability | Anonymous | Logged-in free | Paid subscriber |
|------------|-------------|----------------|-------------------|
| Marketing + static pages | Yes | Yes | Yes |
| `/demo` reader (curated sample) | Yes | Yes | Yes |
| Save progress / bookmarks | No | Yes (light) | Yes |
| Full **curated** library browse | Optional teaser | Yes | Yes |
| Full chapter playback (once audio exists) | Rate-limited or preview-only | Yes (fair use limits) | Yes (higher limits / priority) |
| Passage discussion / LLM | No or tiny trial | Limited quota | Higher quota + optional priority models |
| **User upload** or **Create a book** | No | No (future) | TBD by phase (see §7) |

**Product principle:** Anonymous users should always have a **credible** path (marketing + demo). Paywall primarily for **persistence**, **scale**, and **LLM/audio cost**, not for “seeing the product.”

---

## 4. Core services

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

## 5. Technical recommendations (MVP-oriented)

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

## 6. MVP advice

### Do **not** build yet

- User upload pipeline, virus scanning, and rights attestation (planned later — §7).
- “Create a Book” full wizard, templating, and generative rights workflow (later phase).
- Multi-region active-active, custom ML training, real-time collaborative reading.
- Full mobile native apps (responsive web first).

### Fake or hardcode temporarily

- **Second and third titles** in UI: one **Alice** (or single pilot) path end-to-end beats ten stub books.
- **Recommendations** and **social** features: static cards or empty states.
- **Discussion:** stub “coming soon” until Phase 6, or server echo only after Phase 2.

### Next **3** concrete implementation milestones (suggested order)

1. **Phase 1 slice:** App layout + protected `/app/library` + `/app/read/...` shell reading **static JSON** for one book (no auth optional at first, then add gate).
2. **Phase 2 slice:** Auth + Stripe Checkout for one paid tier + webhook writing `subscription_status` + gate reader features.
3. **Phase 3 slice:** Minimal API + DB tables for `books`, `chapters`, `audio_assets`; serve pre-baked MP3 for chapter 1; wire reader to API instead of hardcoded demo text only.

---

## 7. Content source modes / book acquisition modes

AIStoryCast can eventually support **three** ways content enters the system. **Only the first is on the early MVP path**; the others are **planned** so schema, legal copy, and storage do not paint us into a corner.

### 7.1 Curated Library *(early MVP — default)*

- **Definition:** AIStoryCast hosts and serves a **catalog chosen by the product team** (starting with public-domain classics such as *Alice’s Adventures in Wonderland*).
- **Why first:** Predictable rights (PD or cleared licenses), controlled demos, repeatable ingestion, and a single QA surface for audio + sync + discussion.
- **Engineering:** First-class `books` / `chapters` rows, pipeline from Gutenberg (or similar), versioned text, stable IDs for audio and discussion anchoring.
- **MVP scope:** Ship and iterate here until reader + auth + billing + one narration pipeline are credible.

### 7.2 User Upload *(planned later — not day-one MVP)*

- **Definition:** Users upload their own files to read inside AIStoryCast (with optional future TTS/discussion).
- **Likely formats:** **TXT** and **EPUB** first; **PDF** later (layout extraction, larger abuse surface).
- **Product:** Clear **terms of use** (user warrants rights), upload limits, and optional “personal library only” vs “shareable” flags later.
- **Engineering implications:** Virus/malware scanning, size quotas, async parsing workers, normalized chapter model same as Curated (`book_source = upload`), **isolated storage prefixes** per user, retention and deletion jobs, **no** assumption that all books flow through PG pipeline.

### 7.3 Create a Book *(planned later — separate product surface)*

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
- **Billing:** Curated subscription vs **metered** “Create” or heavy upload processing may need **separate Stripe products** or metered billing later.
- **Legal / UX:** Terms and in-product copy should **name** upload and generation as future capabilities so expectations match the roadmap.

---

*Last updated: planning pass aligned with marketing site + `/demo` state. Revisit after Phase 1 app shell lands.*
