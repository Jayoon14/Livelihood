# LivelihoodGo Production Audit
Date: 2026-08-06

## Validation completed

- TypeScript project check: PASS (`tsc -b`, zero errors)
- Vercel SPA rewrite: PASS (`vercel.json` rewrites all routes to `index.html`)
- Route coverage: PASS for customer, worker, admin, chat, reports, appeals, and case-management routes
- Chat compatibility redirects: PASS (`/customer/chat` and `/worker/chat`)
- Uploaded Windows dependency tree prevented Linux Vite bundling because the Linux Rolldown optional native binding is absent. This is an environment limitation, not a TypeScript source failure.

## Critical inconsistencies corrected

### Worker online freshness
Some screens used 2 minutes while the GPS system used a 15-minute stale allowance. This could show the same worker as online on one page and offline on another.

Standardized to 15 minutes in:
- `presenceService.ts`
- Customer Dashboard
- Customer Bookings
- Customer Worker Profile
- Legacy Worker Profile

### Booking distance
The main nearby-worker system used 50 km, but worker profile booking checks still used 20 km.

Standardized profile booking validation to 50 km.

## Security and repository observations

1. Do not commit `.env`.
2. The uploaded `.env` contains two shell-command lines. Remove:
   - `npm install @supabase/supabase-js`
   - `npx skills add supabase/agent-skills`
3. Rotate private provider keys if they were ever published publicly.
4. Supabase anonymous/public keys may be used by the frontend, but RLS must remain enabled.
5. Do not distribute `.git`, `node_modules`, or `dist` inside future source ZIP files.

## Lint audit

Current ESLint result:
- 195 errors
- 20 warnings
- 80 affected files

Largest categories:
- 72 `no-explicit-any`
- 64 `set-state-in-effect`
- 21 ref-safety warnings
- 20 hook dependency warnings
- 14 immutability warnings

These do not block the TypeScript build, but they should be handled in controlled batches rather than by changing 80 files at once.

Recommended cleanup order:
1. Hook correctness and dependency warnings
2. Realtime subscription cleanup and duplicate polling
3. Replace `any` in services and data models
4. Split non-component exports from providers
5. Payment and tracking page refactors

## Production deployment checklist

1. Run `npm run build` on Windows.
2. Confirm zero TypeScript errors.
3. Push to `master`.
4. Wait for Vercel status `Ready`.
5. Hard-refresh the production site.
6. Test with separate customer and worker devices:
   - online status
   - nearby markers
   - booking lifecycle
   - payment
   - chat
   - notifications
   - report/complaint
   - appeal
7. Verify Supabase Realtime publication and RLS policies.
8. Check browser Console and Network for 4xx/5xx responses.
