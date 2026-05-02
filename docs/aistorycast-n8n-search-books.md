# n8n workflow: `POST /webhook/aistorycast-search-books`

Live public-domain search for AIStoryCast: the SPA posts `{ "query": "…" }` and expects `{ "success": true, "results": SearchResult[] }` (see `src/lib/publicDomainLiveSearch.ts`).

## Recommended upstream API: **Gutendex**

- **Base URL:** `https://gutendex.com/books/`
- **Why:** JSON-first catalog aligned with **Project Gutenberg** IDs and download URLs. No API key. Suitable for server-side n8n `HTTP Request` nodes.
- **Docs / source:** [Gutendex](https://gutendex.com/) (community index over Gutenberg metadata).

### Fields you can rely on (per hit)

| Gutendex field | Use in app |
|----------------|------------|
| `id` (number) | Build stable app id `gutenberg-${id}` (avoids colliding with starter slugs like `great-expectations`). |
| `title` | `SearchResult.title` |
| `authors[0].name` | `SearchResult.author` (Gutendex uses “Last, First”; acceptable for MVP). |
| `formats` | Pick a **plain `.txt` under `/files/{id}/`** when possible so URLs match common ingestion patterns; else `text/plain; charset=utf-8`. |
| `summaries[0]` or `subjects` | `SearchResult.description` (trim; Gutendex may include auto-generated summaries). |
| `copyright` | Filter to `false` only if you want PD-ish results (Gutenberg still lists some non-PD edge cases; Gutendex exposes the flag). |
| `languages` | Optional filter (e.g. `en` only). |

### Fields that are intentionally empty from search

| `SearchResult` field | Live search value |
|---------------------|-------------------|
| `chapterImport` | `null` |
| `chapterImports` | `[]` |

Imports then use **full text** only (no marker chapters) until a title is added to the starter catalog with `chapterImports`.

## Open Library (optional)

Use **Open Library** search only if you need broader discovery; you must still resolve a **Gutenberg-compatible `.txt` URL** for `sourceUrl` or the existing import proxy may not match expectations. Gutendex alone is enough for “Great Expectations” / “A Christmas Carol” style queries.

## n8n node outline

1. **Webhook** — Method `POST`, path `aistorycast-search-books`, respond `Using Respond to Webhook`.
2. **Set** (optional) — Normalize `query` from `$json.body.query` or `$json.query` depending on n8n version.
3. **HTTP Request** — `GET https://gutendex.com/books/?search={{ encodeURIComponent($json.query) }}` (no auth).
4. **Code** — Map `items[0].json.results` → response payload (see script below).
5. **Respond to Webhook** — JSON body from Code node.

### Code node (JavaScript)

Paste and wire input to the Gutendex HTTP node output (`results` array on the root JSON).

```javascript
const pickPlainTxtUrl = (formats) => {
  if (!formats || typeof formats !== 'object') return '';
  const entries = Object.entries(formats);
  const filesTxt = entries
    .filter(([k, u]) => k.startsWith('text/plain') && typeof u === 'string' && u.includes('/files/') && u.endsWith('.txt'))
    .map(([, u]) => u);
  if (filesTxt.length) return filesTxt[0];
  const utf8 = formats['text/plain; charset=utf-8'];
  if (typeof utf8 === 'string') return utf8;
  const ascii = formats['text/plain; charset=us-ascii'];
  if (typeof ascii === 'string') return ascii;
  const any = entries.find(([k, u]) => k.startsWith('text/plain') && typeof u === 'string');
  return any ? any[1] : '';
};

const root = items[0].json;
// If the Code node is wired after the Gutendex HTTP node only, read the search string from the Webhook node:
// const q = String($('Webhook').first().json.body?.query ?? '').trim().toLowerCase();
const list = Array.isArray(root.results) ? root.results : [];

const results = list
  .filter((b) => b && b.copyright === false && Array.isArray(b.languages) && b.languages.includes('en'))
  .map((b) => {
    const sourceUrl = pickPlainTxtUrl(b.formats);
    const author = (b.authors && b.authors[0] && b.authors[0].name) || 'Unknown';
    const descFromSummary = Array.isArray(b.summaries) && b.summaries[0] ? String(b.summaries[0]) : '';
    const descFromSubjects = Array.isArray(b.subjects) ? b.subjects.slice(0, 5).join(' · ') : '';
    const description = (descFromSummary || descFromSubjects).slice(0, 1200);
    return {
      id: `gutenberg-${b.id}`,
      title: String(b.title || '').trim(),
      author,
      source: 'public-domain',
      sourceUrl,
      description,
      chapterImport: null,
      chapterImports: [],
    };
  })
  .filter((r) => r.title && r.sourceUrl);

return [{ json: { success: true, results } }];
```

**Webhook CORS:** allow your Vite app origin (and production domain) on the Webhook node so the browser can `POST` with `Content-Type: application/json`.

## Frontend configuration

Set in `.env.local`:

```bash
VITE_AISTORYCAST_SEARCH_URL=https://<your-n8n-host>/webhook/aistorycast-search-books
```

When unset, search stays **starter catalog only** (no regression).

## Deduping with the starter catalog

The app drops live rows whose `sourceUrl` resolves to the same **Gutenberg numeric id** as any starter `SearchResult`, so you will not see two cards for the same Gutenberg file (e.g. #1400) when the curated row already exists.
