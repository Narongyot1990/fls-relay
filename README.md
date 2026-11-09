# fls-relay

For the current architecture and Claude handoff, start with
[`CLAUDE.md`](./CLAUDE.md) and [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md).
The specifications below include historical plans; they do not describe completion status.

Phone/device custody-tracking web app for FLS Transport — tracks who is holding which
company phone, across sites, with role-based access for IT, site leads, ops
supervisors, and management.

See [`phone-asset-management-spec.md`](./phone-asset-management-spec.md) and
[`phone-asset-frontend-spec.md`](./phone-asset-frontend-spec.md) for the full
product and UI specs.

## Stack

- Next.js 16 (App Router, Turbopack)
- TypeScript, Tailwind CSS v4, shadcn/ui
- MongoDB Atlas (via the official `mongodb` driver)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll need a `.env.local`
with `MONGODB_URI` set — pull the production value with:

```bash
vercel env pull .env.local
```

Do not run the legacy `scripts/seed.mjs` during setup. The current workflow uses
real inventory data and explicit user-confirmed imports. Development may share
the Production database; never assume it is disposable.

## Deployment

Pushes to `main` auto-deploy to Vercel via the GitHub integration — no manual
`vercel --prod` needed.
