# Getting started

Di akhir halaman ini aplikasi jalan di `http://localhost:5173` dan `/healthz` menjawab `ok`.

Kamu butuh [Bun](https://bun.sh) 1.4 atau lebih baru dan Docker dengan Compose v2. Bun wajib. Node.js 22 atau lebih baru disarankan untuk tooling (`check`, `lint`, `db:generate`, `db:studio`) dan e2e (Playwright), karena binary-nya memakai shebang node.

## Langkah

1. Salin env. Ini selalu langkah pertama, karena `docker compose` (termasuk `down` dan `logs`) gagal kalau `.env` tidak ada:

   ```bash
   cp .env.example .env
   ```

2. Nyalakan PostgreSQL, RustFS, dan Mailpit:

   ```bash
   docker compose up -d
   ```

3. Install dependency, jalankan migration, isi seed:

   ```bash
   bun install
   bun run db:migrate
   bun run db:seed
   ```

4. Jalankan dev server:

   ```bash
   bun run dev
   ```

5. Cek `http://localhost:5173/healthz`. Jawabannya `200 {"status":"ok"}`. Kalau database mati, jawabannya `503`. Endpoint ini juga dipakai `HEALTHCHECK` di Dockerfile.

## Service lokal

| Service | URL / port                                          |
| ------- | --------------------------------------------------- |
| App     | `http://localhost:5173`                             |
| Mailpit | UI `http://localhost:8025`, SMTP `localhost:1025`   |
| RustFS  | S3 `http://localhost:9000`, console `http://localhost:9001` |
| Postgres | `localhost:5432`, database `app` dan `app_test`    |

Login console RustFS memakai `S3_ACCESS_KEY_ID` dan `S3_SECRET_ACCESS_KEY` dari `.env`. Daftar semua variabel ada di [reference/env.md](reference/env.md).

## Test

`bun run test:unit -- --run` memakai database `app_test` lewat `TEST_DATABASE_URL`. `bun run test:e2e` menjalankan Playwright.

## Kalau gagal

### Port 5432 sudah dipakai

Ada Postgres lain di mesinmu, misalnya container dari proyek lain. Gejalanya: `docker compose up` bilang `port is already allocated`, atau migration jalan ke database yang salah. Cek siapa yang memakai port:

```bash
lsof -i :5432
docker ps --filter publish=5432
```

Ada dua jalan keluar. Hentikan container lain itu (`docker stop <nama>`), atau ganti port di `docker-compose.yml` dan `DATABASE_URL` / `TEST_DATABASE_URL` di `.env`:

```yaml
ports:
  - '127.0.0.1:5433:5432'
```

```env
DATABASE_URL=postgres://app:app@localhost:5433/app
TEST_DATABASE_URL=postgres://app:app@localhost:5433/app_test
```

### `docker compose` bilang variabel tidak di-set

Pesan seperti `set S3_ACCESS_KEY_ID in .env` berarti `.env` belum ada. Jalankan langkah 1.

### `docker compose up` unhealthy

Lihat container mana yang bermasalah dan lognya:

```bash
docker compose ps
docker compose logs postgres
```

Database `app_test` hanya dibuat saat volume Postgres pertama kali diinisialisasi (lewat `docker/postgres/init/`). Kalau volume lamamu dibuat sebelum itu, test gagal karena `app_test` tidak ada. Pilih satu:

```bash
# hapus volume, SEMUA data lokal hilang, lalu buat ulang
docker compose down -v
docker compose up -d

# atau buat database-nya saja
docker compose exec postgres createdb -U app app_test
```

### `Invalid environment: ...` saat start

Server memvalidasi env waktu start (hook `init`) dan menolak jalan kalau ada yang salah, misalnya `Invalid environment: DATABASE_URL (Invalid URL)`. Periksa `.env` terhadap [reference/env.md](reference/env.md). `bun run build` tidak butuh secret apa pun, hanya `bun run start` yang memvalidasi.

### Form POST ditolak (403) di production atau di belakang proxy

SvelteKit selalu memeriksa asal request untuk form POST. Kalau `ORIGIN` tidak cocok dengan URL yang dipakai browser, setiap POST ditolak. Set `ORIGIN` ke URL publik, misalnya `ORIGIN=https://app.example.com`. Alternatifnya, di belakang proxy yang tepercaya, set `PROTOCOL_HEADER` dan `HOST_HEADER` (mis. `x-forwarded-proto`, `x-forwarded-host`) supaya adapter membaca URL dari header itu.
