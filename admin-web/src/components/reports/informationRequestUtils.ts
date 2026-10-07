export function getCaseIdFromInformationRequest(
  title: string,
  message: string,
): string | null {
  const text = `${title} ${message}`;
  if (
    !/additional information required|more information required|needs more information/i.test(text)
  ) return null;
  return text.match(/Case\s*#\s*([0-9a-f]{8}-[0-9a-f-]{27,})/i)?.[1] ?? null;
}
