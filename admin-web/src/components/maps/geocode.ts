export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    );

    if (!response.ok) {
      throw new Error("Reverse geocoding failed.");
    }

    const data = (await response.json()) as {
      display_name?: string;
    };

    return data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error("Reverse geocoding error:", error);

    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}