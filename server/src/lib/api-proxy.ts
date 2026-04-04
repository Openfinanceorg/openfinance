/**
 * Proxy-aware fetch for external API calls that may be geo-blocked.
 *
 * When API_PROXY_URL is set, routes requests through a Cloudflare Worker
 * deployed in the US. Otherwise falls back to direct fetch.
 *
 * Returns a standard Response so callers can use it as a drop-in fetch replacement.
 */
export async function proxyFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const proxyUrl = process.env.API_PROXY_URL;
  if (!proxyUrl) return fetch(url, init);

  const proxyBody = {
    url,
    method: init?.method || "GET",
    headers: init?.headers
      ? Object.fromEntries(new Headers(init.headers).entries())
      : {},
    body: init?.body ? JSON.parse(init.body as string) : undefined,
  };

  const proxyResp = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proxyBody),
  });

  if (!proxyResp.ok) {
    const text = await proxyResp.text();
    throw new Error(
      `API proxy request failed: ${proxyResp.status} ${proxyResp.statusText} - ${text}`,
    );
  }

  const { statusCode, body } = (await proxyResp.json()) as {
    statusCode: number;
    body: string;
  };

  return new Response(body, {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}
