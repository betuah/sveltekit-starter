# Konvensi commit

Halaman ini menjelaskan cara menulis commit yang lolos commitlint dan bisa dipakai untuk menentukan versi dan changelog. Hook Lefthook (`commit-msg`) menjalankan commitlint dengan `@commitlint/config-conventional` di setiap commit. CI mengecek ulang semua commit di PR.

## Format

```
<type>(<scope>)!: <subject>

<body>

<footer>
```

Scope, `!`, body, dan footer opsional. Contoh lengkap:

```
feat(auth)!: require email verification on signup

Existing unverified accounts are blocked until they verify.

BREAKING CHANGE: AUTH_REQUIRE_VERIFIED_EMAIL now defaults to true
Refs #12
```

## Type

| Type | Dipakai untuk | Efek ke versi |
| --- | --- | --- |
| `feat` | Fitur baru | MINOR |
| `fix` | Perbaikan bug | PATCH |
| `perf` | Perbaikan performa | PATCH |
| `refactor` | Ubah struktur kode tanpa ubah perilaku | tidak ada |
| `docs` | Dokumentasi saja | tidak ada |
| `test` | Menambah atau memperbaiki test | tidak ada |
| `build` | Build, dependency, Dockerfile | tidak ada |
| `ci` | Workflow CI | tidak ada |
| `chore` | Pekerjaan rutin lain | tidak ada |
| `revert` | Membatalkan commit sebelumnya | tidak ada |
| `style` | Format saja, tanpa ubah logika | tidak ada |

Tanda `!` atau footer `BREAKING CHANGE:` pada type apa pun menaikkan MAJOR. Lihat [versioning](versioning.md).

## Scope

Scope adalah nama modul atau area. Daftar yang diizinkan commitlint (peringatan, bukan error, kalau di luar daftar): `repo`, `config`, `db`, `ci`, `docker`, `docs`, `deps`, `auth`, `rbac`, `users`, `roles`, `api`, `ui`, `design`, `storage`, `email`, `security`, `i18n`, `test`. Daftarnya ada di `commitlint.config.js`.

## Aturan

- Subject memakai kalimat perintah (imperative): `add`, bukan `added` atau `adds`.
- Header, yaitu baris pertama, maksimal 72 karakter. Lebih dari itu commitlint menolak.
- Satu commit berisi satu perubahan logis.
- Kaitkan issue di footer: `Refs #12` atau `Closes #12`.
- Commit hanya atas nama author. Jangan tambahkan `Co-Authored-By` untuk tool AI atau baris `Generated with Claude Code`. Hook `commit-msg` menolaknya, dan `.claude/settings.json` mematikan baris itu dari Claude Code.
- Pesan commit berbahasa Inggris.

## Contoh

Bagus:

```
feat(users): add csv export
fix(db): close pool on shutdown
docs: explain ORIGIN behind a proxy
refactor(api): extract error mapper
```

Jelek:

```
fixed stuff                       # tanpa type, tidak jelas
feat: Added the new users page.   # past tense, huruf besar, titik
feat(users): add csv export and fix login and bump deps   # tiga perubahan
```

## Nama branch

`feat/<nama-singkat>` dan `fix/<nama-singkat>`, misalnya `feat/csv-export`. Alur PR ada di [pull-requests](pull-requests.md).
