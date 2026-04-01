# Pandalina Express

A multi-tenant restaurant ordering SaaS built with React, TypeScript, Supabase, and Vite.

## Tech stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, Zustand
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, RLS)
- **Deployment**: Vercel

## Local development

```sh
# Install dependencies
npm install

# Start dev server
npm run dev
```

## Build

```sh
npm run build
```

## Deploy edge functions

```sh
supabase functions deploy create-payment
supabase functions deploy payment-webhook
supabase functions deploy create-admin
```
