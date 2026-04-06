This repository contains the Cohost AI MVP control plane built with Next.js, Supabase, Hostify, and n8n.

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

Before running locally, create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Then fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `HOSTIFY_KEY_ENCRYPTION_SECRET`
- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Auth and MVP pages:

- `/login` - sign in or request access to the closed beta
- `/onboarding` - connect Hostify, Telegram, listings, assistant settings, and economics
- `/dashboard` - read-only status, runtime routing counters, and economics visibility
- `/` - product overview and recommended next steps after sign-in

## Closed beta scope

Current product assumptions for the closed beta:

- up to 10 client accounts
- up to 30 active listings per client in the control plane
- free during beta
- draft mode recommended first, autopilot only after controlled validation

The onboarding listings table is used for operator visibility and enable/disable policy. Runtime routing remains runtime-first and should not depend on the onboarding cache being perfectly fresh.

## Supabase schema setup

Run the SQL from `supabase/schema.sql` in Supabase SQL editor to create:

- `tenants` table
- `tenant_events` table
- RLS policies and indexes

## n8n contract

Outbound sync to n8n is signed with:

- `x-cohost-signature` (HMAC SHA256 over `timestamp.body`)
- `x-cohost-timestamp`
- `x-cohost-idempotency-key`

n8n can post events back to:

- `POST /api/n8n/tenant-events`

with the same signature header format.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
