# ethogram-admin

Admin dashboard for the WBS Ethogram system: WBS staff manage aviaries, subjects,
vocabulary, and config publishing without engineering involvement.

Part of a three-repo family:

- [`wbs-ethogram-form`](https://github.com/iboughtamouse/wbs-ethogram-form) — the public
  observation form (anonymous, untouched by this app)
- [`ethogram-api`](https://github.com/iboughtamouse/ethogram-api) — the single backend;
  this app talks to its `/api/admin/*` routes
- [`ethogram-notes`](https://github.com/iboughtamouse/ethogram-notes) — docs; the design
  lives at `01-ACTIVE/config-as-data-phase3-design.md`

## Auth model (stage 3A)

Email magic links via Resend against an `admin_users` allowlist — no passwords, no
self-signup. The single-use token travels in the URL **fragment** (never reaches a
server log) and is redeemed by an explicit button click (`POST /api/admin/auth/verify`),
so email security scanners that prefetch links can't consume it. Sessions are
server-side rows behind an httpOnly cookie.

## Development

```bash
npm install
npm run dev              # http://localhost:5174 (the public form owns 5173)
npm test                 # vitest + React Testing Library
npm run lint             # oxlint
npm run format:check     # prettier
npm run build            # production build
```

The api must be running (default `http://localhost:3000`; override with
`VITE_API_BASE_URL`). Its dev server needs `DATABASE_URL` pointing at the local
migrated Postgres — see `ethogram-api/README`.

## Workflow

Feature branches → PR to `staging` (squash) → owner releases `staging` → `main`
(merge commit). Nightly sync keeps `staging` from drifting behind `main`.
