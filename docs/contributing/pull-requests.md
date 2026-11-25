# Pull request

Buat branch dari `main`, commit, buka PR, tunggu CI hijau, lalu squash merge.

## Branch

`feat/<nama-singkat>` atau `fix/<nama-singkat>`. Jangan commit langsung ke `main`.

## Judul PR

Setiap PR di-squash menjadi satu commit, dan judul PR menjadi subject commit itu. Karena itu judul harus berupa commit konvensional, misalnya `feat(users): add csv export`. CI (`amannn/action-semantic-pull-request`) menolak judul yang salah format. Versi dan changelog dihitung dari judul ini, jadi tambahkan `!` kalau PR membawa breaking change ([daftarnya di sini](versioning.md)).

## Template

`.github/pull_request_template.md` memuat checklist ini:

- Test ditambah atau diupdate
- Migration dibuat, kalau schema berubah
- Docs diupdate
- Ada breaking change? Kalau ya, judul PR pakai `!`

Isi bagian Ringkasan dengan apa yang berubah dan kenapa.

## Sebelum minta review

```bash
bun run lint
bun run check
bun run test:unit -- --run
```

CI menjalankan job `quality`, `test`, `migrations`, `build`, `e2e`, dan `commits`. Job `migrations` gagal kalau schema berubah tanpa migration yang ikut di-commit. Jalankan `bun run db:generate` dan commit hasilnya di `database/migrations/`.

## Merge

Pakai squash merge. Hapus branch setelahnya.
