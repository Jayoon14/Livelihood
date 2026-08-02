LIVELIHOODGO NEARBY WORKERS REALTIME FULL FIX

Replace:
1. src/components/maps/hooks/useNearbyWorkers.ts
2. src/pages/customer/workers/components/NearbyWorkersModal.tsx

Fixed:
- Removed duplicate realtime useEffect.
- Exactly one realtime channel is created per mounted hook.
- All postgres_changes callbacks are registered before subscribe().
- Unique realtime channel name prevents channel collisions.
- NearbyWorker.profile has one consistent WorkerProfile type with required id.
- Modal no longer performs a second profile query.
- New workers added through realtime also load their profile.
- Worker markers move smoothly on realtime location updates.
- Marker click always uses the latest worker data.
- Proper cleanup of channel, markers, animation frames, and click handlers.
- 30-second polling fallback remains active.
- Responsive mobile worker details panel.

After replacing:
npm run build
npm run dev

Then hard refresh:
Ctrl + Shift + R
