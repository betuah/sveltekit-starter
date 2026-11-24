# Fase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A runnable SvelteKit 3 + Bun skeleton with validated config, the local docker stack, a Drizzle DB with migrate and seed, a health endpoint, commit tooling, CI, a production Dockerfile, and the first Indonesian docs.

**Architecture:** A single SvelteKit app built with `@sveltejs/adapter-bun`. Server-only code lives under `src/lib/server/` (`core/` now, `modules/` from Fase 3). Env is parsed once in `core/config.ts` from `process.env`, so the CLI seed script and the app share it. The local stack (Postgres, RustFS, Mailpit) runs in docker compose. The app runs on the host.

**Tech Stack:** Bun 1.4.x, SvelteKit 3.4.x, Svelte 5, TypeScript 6 (strict), Vite 8, Drizzle ORM 0.45.x + drizzle-kit 0.31.x + postgres-js, Zod, Vitest, Playwright, ESLint + Prettier, Lefthook + commitlint, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-24-sveltekit-starter-design.md`

## Phases (this file is Fase 1)

1. **Foundation** (this plan)
2. Auth: shadcn-svelte base, Better Auth, `.env` toggles, login/register/reset/verify pages, email via Mailpit, SSO decision (§6, §6.1, §11)
3. RBAC + modules: `AppError`/`ctx`/pagination, `roles` + `users` modules, guards, seed steps, admin users/roles pages (§7, §9a)
4. API: Hono mount, OpenAPI, `users`/`me` routes, Scalar `/docs`, bearer + JWT/JWKS + `backendFetch`, authorization-matrix test (§8, §9)
5. UI system: tokens, foundation/shared/layouts, motion, `/design` showcase, landing page (§13, §13a, §13b)
6. Storage: RustFS bucket init, `storage.ts`, `files` module, avatar upload (§11b)
7. Hardening + release: the rest of the security suite, `security.yml`, release-please, Dependabot, remaining docs (§15a–§15d)

Each phase gets its own plan file, written after the previous phase ships, so it builds on the real code.

## Global Constraints

- Runtime Bun ≥ 1.4. Every script runs under Bun (`bun run`, `bun --bun vite`, `bun --bun vitest`).
- SvelteKit 3:
  - config goes in `vite.config.ts` via `sveltekit({...})`, with no `svelte.config.js`
  - imports use `#lib/...` (package.json `imports`) with file extensions, never `$lib`
  - no `$env/*`; app code reads env only through `#lib/server/core/config.ts`
- Adapter: `@sveltejs/adapter-bun`. Build with `bun run --bun build`, run with `bun ./build`.
- TypeScript `strict: true`. No `any` in committed code.
- Database is PostgreSQL. Dev DB is `app`, test DB is `app_test`, both on the compose `postgres` service.
- Migrations output to `drizzle/migrations/`. Seed lives in `src/lib/server/db/seed/`.
- Code, identifiers, and commit messages are in English. Everything under `docs/`, `README.md`, `CONTRIBUTING.md`, and `SECURITY.md` is in **Bahasa Indonesia** and goes through the `no-ai-slop` skill before commit.
- Commits follow Conventional Commits. Scopes for this plan: `repo`, `config`, `db`, `ci`, `docker`, `docs`.
- Pin exact versions in `package.json` (no `^`). Use the current stable release at implementation time.
- No dependency beyond those named in this plan.

## Review Focus

1. **App behind a reverse proxy with `ORIGIN` unset.** Form POSTs fail the CSRF origin check. The Dockerfile and `.env.example` must set or document `ORIGIN`, and `docs/getting-started.md` must say so. Covered in Task 7 and Task 8.
2. **Missing or malformed `DATABASE_URL`.** Startup must fail with one readable line naming the variable, not a stack trace from postgres-js. Covered in the Task 3 tests.
3. **DB down while the app runs.** `/healthz` returns 503 JSON and does not hang past 2 seconds or crash the process. Covered in the Task 4 test with a bogus URL.
4. **Seed run twice, or a seed step failing halfway.** Nothing may be partially written. Covered in the Task 5 rollback test.
5. **`lefthook` hooks in CI or in a clone where `bun install` has not run.** CI must not try to run git hooks (`LEFTHOOK=0`). Commitlint still runs as its own job. Covered in Task 6 and Task 7.

---

### Task 1: Scaffold SvelteKit 3 on Bun

**Files:**
- Create (generated): `package.json`, `vite.config.ts`, `tsconfig.json`, `src/app.html`, `src/app.d.ts`, `src/routes/+page.svelte`, `src/routes/+layout.svelte`, `src/routes/layout.css` (or what the Tailwind add-on generates), `eslint.config.js`, `.prettierrc`, `playwright.config.ts`, `e2e/demo.test.ts`
- Modify: `.gitignore` (add `.env`, `build/`, `test-results/`)

**Interfaces:**
- Produces: `bun run dev`, `bun run build`, `bun run preview`, `bun run check`, `bun run lint`, `bun run format`, `bun run test:unit`, `bun run test:e2e` scripts. `#lib/*` resolves to `src/lib/*`.

- [ ] **Step 1: Generate the project in the repo root**

Run (keep the existing `docs/` folder):
```bash
bunx sv@latest create --template minimal --types ts \
  --add prettier eslint vitest="usages:unit" playwright tailwindcss="plugins:none" sveltekit-adapter="adapter:bun" \
  --install bun .
```
Expected: the command finishes without errors and `package.json` lists `@sveltejs/kit` at 3.x and `@sveltejs/adapter-bun`. If the CLI refuses a non-empty directory, generate it into a temp folder and move the files in, leaving `docs/` untouched.

- [ ] **Step 2: Make every script run under Bun**

In `package.json` scripts, prefix the Vite and Vitest binaries with `bun --bun` (`"dev": "bun --bun vite dev"`, `"build": "bun --bun vite build"`, `"test:unit": "bun --bun vitest"`). Add `"start": "bun ./build"`. Remove `^`/`~` from every version.

- [ ] **Step 3: Verify build and production start**

Run: `bun run build && PORT=4173 bun ./build & sleep 2; curl -s -o /dev/null -w '%{http_code}' http://localhost:4173/; kill %1`
Expected: `200`

- [ ] **Step 4: Verify check, lint, and the generated tests**

Run: `bun run check && bun run lint && bun run test:unit -- --run`
Expected: 0 errors, and the generated demo test passes.

- [ ] **Step 5: Init git and commit**

```bash
git init -b main
git add -A
git commit -m "build(repo): scaffold SvelteKit 3 app on Bun adapter"
```

---

### Task 2: Local docker stack

**Files:**
- Create: `docker-compose.yml`, `docker/postgres/init/01-create-test-db.sql`, `.env.example`

**Interfaces:**
- Produces services: `postgres` on 5432 (user `app`, password `app`, DBs `app` and `app_test`), `rustfs` on 9000 (S3) and 9001 (console), `mailpit` on 1025 (SMTP) and 8025 (UI). All have healthchecks and named volumes.
- `.env.example` keys added in this task: `DATABASE_URL=postgres://app:app@localhost:5432/app`, `TEST_DATABASE_URL=postgres://app:app@localhost:5432/app_test`, `S3_ENDPOINT=http://localhost:9000`, `S3_ACCESS_KEY_ID=devaccesskey`, `S3_SECRET_ACCESS_KEY=devsecretkey`, `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `ORIGIN=http://localhost:5173`

- [ ] **Step 1: Write `docker-compose.yml`**

- `postgres`: image `postgres:18-alpine`, init SQL `CREATE DATABASE app_test;`, healthcheck `pg_isready -U app`.
- `rustfs`: image `rustfs/rustfs` pinned to the current release tag. Env: `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` from `${S3_ACCESS_KEY_ID}` / `${S3_SECRET_ACCESS_KEY}` (never the default `rustfsadmin`), `RUSTFS_CONSOLE_ENABLE=true`, `RUSTFS_CONSOLE_ADDRESS=0.0.0.0:9001`. Healthcheck is an HTTP probe on 9000.
- `mailpit`: image `axllent/mailpit` pinned. Healthcheck is the built-in `/livez` or `mailpit readyz`.

Bucket creation is **not** in this task. It belongs to Fase 6.

- [ ] **Step 2: Verify all services become healthy**

Run: `cp .env.example .env && docker compose up -d --wait && docker compose ps --format '{{.Service}} {{.Health}}'`
Expected: three lines, each `healthy`.

- [ ] **Step 3: Verify the test DB exists**

Run: `docker compose exec postgres psql -U app -lqt | cut -d'|' -f1 | grep -w app_test`
Expected: `app_test`

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker/ .env.example
git commit -m "build(docker): add local postgres, rustfs and mailpit stack"
```

---

### Task 3: Validated config

**Files:**
- Create: `src/lib/server/core/config.ts`
- Test: `src/lib/server/core/config.test.ts`

**Interfaces:**
- Produces:
  - `parseConfig(env: Record<string, string | undefined>): Config`. It throws `ConfigError` whose `message` is a single line listing each bad key, e.g. `Invalid environment: DATABASE_URL (Required)`.
  - `type Config = { nodeEnv: 'development' | 'test' | 'production'; databaseUrl: string }`
  - `export const config: Config = parseConfig(process.env)`
  - `class ConfigError extends Error`
- Later plans add keys to the same Zod schema and the same `Config` type.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { ConfigError, parseConfig } from './config.ts';

describe('parseConfig', () => {
  it('parses a valid env', () => {
    expect(parseConfig({ NODE_ENV: 'test', DATABASE_URL: 'postgres://a:b@h:5432/d' }))
      .toEqual({ nodeEnv: 'test', databaseUrl: 'postgres://a:b@h:5432/d' });
  });
  it('defaults NODE_ENV to development', () => {
    expect(parseConfig({ DATABASE_URL: 'postgres://a:b@h/d' }).nodeEnv).toBe('development');
  });
  it('names the missing key in one line', () => {
    expect(() => parseConfig({})).toThrow(ConfigError);
    expect(() => parseConfig({})).toThrow(/^Invalid environment: DATABASE_URL/);
  });
  it('rejects a non-postgres URL', () => {
    expect(() => parseConfig({ DATABASE_URL: 'mysql://x' })).toThrow(/DATABASE_URL/);
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `bun run test:unit -- --run src/lib/server/core/config.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `parseConfig` with a Zod schema in `config.ts`**

Use `z.object` on raw env names: `DATABASE_URL` must be a URL whose protocol is `postgres:` or `postgresql:`, and `NODE_ENV` is an enum with default `development`. Map to camelCase. On failure, join `issue.path[0] (issue.message)` with `, `. `bun add zod` (pin the version).

- [ ] **Step 4: Run the tests and see them pass**

Run: `bun run test:unit -- --run src/lib/server/core/config.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/core/config.ts src/lib/server/core/config.test.ts package.json bun.lock
git commit -m "feat(config): parse and validate env once at startup"
```

---

### Task 4: Drizzle DB core and health endpoint

**Files:**
- Create: `src/lib/server/core/db.ts`, `drizzle.config.ts`, `src/routes/healthz/+server.ts`, `drizzle/migrations/` (generated), `tests/setup/global-setup.ts`
- Modify: `vite.config.ts` (Vitest `globalSetup`), `package.json` scripts
- Test: `src/lib/server/core/db.test.ts`

**Interfaces:**
- Consumes: `config` from Task 3.
- Produces:
  - `createDb(url: string): { db: Db; close(): Promise<void> }`
  - `export const db: Db` (built from `config.databaseUrl`)
  - `type Db = PostgresJsDatabase<typeof schema>`
  - `type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]`
  - `type Executor = Db | Tx`
  - `export const schema = {}` (an empty object for now; later plans spread table modules into it)
  - `checkDb(executor: Executor, timeoutMs = 2000): Promise<boolean>`
  - `GET /healthz` → `200 {"status":"ok"}` or `503 {"status":"error","db":"down"}`
  - Scripts: `db:generate`, `db:migrate`, `db:studio`
- `drizzle.config.ts`: `dialect: 'postgresql'`, `out: './drizzle/migrations'`, `schema: ['./src/lib/server/core/*.table.ts', './src/lib/server/modules/*/*.table.ts']`, `dbCredentials.url` from `process.env.DATABASE_URL`.
- `tests/setup/global-setup.ts` runs `migrate()` from `drizzle-orm/postgres-js/migrator` against `TEST_DATABASE_URL` before any test.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { checkDb, createDb } from '#lib/server/core/db.ts';

describe('checkDb', () => {
  it('is true for the test database', async () => {
    const { db, close } = createDb(process.env.TEST_DATABASE_URL!);
    expect(await checkDb(db)).toBe(true);
    await close();
  });
  it('is false within the timeout for an unreachable database', async () => {
    const { db, close } = createDb('postgres://x:y@127.0.0.1:1/none');
    const start = Date.now();
    expect(await checkDb(db, 500)).toBe(false);
    expect(Date.now() - start).toBeLessThan(1500);
    await close();
  });
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `bun run test:unit -- --run src/lib/server/core/db.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `db.ts`, `drizzle.config.ts`, and the `/healthz` route**

`bun add drizzle-orm postgres` and `bun add -d drizzle-kit`. `checkDb` races `executor.execute(sql\`select 1\`)` against a timeout and returns `false` on either rejection or timeout. In `createDb`, create the postgres-js client with `connect_timeout: 2` so the bogus-URL test cannot hang. The `/healthz` handler calls `checkDb(db)` and returns `Response.json(...)` with status 200 or 503. Add `globalSetup: ['tests/setup/global-setup.ts']` and `env` loading of `.env` to the Vitest config.

- [ ] **Step 4: Run the test and see it pass**

Run: `bun run test:unit -- --run src/lib/server/core/db.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Verify migrate works with no tables yet, and verify the endpoint**

Run: `bun run db:generate && bun run db:migrate && bun run build && bun ./build & sleep 2; curl -s localhost:3000/healthz; kill %1`
Expected: drizzle-kit reports nothing to generate or migrate without error, and curl prints `{"status":"ok"}`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): add drizzle postgres client, migrations config and /healthz"
```

---

### Task 5: Seed runner

**Files:**
- Create: `src/lib/server/db/seed/runner.ts`, `src/lib/server/db/seed/index.ts`
- Modify: `package.json` (script `db:seed`)
- Test: `src/lib/server/db/seed/runner.test.ts`

**Interfaces:**
- Consumes: `createDb`, `Db`, `Executor` from Task 4.
- Produces:
  - `type SeedStep = { name: string; run(tx: Executor): Promise<void> }`
  - `runSeed(db: Db, steps: SeedStep[], log?: (msg: string) => void): Promise<void>`. All steps run in **one** transaction, logging `seed: <name>` before each step and rethrowing the first error after rollback.
  - `index.ts` imports `config` and `createDb`, then runs `runSeed(db, steps)` with `const steps: SeedStep[] = []`. Fase 3 fills in the list. It exits with code 1 and a one-line message on error, and closes the DB connection either way.
  - Script: `"db:seed": "bun src/lib/server/db/seed/index.ts"`

- [ ] **Step 1: Write the failing tests**

These use a temporary table created in the test (`create table if not exists seed_probe (k text primary key)`), dropped in `afterAll`.

```ts
it('runs steps in order inside one transaction', async () => {
  const calls: string[] = [];
  await runSeed(db, [
    { name: 'a', run: async (tx) => { calls.push('a'); await tx.execute(sql`insert into seed_probe values ('a') on conflict do nothing`); } },
    { name: 'b', run: async () => { calls.push('b'); } },
  ], () => {});
  expect(calls).toEqual(['a', 'b']);
});

it('rolls back everything when a step fails', async () => {
  await expect(runSeed(db, [
    { name: 'write', run: (tx) => tx.execute(sql`insert into seed_probe values ('rollback-me')`).then(() => {}) },
    { name: 'boom', run: async () => { throw new Error('boom'); } },
  ], () => {})).rejects.toThrow('boom');
  const rows = await db.execute(sql`select k from seed_probe where k = 'rollback-me'`);
  expect(rows.length).toBe(0);
});

it('is safe to run twice', async () => {
  const step = { name: 'upsert', run: (tx: Executor) => tx.execute(sql`insert into seed_probe values ('x') on conflict do nothing`).then(() => {}) };
  await runSeed(db, [step], () => {});
  await runSeed(db, [step], () => {});
  const rows = await db.execute(sql`select k from seed_probe where k = 'x'`);
  expect(rows.length).toBe(1);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `bun run test:unit -- --run src/lib/server/db/seed`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `runSeed` in `runner.ts` and the CLI entry in `index.ts`**

- [ ] **Step 4: Run the tests and see them pass**

Run: `bun run test:unit -- --run src/lib/server/db/seed`
Expected: 3 passed.

- [ ] **Step 5: Verify the CLI**

Run: `bun run db:seed; echo "exit=$?"`
Expected: `exit=0`. Then run `DATABASE_URL= bun run db:seed; echo "exit=$?"`. Expected: one line `Invalid environment: DATABASE_URL (...)` and `exit=1`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): add transactional idempotent seed runner"
```

---

### Task 6: Commit tooling (Lefthook + commitlint)

**Files:**
- Create: `lefthook.yml`, `commitlint.config.js`
- Modify: `package.json` (devDeps `lefthook`, `@commitlint/cli`, `@commitlint/config-conventional`; script `"prepare": "lefthook install || true"`)

**Interfaces:**
- Produces:
  - `commit-msg` hook: `bunx commitlint --edit {1}`
  - `pre-commit` hook: `bunx prettier --check {staged_files}` and `bunx eslint {staged_files}`, filtered to `*.{ts,js,svelte,json,md,css}`
  - commitlint `extends: ['@commitlint/config-conventional']` with `scope-enum` warning level listing `repo, config, db, ci, docker, docs, deps, auth, rbac, users, roles, api, ui, design, storage, email, security`, and `header-max-length` 72
- Lefthook does nothing when `LEFTHOOK=0` (built in). CI relies on that.

- [ ] **Step 1: Configure and install**

Run: `bun add -d lefthook @commitlint/cli @commitlint/config-conventional && bunx lefthook install`

- [ ] **Step 2: Verify a bad message is rejected**

Run: `git commit --allow-empty -m "update stuff"; echo "exit=$?"`
Expected: commitlint errors on `type-empty`/`subject-empty`, and `exit=1`.

- [ ] **Step 3: Verify a good message passes, then commit the tooling with it**

```bash
git add lefthook.yml commitlint.config.js package.json bun.lock
git commit -m "build(repo): enforce conventional commits with lefthook and commitlint"
```
Expected: the hooks run and the commit succeeds.

---

### Task 7: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/pull_request_template.md`
- Modify: `e2e/demo.test.ts` → rename to `e2e/smoke.test.ts`

**Interfaces:**
- Consumes: the scripts from Tasks 1, 4, and 5.
- Produces: workflow `ci` on `pull_request` and `push: branches [main]`, with `env: LEFTHOOK: 0`, `concurrency` cancel-in-progress per ref, and `permissions: contents: read`. Jobs:
  - `quality`: `oven-sh/setup-bun` (pinned to `bun-version-file` or `1.4.x`), cache `~/.bun/install/cache` keyed on `bun.lock`, `bun install --frozen-lockfile`, `bun run lint`, `bun run check`
  - `test`: `postgres:18-alpine` service (DBs `app` + `app_test` via `POSTGRES_DB=app` and a step running `createdb app_test`), env `DATABASE_URL` / `TEST_DATABASE_URL`, `bun run db:migrate`, `bun run db:seed`, `bun run test:unit -- --run`
  - `migrations`: postgres service, `bunx drizzle-kit check`, then `bun run db:generate` and `git diff --exit-code drizzle/` (fails if the schema changed without a migration)
  - `build`: `bun run build`, upload `build/` as an artifact
  - `e2e`: needs `build`, postgres service, `bunx playwright install --with-deps chromium`, `bun run test:e2e`
  - `commits` (PR only): `wagoid/commitlint-github-action` pinned **or** `bunx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }}`. Also lint the PR title with `amannn/action-semantic-pull-request` pinned.
- Pin every third-party action to a full commit SHA, with the version in a trailing comment.

- [ ] **Step 1: Write the smoke e2e test**

```ts
import { expect, test } from '@playwright/test';
test('home renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
});
test('healthz is ok', async ({ request }) => {
  const res = await request.get('/healthz');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: 'ok' });
});
```
Run it: `bun run test:e2e`. Expected: 2 passed. Configure `playwright.config.ts` `webServer` to run `bun run build && bun ./build` on port 4173 with `DATABASE_URL` passed through.

- [ ] **Step 2: Write `ci.yml` and the PR template**

The PR template is in Indonesian and has these checkboxes:
- Test ditambah/diupdate
- Migration dibuat (kalau schema berubah)
- Docs diupdate
- Ada breaking change? (kalau ya, judul PR pakai `!`)

- [ ] **Step 3: Lint the workflow**

Run: `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -color`
Expected: no output, exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "ci: add quality, test, migrations, build, e2e and commit lint jobs"
```

After the repo is pushed to GitHub, open a throwaway PR and confirm all jobs are green. Report the result to the user. Pushing needs the user's go-ahead.

---

### Task 8: Production Dockerfile

**Files:**
- Create: `Dockerfile`, `.dockerignore`

**Interfaces:**
- Produces image `sveltekit-starter:local`:
  - multi-stage on `oven/bun:1.4-alpine`
  - stage `deps` (`bun install --frozen-lockfile`)
  - stage `build` (`bun run build`)
  - stage `runtime`: copies `build/`, `package.json`, `bun.lock`, runs `bun install --production --frozen-lockfile`, and copies `drizzle/` for migrations
  - runs as the non-root `bun` user, `EXPOSE 3000`, `ENV NODE_ENV=production`
  - `HEALTHCHECK` with `wget -qO- localhost:3000/healthz`
  - `CMD ["bun", "./build"]`
  - `ORIGIN` is required at runtime and documented in a comment and in `.env.example`
- `.dockerignore`: `node_modules`, `build`, `.svelte-kit`, `.env*` (except `.env.example`), `.git`, `docs`, `e2e`, `test-results`

- [ ] **Step 1: Build and run against the compose DB**

Run:
```bash
docker build -t sveltekit-starter:local . && \
docker run --rm -d --name sk -p 3000:3000 --network host \
  -e DATABASE_URL=postgres://app:app@localhost:5432/app -e ORIGIN=http://localhost:3000 sveltekit-starter:local && \
sleep 3 && curl -s localhost:3000/healthz; docker exec sk id -un; docker stop sk
```
Expected: `{"status":"ok"}` then `bun`. On macOS, if `--network host` is unavailable, use `host.docker.internal` in `DATABASE_URL` instead.

- [ ] **Step 2: Commit**

```bash
git add Dockerfile .dockerignore .env.example
git commit -m "build(docker): add multi-stage production image running as non-root"
```

---

### Task 9: First docs (Bahasa Indonesia)

**Files:**
- Create:
  - `README.md`, `CONTRIBUTING.md`
  - `docs/README.md`, `docs/getting-started.md`, `docs/reference/env.md`
  - `docs/contributing/commit-convention.md`, `docs/contributing/versioning.md`, `docs/contributing/pull-requests.md`
  - `docs/adr/0001-sveltekit-3-on-bun.md`

**Interfaces:**
- Consumes: the scripts, env keys, and services from Tasks 1–8. Docs must name them exactly.
- Content requirements:
  - `getting-started.md`: the §17 setup commands in that order, the service URLs (Mailpit UI `http://localhost:8025`, RustFS console `http://localhost:9001`), what `/healthz` is for, and a "kalau gagal" section covering: port 5432 already taken, `docker compose up` unhealthy, `Invalid environment: ...` on start, form POST rejected behind a proxy (`ORIGIN`).
  - `reference/env.md`: a table of every key in `.env.example` with purpose, default, and "wajib kapan".
  - `commit-convention.md` and `versioning.md`: the full §15c content, including the list of what counts as breaking and the worked commit-list → version examples (at least `fix`+`docs` → PATCH, `feat`+`fix` → MINOR, `feat!` → MAJOR, `0.x` with `feat!` → MINOR).
  - `pull-requests.md`: squash merge, the PR title is a conventional commit, the template checklist.
  - ADR 0001: context (SvelteKit 3, official adapter-bun, community adapter archived), the decision, and consequences (Bun ≥ 1.4, `bun --bun`, swap to adapter-node is one line in `vite.config.ts`).
  - The `docs/README.md` index links every file, including those marked "(menyusul di Fase N)" for files that do not exist yet. Mark them as text, not dead links.

- [ ] **Step 1: Draft all files following the writing rules in spec §15d**

- [ ] **Step 2: Run the `no-ai-slop` skill on every file and apply its edits**

- [ ] **Step 3: Verify the commands in `getting-started.md` work verbatim from a clean state**

Run: `docker compose down -v`, then execute each command block from `docs/getting-started.md` in order.
Expected: the app serves `/healthz` → ok at the end.

- [ ] **Step 4: Verify there are no dead relative links**

Run: `grep -rhoE '\]\((\.\.?/)?[^)#:]+\.md' README.md CONTRIBUTING.md docs | sed -E 's/.*\(//' | sort -u`, and check each path exists relative to its file. Or use `bunx markdown-link-check` once, without adding it as a dependency.
Expected: every linked file exists.

- [ ] **Step 5: Commit**

```bash
git add README.md CONTRIBUTING.md docs/README.md docs/getting-started.md docs/reference docs/contributing docs/adr
git commit -m "docs: add getting started, env reference, commit and versioning SOP"
```
