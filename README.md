This is a Next.js 16 security ID administration platform.

## Environment and integrations

Copy `.env.example` to `.env.local`, supply real credentials, then run:

```bash
npm run check:env
npm run check:env:production
```

The production check deliberately fails when Supabase, custom-domain, cron, or error-tracking configuration is absent. Resend variables are required when `EMAIL_PROVIDER=resend`; billing credentials are required when a non-manual billing provider is selected. Secrets must never be committed.

## Database migrations

Ordered, reproducible database changes live in `supabase/migrations`. Apply them in filename order with the Supabase CLI (`supabase db push`) or your deployment migration runner. `database/archive` contains a legacy one-shot bundle for reference only and must not be applied after the ordered migrations.

## Quality checks

```bash
npm run lint
npm test
npm run test:integration
npm run test:e2e
npm run build
```

The smoke checker asserts exact expected status codes; an expected 404 is declared per route and no longer treated as a generic success.

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
