# Berkontribusi

Setup lokal ada di [docs/getting-started.md](docs/getting-started.md). Setelah `bun install`, Lefthook terpasang otomatis dan menjalankan Prettier, ESLint, dan commitlint setiap kali kamu commit.

Aturan singkatnya:

- Commit memakai Conventional Commits, mis. `feat(auth): add oidc login`. Aturan lengkap: [commit-convention](docs/contributing/commit-convention.md).
- Versi naik otomatis dari riwayat commit. Cara kerjanya: [versioning](docs/contributing/versioning.md).
- Satu PR berisi satu perubahan logis, di-squash saat merge, dan judul PR harus berupa commit konvensional. Detail: [pull-requests](docs/contributing/pull-requests.md).
- Kode, nama identifier, dan pesan commit berbahasa Inggris. Dokumentasi berbahasa Indonesia.

Sebelum membuka PR, jalankan `bun run lint`, `bun run check`, dan `bun run test:unit -- --run`.
