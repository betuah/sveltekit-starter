# SvelteKit Full-Stack Starter — Design

Date: 2026-11-24
Status: draft, waiting for approval

## 1. Intent

A reusable SvelteKit starter for many future projects. It has to cover authentication, authorization (RBAC), security, a database with migrations and seed, admin and landing UI, and a documented REST API that other backends or clients can use. It should be tidy and easy to maintain: a login method is enabled or disabled through config, and the UI follows automatically.

A client-only (SPA) version is **not** part of this work. It may become a separate starter later and reuse the UI pieces from this one.

## 2. Goals

- Configurable login methods, each one independently on/off:
  - email + password
  - registration (sign-up)
  - generic OIDC (SSO)
  - Google sign-in
- The login page shows only the active methods. If only OIDC is on, it shows a single "Sign in with SSO" button.
- Email verification and password reset, with custom email templates.
- Dynamic RBAC: roles and the permissions of each role can be managed from the admin UI.
- Server-side security by default.
- Drizzle ORM with a root `database/` folder holding `schema/`, `migrations/`, and `seeders/`, and an idempotent seed.
- Public REST API at `/api/v1` with an OpenAPI spec and Scalar docs.
- Integration with other backends in both directions (see §8).
- Admin area plus a landing page, built with shadcn-svelte, Tailwind, and theming (light/dark).
- i18n with the locale in the URL and translations split into one JSON file per domain (§13c).

## 3. Non-goals (left out on purpose, can be added later)

- SPA / static-hosting mode.
- Multi-tenancy / organizations.
- Login toggles in the admin UI. They live in `.env` (see §5).
- 2FA / passkeys. Better Auth has plugins for both, so they are cheap to add later.
- Audit log table, payments.
- OIDC group/claim-based access (`groups` claim → allow/role mapping). It can be added later in the same auth hook as §6.1.
- API keys for machine clients. The Better Auth `apiKey` plugin can be added later if needed.

## 4. Anti-goals (signs the project went wrong, even if it "works")

- Auth code full of `if (mode)` branches that is hard to read.
- Permission checks that exist only in the UI. Every check must also happen on the server.
- Setup for a new project that takes more than: copy, fill in `.env`, `db:migrate`, `db:seed`, `dev`.
- An admin can lock everyone out (delete `super_admin`, remove their own last admin role).

## 5. Decisions

| Area | Decision | Who decided |
|---|---|---|
| Runtime | Bun (`bun install`, `bun run`) | user |
| Adapter | **`@sveltejs/adapter-bun`** (official, v1.0.x, requires Bun ≥ 1.4). The community `svelte-adapter-bun` is archived/deprecated (verified 2026-11-24) | user + Claude |
| Framework | **SvelteKit 3** (3.4.x) + Svelte 5 (runes), TypeScript strict. SvelteKit 3 facts that apply everywhere: config lives in `vite.config.ts` as `sveltekit({...})` options (`svelte.config.js` is no longer supported); use `#lib` subpath imports instead of `$lib`; use `$app/env/private` / `$app/env/public` instead of `$env/*`; use `$app/state` instead of `$app/stores`; `csrf.checkOrigin` is removed and CSRF is always on, configured with `csrf.trustedOrigins` | Claude (verified docs 2026-11-24) |
| Auth | Better Auth + Drizzle adapter | user |
| ORM / DB | Drizzle + **PostgreSQL** | user (Drizzle), Claude (Postgres) |
| API | Hono + `@hono/zod-openapi`, mounted inside SvelteKit at `/api/v1/*` (same process, same deploy) | user |
| API docs | Scalar at `/docs`, merging the Hono spec and the Better Auth `openAPI` plugin spec | user |
| RBAC | Permissions defined in code and synced to the DB by the seed. Roles and role→permission mapping editable in admin | user agreed to Claude's proposal |
| Login toggles | `.env` flags, read once at startup | user |
| Object storage | S3-compatible. RustFS in docker-compose for dev, any S3 (AWS S3, R2, ...) in production. Client is Bun's built-in `Bun.S3Client`, so there is no extra dependency | user (RustFS), Claude (client) |
| Dev email | Mailpit in docker-compose catches all outgoing mail | Claude |
| Local stack | `docker-compose.yml`: PostgreSQL, RustFS, Mailpit. No Redis, because rate limits use the DB | user + Claude |
| UI | shadcn-svelte + Tailwind v4, CSS-variable theming, `mode-watcher` for light/dark | user |
| Email | Svelte components rendered with `render()` from `svelte/server`, sent with nodemailer over SMTP | Claude |
| Validation | Zod (required by `@hono/zod-openapi`, also used in form actions) | Claude |
| Tests | Vitest (unit, integration) + Playwright (e2e) + security suite (§15a), all under a root `tests/` folder (§15) | Claude (tools), user (folder layout) |
| Database folder | Root `database/` with `schema/` (one file per domain, related tables together), `migrations/`, `seeders/` (§12) | user |
| i18n | Locale prefix in the URL (`/en/...`, default `id` without prefix), one JSON file per domain per locale (§13c) | user |
| CI / release | GitHub Actions (user), release-please, Dependabot (§15b) | user + Claude |
| Docs language | Bahasa Indonesia for everything in `docs/`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`. Code, identifiers, and commit messages stay in English | user |
| Commits | Conventional Commits enforced with commitlint + Lefthook, SemVer (§15c) | user |

## 6. Auth configuration

All flags live in `.env` and are validated with Zod at startup in `src/lib/server/config.ts`. Invalid config makes the app fail fast with a clear message.

```
AUTH_EMAIL_PASSWORD_ENABLED=true
AUTH_SIGNUP_ENABLED=true
AUTH_EMAIL_VERIFICATION_REQUIRED=true

AUTH_GOOGLE_ENABLED=false
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

AUTH_OIDC_ENABLED=false
OIDC_PROVIDER_ID=sso            # used in callback URL
OIDC_DISPLAY_NAME="Company SSO"  # button label
OIDC_DISCOVERY_URL=             # https://idp/.well-known/openid-configuration
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_SCOPES="openid email profile"
```

Rules enforced by the config validator:
- At least one login method must be enabled.
- If a provider is enabled, its credentials are required.
- `AUTH_SIGNUP_ENABLED=false` disables self-registration for **all** methods. Email sign-up is hidden, and an OIDC/Google login for an email that has no user yet is rejected. Users are then created by an admin (invite) or by the seed.

Additional env:

```
AUTH_ALLOWED_EMAIL_DOMAINS=     # optional, comma-separated, e.g. "company.com,company.co.id"; empty = any
```

### 6.1 Who may sign in with SSO (OIDC / Google)

This rule is decided by the user. It is enforced in one place: a Better Auth hook on social/OIDC sign-in (`databaseHooks` + `hooks.before` on the callback).

1. The provider must return a **verified** email.
2. If `AUTH_ALLOWED_EMAIL_DOMAINS` is set, the email domain must be in the list.
3. Look up the local user by that email:
   - **Found and active** (`disabled_at IS NULL`): **valid**. Link the provider account to this user if it is not linked yet. This covers users invited or created by an admin and users created by the seed.
   - **Found but disabled**: rejected.
   - **Not found**: if `AUTH_SIGNUP_ENABLED=true`, create the user with the default `user` role. Otherwise reject it with the message "Your account is not registered. Contact the administrator."
4. Rejections redirect to `/login?error=<code>`, and the login page shows a friendly message. The response never reveals more than that.

README recommendation: where possible, also restrict app assignment at the IdP (Keycloak/Azure AD/Okta/Google Workspace). This is defense in depth.

Better Auth mapping:
- `emailAndPassword: { enabled, disableSignUp, requireEmailVerification, sendResetPassword }`
- `emailVerification: { sendVerificationEmail, sendOnSignUp: true, autoSignInAfterVerification: true }`
- `socialProviders.google` only when enabled
- `genericOAuth` plugin with one entry from `OIDC_*`, only when enabled
- `account.accountLinking`: link Google/OIDC to an existing user **only** when the provider reports a verified email (`trustedProviders` = enabled providers). The final allow/deny decision follows §6.1

The client only gets a public summary, loaded in the root `+layout.server.ts`:

```ts
{ emailPassword: boolean, signup: boolean, google: boolean, oidc: { enabled: boolean, label: string } }
```

The login page renders from this object. Each method is its own small component (`EmailPasswordForm`, `GoogleButton`, `OidcButton`). The page is a list of `{#if}` blocks with no extra logic. If exactly one method is enabled and it is OIDC or Google, the page shows only that button.

## 7. RBAC

### Data model (own Drizzle tables, independent of Better Auth)

```
permission      (key text PK, description text)            -- e.g. 'user.read'
role            (id, name unique, description, is_system bool, created_at)
role_permission (role_id FK, permission_key FK)  PK(role_id, permission_key)
user_role       (user_id FK, role_id FK)         PK(user_id, role_id)
```

### Source of truth

- `src/lib/permissions.ts` exports a `const` list of permission keys and descriptions. This gives the `Permission` string-literal type used everywhere.
- The seed upserts this list into `permission` and deletes keys that are no longer in code. Rows in `role_permission` that reference a deleted key are removed by cascade.
- Starting permissions: `user.read`, `user.create`, `user.update`, `user.delete`, `role.read`, `role.manage`, `admin.access`, `api_docs.read`, `design.read`.

### System roles (seeded)

- `super_admin`: has every permission implicitly (checked in code, not via rows), so new permissions never need to be granted to it. It cannot be deleted or edited. `is_system = true`.
- `user`: the default role given to every new user. It can be edited but not deleted.

### Guards against lock-out

- `super_admin` cannot be deleted, renamed, or edited.
- An admin cannot remove `super_admin` from themselves, and the system refuses to remove the last `super_admin`.

### First admin

`SEED_SUPER_ADMIN_EMAIL` in `.env`. The seed always creates that user row, marked email-verified, and gives it `super_admin`. A credential account is added only if email/password is enabled and `SEED_SUPER_ADMIN_PASSWORD` is set. In an OIDC/Google-only setup, the first provider login with that email links to the existing user through account linking, so it works even when sign-up is disabled. No extra hook is needed.

### Loading and checking

- In `hooks.server.ts`: get the session from Better Auth. If there is a user, load their permissions with one query (user_role → role_permission) into `event.locals.permissions: Set<Permission>`. Load nothing for anonymous requests.
- Disabled users (a `user.disabled_at` column added to the Better Auth user table) get their sessions rejected.
- Server helpers in `src/lib/server/auth/guard.ts`:
  - `requireUser(event)`: redirects to `/login?redirectTo=...`.
  - `requirePermission(event, 'user.read')`: returns 403 via `error()`.
- Hono middleware: `requireAuth()`, `requirePermission('user.read')`. Unauthorized requests get JSON 401/403.
- Shared helper: `can(permissions, key)`, which handles `super_admin`. It is used for UI hiding only. The server always checks again.
- `(app)/admin/+layout.server.ts` requires `admin.access`. Each admin page or action also requires its own permission.

## 8. Other backends

**A. SvelteKit calls another backend (BFF).**
`src/lib/server/backend.ts` exports `backendFetch(event, path, init)`. It sends requests to `BACKEND_URL` and attaches a short-lived JWT for the current user, issued by the Better Auth `jwt` plugin. The other backend verifies the token against our JWKS endpoint (`/api/auth/jwks`). Tokens never reach the browser.

**B. Another backend or a mobile app calls our API.**
`/api/v1/*` accepts either the session cookie (browser) or `Authorization: Bearer <token>` (Better Auth `bearer` plugin). CORS is off by default. `CORS_ORIGINS` in `.env` lists allowed origins.

## 9. API (Hono)

- `src/routes/api/v1/[...path]/+server.ts` forwards every method to `api.fetch(request)` and passes the SvelteKit `locals` through Hono context.
- `src/lib/server/api/index.ts` is an `OpenAPIHono` app with `basePath('/api/v1')`. It has an error handler that returns `{ error: { code, message } }` and never leaks stack traces in production.
- Routes live in each module (`modules/<domain>/<domain>.routes.ts`, §9a) and are mounted by `api/index.ts`. They are built with `createRoute` and the module's Zod schemas. Example resources in the starter: `users` (list/get, guarded by permissions) and `me`.
- `/api/v1/openapi.json` serves the generated spec.
- `/docs` is a SvelteKit route rendering Scalar with two sources: `/api/v1/openapi.json` and the Better Auth spec. It requires the `api_docs.read` permission in production and is open in dev.
- Better Auth itself is mounted at `/api/auth/*` through `svelteKitHandler` in `hooks.server.ts`, the standard Better Auth setup. It is not routed through Hono.

## 9a. Server layering (decided by user: per-domain modules with a repository layer)

```
src/lib/server/
  core/                     shared infrastructure, no business logic
    config.ts  db.ts  auth.ts  storage.ts  email/  errors.ts  context.ts  pagination.ts
  api/index.ts              OpenAPIHono app, mounts module routes, error mapping
  modules/
    <domain>/
      <domain>.schema.ts      DTOs: Zod input/output schemas; types inferred from them
      <domain>.repository.ts  data access only
      <domain>.service.ts     business logic + authorization
      <domain>.routes.ts      Hono routes (REST controller)
      <domain>.service.test.ts
```

Starter modules: `users`, `roles` (incl. permissions), `files` (storage metadata for avatar).

Layer rules:

| Layer | May | May not |
|---|---|---|
| routes / `+page.server.ts` (controllers) | parse input with the module's schema, build `ctx`, call the service, map the result to a response | contain business rules, call repositories or Drizzle directly |
| service | enforce permissions (`assertCan(ctx, 'user.update')`), apply business rules and lock-out guards, open transactions, call one or more repositories, throw `AppError` | import SvelteKit (`@sveltejs/kit`) or Hono. It must stay framework-free so both controllers share it |
| repository | run Drizzle queries for its domain and return plain typed rows | check permissions, throw HTTP errors, call other services |

Conventions:
- Plain exported functions, no classes or DI container.
- Every repository function takes an executor (`db` or a transaction `tx`) as its first argument, so a service can run several repositories in one transaction: `db.transaction(tx => { rolesRepo.remove(tx, id); ... })`.
- `ctx` = `{ user, permissions }`, built once per request in `hooks.server.ts` and passed explicitly.
- `AppError` subclasses (`NotFoundError`, `ForbiddenError`, `ConflictError`, `ValidationError`) are mapped in one place for Hono (JSON `{ error: { code, message } }`) and in one helper for SvelteKit (`error()` / `fail()`).
- A module imports another module only through its **service**, never its repository or tables. This keeps a domain's data private and makes it possible to move a module to another backend later by swapping only its repository.
- Cross-module joins for read-only lists (e.g. users with role names) are allowed in the owning module's repository. The README documents this exception.
- Tables live in `database/schema/<domain>.ts`, not in the module (decided by user). One file per domain; tables that belong together stay in the same file, e.g. `users.ts` holds `user` and `user_detail`. `database/schema/index.ts` re-exports every file and is the only schema entry for `drizzle.config.ts` and `db.ts`. A repository imports only the schema file of its own domain (`#database/schema/users.ts`); the cross-module join exception below still applies.
- Tests: services are tested against the real test DB (`app_test`), not against mocked repositories, so queries are exercised too.

## 10. Security

- Sessions: Better Auth database sessions, cookies `httpOnly`, `secure` in production, `sameSite=lax`. `BETTER_AUTH_SECRET` is required and must be at least 32 characters.
- Passwords: Better Auth default hashing (scrypt). Minimum length is 8, configurable.
- Rate limiting: Better Auth built-in, with `storage: 'database'` so it works with more than one instance. Login, sign-up, and reset get stricter limits.
- CSRF: SvelteKit 3 CSRF protection (always on in production, extra origins only via `csrf.trustedOrigins`) protects form actions. Behind a reverse proxy, `ORIGIN` (or `PROTOCOL_HEADER`/`HOST_HEADER`) must be set, or every form POST fails the origin check. Better Auth checks `trustedOrigins`. The JSON API relies on strict CORS: no wildcard with credentials.
- Security headers in `hooks.server.ts`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, and HSTS in production.
- CSP through the `csp` option of `sveltekit({...})` in `vite.config.ts` (`mode: 'auto'`). The `/docs` route gets a relaxed policy for Scalar's CDN assets.
- Env: all env is parsed once in `src/lib/server/core/config.ts` from `process.env`, so CLI scripts such as the seed can share it. App code imports `config`, never `process.env` directly. Secrets never reach the client bundle; SvelteKit enforces this for `$lib/server`.
- Validation: every form action and API route validates input with Zod.
- Reset and verification tokens are handled by Better Auth (single-use, expiring). Reset responses never reveal whether an email exists.

## 11. Email

- `src/lib/server/email/templates/*.svelte`: `VerifyEmail.svelte`, `ResetPassword.svelte`, and a shared `Layout.svelte`. They are plain components with inline styles for email-client compatibility.
- `src/lib/server/email/send.ts`: `sendEmail({ to, subject, template, props })` renders HTML with `render()` from `svelte/server`, builds a plain-text fallback, and sends it through nodemailer with `SMTP_*` env vars.
- In dev, `SMTP_*` points to Mailpit (`localhost:1025`). Its web UI at `localhost:8025` shows every email sent.

## 11b. Object storage

- `src/lib/server/storage.ts` wraps `Bun.S3Client` configured from `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. It exposes:
  - `putObject(key, body, contentType)`
  - `getSignedUrl(key, { expiresIn })`
  - `deleteObject(key)`
- Buckets are private by default. Files are served through short-lived signed URLs, never public links.
- Uploads go through the server: a form action validates size (`UPLOAD_MAX_BYTES`, default 5 MB) and MIME type against an allowlist, then writes a random key (`avatars/<userId>/<uuid>.<ext>`). The original filename is never used as the key.
- Working example: avatar upload on `/account`. The key is stored in `user.image`, and the old object is deleted on replace.
- docker-compose creates the dev bucket on start, using a small init container or RustFS env.

## 12. Database, migrations, seed

```
drizzle.config.ts            -> schema: database/schema/index.ts, out: database/migrations
database/
  schema/
    index.ts                 -> re-exports every schema file
    auth.ts                  -> generated by `@better-auth/cli generate`, then extended (disabled_at)
    roles.ts                 -> permission, role, role_permission, user_role
    files.ts                 -> file metadata (avatar)
  migrations/                -> SQL + meta/ generated by drizzle-kit, one folder for all domains
  seeders/
    index.ts                 -> entry: runs seeders in order inside a transaction
    runner.ts
    permissions.ts           -> sync code permissions to DB
    roles.ts                 -> upsert super_admin + user
    admin.ts                 -> create first super admin from env
src/lib/server/core/db.ts    -> drizzle client (postgres-js), schema from #database/schema/index.ts
```

Imports: `#database/*` maps to `./database/*` in `package.json` `imports`, next to `#lib/*`.

Scripts:
- `db:generate`: `drizzle-kit generate`
- `db:migrate`: `drizzle-kit migrate`
- `db:seed`: `bun database/seeders/index.ts`
- `db:studio`: `drizzle-kit studio`
- `auth:schema`: regenerate the Better Auth schema after enabling a plugin

The seed is idempotent and safe to run on every deploy. It uses upserts only, except for removing permissions that were deleted from code.

`docker-compose.yml` (dev stack, named volumes, healthchecks):

| Service | Purpose | Ports |
|---|---|---|
| `postgres` | main DB, plus a second DB `app_test` for tests | 5432 |
| `rustfs` | S3-compatible object storage + console | 9000 (S3), 9001 (console) |
| `mailpit` | catches dev email | 1025 (SMTP), 8025 (UI) |

The app itself runs on the host with `bun run dev`. A production `Dockerfile` for the app (Bun image, multi-stage) is included but is not part of the dev compose.

## 13. UI and routes

```
src/routes/
  (marketing)/+page.svelte           landing
  (marketing)/+layout.svelte         navbar + footer
  (auth)/login/                      shows enabled methods only
  (auth)/register/                   404 when signup or email/password is disabled
  (auth)/forgot-password/  reset-password/  verify-email/
  (app)/+layout.server.ts            requireUser
  (app)/dashboard/                   simple home after login
  (app)/account/                     profile + avatar upload, change password, linked accounts, sessions
  (app)/admin/+layout.server.ts      requirePermission('admin.access')
  (app)/admin/+layout.svelte         shadcn sidebar layout
  (app)/admin/users/                 list, search, create (invite), assign roles, disable/enable, revoke sessions
  (app)/admin/roles/                 list, create, edit, delete (non-system)
  (app)/admin/roles/[id]/            permission checklist grouped by prefix (user.*, role.*)
  docs/                              Scalar
  api/v1/[...path]/+server.ts        Hono
```

- `design/` route: the design-system showcase (§13a). It is open in dev and requires the `design.read` permission in production.
- Admin "create user" (needs `user.create`) inserts the user with the chosen roles. If email/password is enabled, it emails a set-password link using the reset-password flow. Otherwise the user signs in through OIDC/Google with that email, and the account is linked.
- Admin mutations use SvelteKit form actions (progressive enhancement), not the public API.
- Sidebar items are filtered with `can()`.
- Theming: shadcn CSS variables in `src/lib/styles/app.css`. Brand colors are changed in one place. A light/dark/system toggle comes from `mode-watcher`.

## 13a. Component structure and design showcase

### Folder structure (decided by user: separate ui / foundation / layouts, split pages into components)

```
src/lib/components/
  foundation/    design primitives built directly on tokens
                 Heading, Text, Muted, Code, Icon (lucide wrapper), Logo,
                 ThemeToggle, VisuallyHidden
  ui/            shadcn-svelte components, generated by the CLI (components.json points here)
                 button, dialog, sonner, input, table, ... Edited only to change tokens, not structure
  shared/        composed from ui + foundation, used in 2+ places
                 DataTable, ConfirmDialog, FormField, EmptyState, PageHeader, Pagination
  layouts/       page shells
                 AppSidebar, AdminShell, MarketingNavbar, MarketingFooter, AuthCard
src/lib/styles/
  app.css        Tailwind v4 entry, @theme tokens (colors, radius, fonts, shadows), light/dark variables
```

Import rule (enforced by convention + README):
`foundation` → nothing; `ui` → `foundation`; `shared` → `ui`, `foundation`; `layouts` → all three; routes → anything.

### Page-level components

- A component used by only one page lives next to it in a `components/` folder inside that route, for example `src/routes/(app)/admin/users/components/UserTable.svelte` or `UserFilters.svelte`. SvelteKit ignores files without the `+` prefix as routes.
- `+page.svelte` stays short: it reads `data`, composes the page components, and wires form actions.
- Once a second page needs the component, it moves to `$lib/components/shared/`.

### Fonts and typography

- Fonts are self-hosted with `@fontsource-variable/*` (default Inter + JetBrains Mono, swappable). There are no requests to Google Fonts, which keeps CSP strict and avoids leaking visitor IPs.
- `--font-sans`, `--font-mono`, and the type scale are defined in `@theme`. `Heading`/`Text` map `level`/`size` props to that scale, so pages never hand-pick font sizes.

### Showcase route `/design` (user asked for an in-app endpoint)

- `/design`: overview and index.
- `/design/foundation/{colors,typography,spacing,radius,shadows,icons,motion}`: renders the actual tokens from CSS variables, so the page always matches the theme.
- `/design/components/{button,input,dialog,sonner,table,data-table,...}`: each page shows variants, sizes, states (disabled, loading, error), and a copyable usage snippet.
- Each showcase page is one file under `src/routes/design/components/<name>/+page.svelte`. The sidebar is built with `import.meta.glob` over those folders, so adding a demo means adding one file, with no registry to update.
- A light/dark toggle on every page.
- Access: open in dev, `design.read` permission in production (added to the permission list in §7).
- Claude's call to not use Storybook: an in-app route has no extra tooling and uses the real theme and layout. Storybook's advantages (isolated rendering, controls, a11y addon) can be added later if a project needs them.

## 13b. Motion (user asked for professional animation on every component)

No animation library. All of these are Claude's call:

| Layer | Tool | Used for |
|---|---|---|
| Tokens | CSS vars in `@theme`: `--duration-fast` 120ms, `--duration-base` 200ms, `--duration-slow` 320ms, `--ease-out` `cubic-bezier(0.22,1,0.36,1)`, `--ease-in` `cubic-bezier(0.4,0,1,1)`, `--ease-in-out` `cubic-bezier(0.65,0,0.35,1)` | everything below references these, never raw values |
| Enter/exit | `tw-animate-css` (ships with shadcn-svelte) + bits-ui `data-state` | dialog (fade + scale .96→1), sheet (slide from edge), dropdown/popover/select (scale from `--bits-*-transform-origin`), tooltip |
| Interaction | Tailwind | button press `scale-[.97]`, hover, focus ring |
| Lists / layout | `svelte/transition`, `svelte/animate` (`flip`), `Spring` from `svelte/motion` | table rows, tab indicator slide, accordion height, toast stack (svelte-sonner) |
| Page change | View Transitions API via SvelteKit `onNavigate` | crossfade of the admin content area (sidebar stays) |
| Landing | `use:reveal` action (IntersectionObserver + CSS) | fade/slide-up on scroll, once |
| Skeleton | CSS shimmer | loading states |

Principles (written in README and shown on `/design/foundation/motion`):
- UI motion is 120–320ms. Exit is faster than enter. There is no bounce or overshoot in admin UI.
- Only `transform` and `opacity` are animated. Accordion uses the bits-ui height variable.
- `prefers-reduced-motion: reduce` sets all durations to ~0 globally in `app.css`, and `reveal`/view transitions are skipped.
- Every showcase page in `/design` demonstrates the component's motion live.
- Implementation order: tokens + 3–4 components first, then the user reviews the feel in `/design` before it is applied to every component.
- `motion` (JS) may be added later, for the landing page only, if a project needs gesture- or scroll-driven effects.

## 13c. i18n (user asked for it)

- Locale in the URL (decided by user, option A): the default locale `id` has no prefix (`/admin`), other locales do (`/en/admin`). Language switcher keeps the current path. `hreflang` alternates on public pages.
- Starting locales: `id` (default) and `en`.
- Translations split per domain (decided by user), the same file names in every locale:

```
src/lib/i18n/
  locales/
    id/  common.json  landing_page.json  auth.json  admin.json  account.json  validation.json  email.json
    en/  (same files)
  index.ts            t(), current locale, list of locales, localized href helper
```

- Keys are namespaced by file: `t('landing_page.hero.title')`. Keys are typed so a typo fails `check`.
- A unit test fails when a key exists in `id` but not in another locale.
- Library is left to the builder: Paraglide JS if it can load one file per domain, otherwise a small loader over `import.meta.glob`. Either way the file layout above is fixed.
- Emails render in the recipient's locale (stored on the user, default `id`).

## 14. Reusable pieces

- `config.ts`: typed, validated env.
- `guard.ts`: `requireUser`, `requirePermission`.
- `can()` and the `Permission` type.
- Hono `requireAuth` and `requirePermission` middleware, plus a shared error handler.
- `backendFetch`.
- `sendEmail` with Svelte templates.
- `paginate()` helper for Drizzle list queries (limit/offset + total), used by admin lists and the API.
- The component layers in §13a. `shared/DataTable` supports pagination and search via URL params.

## 15. Testing

Layout (decided by user): every test lives under a root `tests/` folder, never next to source.

```
tests/
  unit/           no DB, no network; mirrors the src path (tests/unit/server/core/config.test.ts)
  integration/    real test DB (`app_test`); global-setup.ts migrates it first
  e2e/            Playwright against the built app
```

Vitest has two projects, `unit` and `integration` (`bun run test:unit`, `bun run test:integration`). Service tests from §9a are integration tests.

- Vitest:
  - `can()`, including `super_admin`
  - config validation (no method enabled, missing credentials)
  - lock-out guards
  - seed idempotency (run twice, same result), against a test DB
- Playwright:
  - email login
  - register disabled → no link and the route returns 404
  - OIDC-only config → login page shows only the SSO button
  - non-admin gets 403 on `/admin`
- Vitest for the SSO decision in §6.1: active user → allow + link; disabled → reject; unknown + signup off → reject; unknown + signup on → create; wrong domain → reject; unverified email → reject. The decision is written as a pure function so it can be tested without an IdP.

## 15a. Security tests (user asked for them)

These live in `tests/security/` and run in CI on every PR:

- **Authorization matrix.** Every Hono route declares its required permission in route metadata. A test walks the generated OpenAPI spec and, for every operation, asserts: anonymous → 401, user without the permission → 403, user with it → not 401/403. A new route without declared metadata fails the test, so a route cannot ship unguarded by accident.
- **Admin pages and actions.** The same matrix applies to `/admin/**` loads and form actions (anonymous → redirect, no `admin.access` → 403).
- **IDOR.** A user cannot read or update another user's resources through `/api/v1/me` / account actions.
- **CSRF.** A cross-origin form POST is rejected. A JSON API call from a non-allowed `Origin` gets no CORS grant.
- **Rate limit.** Repeated failed logins → 429.
- **Session cookie.** Flags `HttpOnly`, `SameSite=Lax`, and `Secure` (prod build) are present.
- **Security headers and CSP** are present on HTML responses.
- **Upload validation.** Wrong MIME type, spoofed extension, and oversized files are rejected.
- **No secret in the client bundle.** After `build`, scan `build/client` for the values and names of every private env var.
- **SSO decision matrix** (§15) and **lock-out guards**.
- **Enumeration.** Login and forgot-password return the same response for existing and unknown emails.

## 15b. CI/CD (GitHub Actions, confirmed by user)

`.github/workflows/ci.yml` runs on PR and push to `main`:

| Job | Steps |
|---|---|
| `quality` | `bun install --frozen-lockfile` (cached), `lint` (ESLint + Prettier check), `check` (svelte-check / tsc) |
| `test` | Postgres service container, `db:migrate`, `db:seed`, Vitest unit + security tests |
| `migrations` | `drizzle-kit check` and `drizzle-kit generate` must produce no new files (schema and migrations are in sync) |
| `build` | `bun run build`, client-bundle secret scan |
| `e2e` | Postgres + Mailpit services, Playwright against the built app |
| `commits` | on PRs: commitlint checks every commit message and the PR title |

`.github/workflows/security.yml` runs on PR, push to `main`, and weekly:

| Job | Tool |
|---|---|
| Dependency audit | `bun audit` (fails on high/critical) |
| Secret scan | gitleaks |
| SAST | CodeQL (JavaScript/TypeScript) |
| Container scan | Trivy on the production Docker image |
| DAST (weekly + manual) | OWASP ZAP baseline scan against the app started in CI |

Other repo files:
- `.github/dependabot.yml` for npm and GitHub Actions updates, grouped weekly.
- `.github/pull_request_template.md` with a checklist (tests, migration, docs, breaking change?).
- `SECURITY.md` explaining how to report a vulnerability.

`.github/workflows/release.yml`: **release-please** on push to `main`. It reads conventional commits, opens or updates a release PR with the version bump and `CHANGELOG.md`. Merging that PR creates the git tag and GitHub release, then builds and pushes the Docker image tagged with the version.

## 15c. Commit SOP and semantic versioning

- **Lefthook** for git hooks (single binary, fast with Bun):
  - `commit-msg`: commitlint with `@commitlint/config-conventional`
  - `pre-commit`: Prettier + ESLint on staged files
- `docs/contributing/commit-convention.md`, the SOP:
  - Format `<type>(<scope>)!: <subject>`, plus body and footer.
  - Allowed types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert`, `style`.
  - Scopes = module or area names (`auth`, `rbac`, `users`, `api`, `ui`, `design`, `db`, `deps`, `ci`).
  - Rules: imperative mood, ≤ 72 characters, one logical change per commit, reference issues in the footer (`Refs #12`).
  - Good and bad examples.
  - Branch naming: `feat/<short-name>`, `fix/<short-name>`.
  - PR flow: squash merge, PR title must itself be a conventional commit.
- `docs/contributing/versioning.md`, the semver guide:
  - `MAJOR.MINOR.PATCH`. `fix`/`perf` → PATCH. `feat` → MINOR. `!` or a `BREAKING CHANGE:` footer → MAJOR. Other types → no release.
  - What counts as **breaking** in this project: removing or renaming an env var, a migration that needs manual steps or drops data, any incompatible change to `/api/v1` (that means a new `/api/v2` instead), removing or renaming a permission key, changing a public component's props.
  - `0.x` phase: breaking changes bump MINOR until `1.0.0`.
  - Pre-releases (`1.2.0-rc.1`), and how release-please produces the changelog and tags.
  - Worked examples: commit list → resulting version.

## 15d. Reference documentation (user asked for docs as the reference)

`docs/` in Markdown, in the repo, versioned with the code:

```
docs/
  README.md                     index
  getting-started.md            setup in §17, troubleshooting
  architecture.md               layers, request flow, folder map (§9a, §13a)
  guides/
    add-a-module.md             step-by-step recipe: table → migration → schema → repository → service → routes → page → permission → tests
    add-a-permission.md
    add-a-component.md          ui vs foundation vs shared, showcase page, motion tokens
    add-an-email-template.md
    add-a-translation.md
    configure-auth.md           every AUTH_* flag, OIDC/Google setup, SSO access rules (§6.1), IdP restriction tip
    backend-integration.md      backendFetch + JWKS verification example for another backend; bearer usage
  reference/
    env.md                      every env var: purpose, default, required when
    permissions.md              generated from src/lib/permissions.ts by a script, checked in CI
    api.md                      pointer to /docs (Scalar) + error format + pagination format
    i18n.md                     locales, file per domain, key naming
    design-system.md            tokens, component layers, motion principles
  operations/
    deployment.md               Docker image, adapter swap to node, migrations on deploy, S3 in production
    security.md                 what is protected and how (§10), security test suite, reporting
  contributing/
    commit-convention.md        §15c
    versioning.md               §15c
    pull-requests.md
  adr/                          short decision records for the choices in §5 (Better Auth, Hono, Bun adapter, RBAC model, no Storybook, ...)
```

A `CONTRIBUTING.md` at the root links into `docs/contributing/`.

Writing rules (decided by user):
- Bahasa Indonesia, plain and direct, for a developer who has just joined the project. Standard technical terms stay as they are (route, middleware, migration, seed), and there is no forced translation.
- Every docs file is drafted, then run through the `no-ai-slop` skill before it is committed:
  - no filler openings or closings
  - no "mari kita"/"penting untuk dicatat" padding
  - no bullet lists where a sentence works
  - concrete examples over abstract claims
- Each guide starts with what the reader will achieve, then numbered steps with real commands and code from this repo, then "kalau gagal" troubleshooting.
- Docs describe how the project works and how a developer should work in it. They never mention phases, plans, or "coming later" (decided by user). A page for a feature that does not exist yet is not listed; it is added together with the feature.
- Keep pages short. Link to other pages instead of repeating them. The spec files under `docs/superpowers/` are separate design history, not reference docs.

## 16. Left to the builder

- Exact package versions (pin current stable).
- Exact rate-limit numbers.
- shadcn components to install beyond those the pages need.
- Landing page content: a generic placeholder with hero, features, CTA.
- Exact JWT lifetime for `backendFetch` (suggest 5 minutes).

## 17. Setup for a new project (target)

```
cp .env.example .env        # fill in secrets + toggles
docker compose up -d        # postgres
bun install
bun run db:migrate
bun run db:seed
bun run dev
```
