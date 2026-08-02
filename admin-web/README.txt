LIVELIHOODGO STYLE_OPTIONS FIX

Replace:

1. src/components/maps/mapStyles.ts
2. src/components/maps/components/LayersModal.tsx

Fixes:
- Restores the missing STYLE_OPTIONS export.
- Adds the MapStyleOption type.
- Removes implicit any from the option callback.
- Keeps DEFAULT_CENTER, STYLES, and SATELLITE_STYLE exports.
- Removes accidental duplicate LayersModal code.
- Adds proper dark mode and modal accessibility behavior.

After replacing:

npm run build
npm run dev

Then hard refresh:
Ctrl + Shift + R
