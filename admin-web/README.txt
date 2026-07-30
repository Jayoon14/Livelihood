ADMIN WORKERS FUNCTIONAL AUDIT BATCH

Copy these files to the same paths inside admin-web:

1. src/pages/admin/workers/Workers.tsx
2. src/pages/admin/workers/WorkerDetails.tsx
3. src/services/workerService.ts

Then run:
npm run build

Changes:
- Working server-side name/email search
- Status filter
- Client pagination
- Refresh action
- Loading, error, retry, and empty states
- Typed worker list
- Approve/reject confirmation
- Action loading and duplicate-click prevention
- Parallel worker-detail loading
- Improved Supabase status filtering
