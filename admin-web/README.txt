Replace:
1. src/pages/worker/navigation/NavigateToCustomer.tsx
2. src/components/maps/LocationPicker.tsx

Behavior:
- Worker cannot change the confirmed customer destination.
- Search and destination-changing sidebar controls are disabled in navigation mode.
- Map clicks/search results cannot overwrite the booking destination.
- Current Location still recenters the worker GPS.
- Chat Customer opens /chat/:bookingId.
- Existing getChatContext/getMessages ownership checks restrict the room to the booking customer and assigned worker.
