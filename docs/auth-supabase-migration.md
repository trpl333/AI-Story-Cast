# Auth: mock → Supabase (implementation plan)

**Status:** The SPA uses **`SupabaseAuthProvider`** in `App.tsx` with `src/lib/supabaseClient.ts`. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`). **`MockAuthProvider`** remains in the repo for local-only demos or temporary swap-back.

**Repo fact:** `@supabase/supabase-js` is a dependency; the browser client is created only when both env vars are set. Firebase is also listed in `package.json` and is unused under `src/`.

---

## 1. Current structure (what exists today)

| Piece | Role |
|-------|------|
| `App.tsx` | Wraps routes with `SupabaseAuthProvider` (inside `BrowserRouter`). |
| `auth/authContext.ts` | `AuthContext` + `AuthContextValue` — session shape consumed by the UI. |
| `auth/SupabaseAuthProvider.tsx` | Supabase session + `onAuthStateChange`, implements `AuthContextValue`. |
| `auth/MockAuthProvider.tsx` | Optional localStorage mock (not mounted by default). |
| `auth/useAuth.ts` | `useAuth()` — **single hook** all screens should use. |
| `auth/ProtectedRoute.tsx` | If `!isAuthenticated` → `Navigate` to `/login` with `state.from`; respects `isSessionPending`. |
| `pages/auth/LoginPage.tsx` / `SignupPage.tsx` | Real Supabase errors + email-confirmation messaging via `EmailConfirmationRequiredError`. |

**Replacement path for other providers:** Keep **`AuthContext` / `AuthContextValue` / `useAuth` / `ProtectedRoute`**. Swap the root provider or implement the same contract inside `SupabaseAuthProvider`.

---

## 2. Supabase Auth — recommended setup (when you wire it)

### 2.1 Environment

- Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Vite prefix so keys are embeddable in the SPA — **anon key only**; never service role in the client).
- Create `src/lib/supabaseClient.ts` exporting `createClient(url, anonKey)` once; import that singleton from the auth provider.

### 2.2 Provider at app root

`App.tsx` already uses:

```tsx
<SupabaseAuthProvider>
```

Order: `BrowserRouter` → **`SupabaseAuthProvider`** → `AppRoutes`.

### 2.3 Session hook shape (`AuthContextValue`)

The app already expects (see `auth/authContext.ts`):

| Field | Mock today | Supabase mapping |
|-------|------------|-------------------|
| `user` | `{ email, displayName }` from local JSON | Map from `session.user`: `email` from `user.email`; `displayName` from `user_metadata.display_name` or `user.user_metadata.full_name` or email local-part. |
| `isAuthenticated` | `user != null` | `session != null` |
| `isSessionPending` | always `false` | `true` until first `getSession()` (or `onAuthStateChange` initial event) completes — **prevents flash redirect** on `/app/*`. |
| `signIn(email, password?)` | instant resolve | `supabase.auth.signInWithPassword({ email, password })` — surface errors in UI. |
| `signUp(email, displayName, password?)` | instant resolve | `signUp({ email, password, options: { data: { display_name: displayName } } })` (align metadata keys with RLS / profile table). |
| `signOut()` | clear storage | `supabase.auth.signOut()` |
| `getAccessToken()` | `Promise.resolve(null)` | `session?.access_token` from `supabase.auth.getSession()` (refresh if needed). Use for future `Authorization: Bearer …` API calls. |

**Optional later:** expose `authError` / `clearAuthError` on the context for login/signup forms instead of local-only state.

### 2.4 `ProtectedRoute` changes

- **Already compatible:** when `isSessionPending` is `true`, show a minimal loading state (no redirect).
- When `!isSessionPending && !isAuthenticated`, keep current `Navigate to="/login"` with `state.from`.
- **No change** to route config shape in `router/config.tsx` unless you add OAuth callback routes (e.g. `/auth/callback`) — add as public sibling routes if using PKCE redirect flow.

### 2.5 Login / signup page behavior

- **Keep** redirect-on-authenticated behavior (`useEffect` + `navigate`).
- **Change** submit handlers to `await signIn` / `await signUp` and branch on thrown errors or returned `{ error }` from Supabase (map to inline form messages).
- **Remove** copy that says “mock” once real auth is on (replace with honest “email + password” / magic link copy per product).
- **Signup:** after email confirmation flows, Supabase may return session `null` until user confirms email — adjust UX: show “Check your email” instead of assuming immediate `isAuthenticated`.

### 2.6 Logout behavior

- All call sites should `await signOut()` (already async-capable).
- Navbar / shell: after sign out, continue navigating to `/` or `/login` as you do today.
- Supabase clears cookies/local persistence per project settings; no `aistorycast_mock_user` key anymore (safe to leave old key or clear it once in migration).

### 2.7 Token access for future backend API calls

- From any component: `const token = await getAccessToken()`.
- Supabase implementation: read `data.session?.access_token` after `getSession()`; optionally wrap `supabase.auth.onAuthStateChange` to keep token fresh in memory.
- **Backend (later):** verify JWT with Supabase JWT secret / JWKS; **do not** trust the client alone. This doc does not cover API routes.

---

## 3. Files: keep vs replace

| Keep (evolve in place) | Notes |
|------------------------|--------|
| `auth/authContext.ts` — contract | Stable |
| `auth/SupabaseAuthProvider.tsx` | `getSession` + `onAuthStateChange`, `AuthContextValue` |
| `auth/useAuth.ts` | Stable |
| `src/lib/supabaseClient.ts` | Singleton browser client |
| `auth/ProtectedRoute.tsx` | Gate + `isSessionPending` |
| `router/config.tsx` | `/login`, `/signup`, protected `/app` |
| `pages/auth/LoginPage.tsx`, `SignupPage.tsx` | Supabase errors + env missing banner |
| `types.ts` — `AuthUser` | Maps from `user_metadata.display_name` |

Optional later: `pages/auth/AuthCallbackPage.tsx` + route if using OAuth redirect flows beyond email/password.

| Remove or demote after Supabase works |
|---------------------------------------|
| `auth/MockAuthProvider.tsx` — optional; delete if you no longer need a no-network auth stub |

---

## 3b. Supabase Dashboard settings

- **Project Settings → API:** copy **Project URL** → `VITE_SUPABASE_URL`, and **anon public** key → `VITE_SUPABASE_ANON_KEY` (never the `service_role` key in the SPA).
- **Authentication → Providers:** enable **Email** for password sign-in/sign-up used by this app.
- **Authentication → URL configuration:** set **Site URL** to your local dev origin (e.g. `http://localhost:5173`) and production URL when you deploy. Add **Redirect URLs** for any preview domains you use.
- **Authentication → Sign up / Email:** if **Confirm email** is enabled, new users see the in-app “check your email” message until they confirm; if disabled, Supabase returns a session immediately and the app redirects to `/app` after signup.

---

## 4. Security & product notes (brief)

- **Row Level Security (RLS):** enable on all user-owned tables; tie to `auth.uid()`.
- **Email confirmation:** decide before launch; drives signup UX.
- **Password reset:** Supabase hosted email templates + `/reset` route when you need it.

---

## 5. Verification checklist (when implemented)

- [ ] Cold load on `/app` while logged in: no redirect flash (`isSessionPending`).
- [ ] Deep link to `/app/read/...` when logged out → `/login` with return to same URL via `state.from`.
- [ ] Logout from shell and marketing navbar clears session and guards `/app`.
- [ ] `getAccessToken()` returns a non-empty string when session exists (spot-check in devtools or a throwaway log; remove before shipping).

---

## 6. Out of scope (explicit)

- Stripe / billing portal (separate pass).
- Custom backend API + server-side verification (separate pass; use `getAccessToken()` when ready).
