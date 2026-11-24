# ADR 0001: SvelteKit 3 di Bun dengan adapter-bun

Status: diterima (2026-11-24)

## Konteks

Starter ini butuh framework full-stack dan runtime yang cepat dipasang. SvelteKit 3 sudah stabil (3.4.x). Konfigurasinya pindah ke `vite.config.ts` lewat `sveltekit({...})`, `svelte.config.js` tidak didukung lagi, dan import memakai subpath `#lib` alih-alih `$lib`.

Untuk Bun ada dua adapter. `@sveltejs/adapter-bun` adalah adapter resmi (v1.0.x) dan butuh Bun 1.4 atau lebih baru. `svelte-adapter-bun` buatan komunitas sudah diarsipkan dan dinyatakan deprecated (dicek 2026-11-24).

## Keputusan

Pakai SvelteKit 3 dengan Svelte 5 (runes) dan TypeScript strict, dijalankan dan di-build dengan Bun lewat `@sveltejs/adapter-bun`. Build: `bun --bun vite build`. Jalankan: `bun ./build`.

## Konsekuensi

- Bun 1.4 atau lebih baru wajib, tercatat di `engines` pada `package.json`. Semua script memakai `bun --bun` supaya Vite dan Vitest benar-benar jalan di runtime Bun, bukan Node.
- TypeScript dipin ke 6.0.3 karena TypeScript 7 belum jalan dengan SvelteKit 3. Vitest dipin ke 5.1.0 karena 5.1.1 crash di Bun 1.4.4. Naikkan keduanya setelah masalahnya hilang.
- Pindah ke Node tinggal satu perubahan di `vite.config.ts`: ganti import menjadi `@sveltejs/adapter-node`, lalu sesuaikan perintah start dan image Docker.
- Env dibaca lewat satu modul, `src/lib/server/core/config.ts`, bukan `$env/*`, dan divalidasi saat start.
