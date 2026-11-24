# sveltekit-starter

Starter SvelteKit 3 di atas Bun, dengan PostgreSQL (Drizzle), Mailpit untuk email dev, dan RustFS untuk object storage dev.

Status: Fase 1 (fondasi). Auth, RBAC, API, dan UI datang di fase berikutnya.

## Mulai cepat

```bash
cp .env.example .env
docker compose up -d
bun install
bun run db:migrate
bun run db:seed
bun run dev
```

Buka `http://localhost:5173`. Cek `http://localhost:5173/healthz`, harusnya `{"status":"ok"}`.

Kalau ada langkah yang gagal, lihat [docs/getting-started.md](docs/getting-started.md).

## Dokumentasi

Semua dokumentasi ada di [docs/](docs/README.md). Mau berkontribusi? Baca [CONTRIBUTING.md](CONTRIBUTING.md).

## Script

| Perintah                                  | Fungsi                                       |
| ----------------------------------------- | -------------------------------------------- |
| `bun run dev`                             | Dev server di port 5173                      |
| `bun run build`                           | Build production ke `build/`, tanpa secret   |
| `bun run start`                           | Jalankan hasil build (port 3000)             |
| `bun run check`                           | `svelte-check`                               |
| `bun run lint` / `bun run format`         | Cek (Prettier + ESLint) / rapikan (Prettier) |
| `bun run db:generate` / `db:migrate`      | Buat / jalankan migration                    |
| `bun run db:seed` / `db:studio`           | Isi data awal / buka Drizzle Studio          |
| `bun run test:unit` / `test:e2e` / `test` | Vitest / Playwright / keduanya               |
