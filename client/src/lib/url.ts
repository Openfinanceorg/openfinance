/**
 * Extracts the base domain from a URL, removing www prefix
 */
export function extractBaseDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
