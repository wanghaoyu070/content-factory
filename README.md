This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Operational Flags

For production safety, these env flags control fallback and execution behavior:

- `ALLOW_MOCK_DATA_FALLBACK` (default: `false` in production)
  - `true`: allow API routes and analysis tasks to return/generate mock data when upstream APIs are unavailable.
  - `false`: fail fast with non-2xx responses (or failed task status) instead of silently using mock data.

- `ANALYSIS_EXECUTION_MODE`
  - `inline`: run `/api/analysis/start` synchronously in request lifecycle.
  - unset: production defaults to inline mode; development uses background fire-and-forget.

- `NEXT_PUBLIC_DEV_BYPASS_AUTH`
  - Only effective in development. Never enable in production.

## Data Safety Scripts

- `npm run audit:data`
  - Checks core data integrity (missing `user_id`, orphan records, favorites scope mismatches).

- `npm run migrate:user-data`
  - Migrates legacy rows to the first user.
  - Supports `--dry-run` and `--skip-backup`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
