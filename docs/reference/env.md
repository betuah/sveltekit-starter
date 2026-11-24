# Referensi env

Semua key di `.env.example`. Aplikasi membaca env hanya lewat `src/lib/server/core/config.ts`, dan memvalidasinya saat start dengan Zod. Saat ini hanya `DATABASE_URL` dan `NODE_ENV` yang divalidasi di sana. Key S3 dan SMTP dipakai service lokal dan akan dibaca kode di fase berikutnya.

| Key | Fungsi | Default | Wajib kapan |
| --- | --- | --- | --- |
| `DATABASE_URL` | Koneksi PostgreSQL untuk aplikasi, migration, dan seed. Harus berskema `postgres://` atau `postgresql://` | `postgres://app:app@localhost:5432/app` | Selalu. Server menolak start tanpa ini |
| `TEST_DATABASE_URL` | Database untuk test (`app_test`) | `postgres://app:app@localhost:5432/app_test` | Saat menjalankan test |
| `S3_ENDPOINT` | Endpoint S3-compatible | `http://localhost:9000` (RustFS) | Saat fitur storage dipakai |
| `S3_ACCESS_KEY_ID` | Access key S3. Juga dipakai compose sebagai akses RustFS | `devaccesskey` | Saat menjalankan `docker compose` (apa pun perintahnya) dan saat storage dipakai |
| `S3_SECRET_ACCESS_KEY` | Secret key S3. Sama seperti di atas | `devsecretkey` | Sama seperti di atas |
| `SMTP_HOST` | Host SMTP untuk email | `localhost` (Mailpit) | Saat fitur email dipakai |
| `SMTP_PORT` | Port SMTP | `1025` (Mailpit) | Saat fitur email dipakai |
| `ORIGIN` | URL publik aplikasi | `http://localhost:5173` | Production atau di belakang proxy. Tanpa ini form POST ditolak CSRF check |

Variabel di bawah tidak ada di `.env.example`, tetapi dibaca `@sveltejs/adapter-bun` saat runtime:

| Key | Fungsi | Wajib kapan |
| --- | --- | --- |
| `NODE_ENV` | `development`, `test`, atau `production`. Default `development`. Dockerfile mengisinya `production` | Tidak wajib |
| `PROTOCOL_HEADER`, `HOST_HEADER`, `PORT_HEADER` | Nama header proxy yang membawa protokol, host, dan port asli. Alternatif dari `ORIGIN` | Di belakang proxy tepercaya yang meneruskan TLS |
| `ADDRESS_HEADER`, `XFF_DEPTH` | Header dan kedalaman untuk membaca IP klien | Di belakang proxy, kalau IP klien dibutuhkan |
| `PORT` | Port server production. Default `3000` | Tidak wajib |

Di production, isi nilai S3 dan SMTP dengan layanan sungguhan dan ganti kredensial dev di atas. Jangan commit `.env`.
