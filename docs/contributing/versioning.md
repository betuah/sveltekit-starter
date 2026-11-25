# Versioning

Proyek ini memakai [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`. Versi ditentukan dari commit sejak rilis terakhir, mengikuti aturan di bawah.

## Dari commit ke versi

| Commit | Naik |
| --- | --- |
| `fix`, `perf` | PATCH |
| `feat` | MINOR |
| type apa pun dengan `!` atau footer `BREAKING CHANGE:` | MAJOR |
| `docs`, `test`, `refactor`, `build`, `ci`, `chore`, `style`, `revert` | tidak ada release |

Kalau ada beberapa commit, yang tertinggi menang.

## Yang dihitung breaking

- menghapus atau mengganti nama env var
- migration yang butuh langkah manual atau menghapus data
- perubahan tidak kompatibel di `/api/v1`. Jangan ubah, buat `/api/v2`
- menghapus atau mengganti nama permission key
- mengubah props komponen publik

Kalau ragu, tandai breaking.

## Contoh

Mulai dari versi `1.2.3`:

| Commit sejak release terakhir | Versi baru |
| --- | --- |
| `fix(db): close pool on shutdown`, `docs: explain ORIGIN` | `1.2.4` |
| `feat(users): add csv export`, `fix(ui): align table header` | `1.3.0` |
| `feat(api)!: rename /users to /accounts` | `2.0.0` |
| `refactor(auth): split session helpers`, `ci: pin bun` | tetap `1.2.3` |

## Versi 0.x

Sebelum `1.0.0`, perubahan breaking menaikkan MINOR, bukan MAJOR. Dari `0.4.1`: `feat!` menghasilkan `0.5.0`, `feat` juga `0.5.0`, `fix` menghasilkan `0.4.2`. Versi `1.0.0` dirilis dengan sengaja saat API dianggap stabil.

## Pre-release

Versi seperti `1.2.0-rc.1` dipakai untuk kandidat rilis. Urutannya lebih rendah dari `1.2.0`.

## Cara rilis

1. Lihat commit sejak tag terakhir: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`. Tentukan versi baru dengan tabel di atas.
2. Naikkan `version` di `package.json` dan tambahkan entri di `CHANGELOG.md`. Satu baris per commit `feat`, `fix`, `perf`, dan breaking change, diambil dari subject commit.
3. Commit dengan `chore(release): vX.Y.Z`, lalu buat tag: `git tag vX.Y.Z && git push --follow-tags`.

Subject commit langsung menjadi isi changelog, jadi tulis sesuai [commit-convention](commit-convention.md).
