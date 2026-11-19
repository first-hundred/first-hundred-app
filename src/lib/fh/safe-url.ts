/** Reject local addresses before fetching supplied URLs. */
export function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    // A trailing dot ("localhost.") names the same host; strip it before checking.
    const host = url.hostname.toLowerCase().replace(/\.+$/, "");
    if (!["http:", "https:"].includes(url.protocol) || host.includes(":") || host.startsWith("[")) return false;
    if (!host || host === "localhost" || /\.(localhost|local|internal)$/.test(host)) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const [a, b, c] = host.split(".").map(Number);
      if ([0, 10, 127].includes(a) || a >= 224) return false;
      if ((a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return false;
      if ((a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19))) return false;
      // Documentation and special-purpose blocks (IANA): 192.0.0/24, 192.0.2/24, 198.51.100/24, 203.0.113/24.
      if ((a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)) return false;
    }
    return true;
  } catch { return false; }
}

/**
 * fetch() that follows redirects itself (up to 5) and checks every hop, so a public URL
 * can't bounce the server to a local address.
 */
export async function safeFetch(value: string, init: RequestInit = {}): Promise<Response> {
  let url = value;
  for (let hop = 0; hop <= 5; hop++) {
    if (!isPublicHttpUrl(url)) throw new Error("Use a public HTTP or HTTPS URL.");
    const res = await fetch(url, { ...init, redirect: "manual" });
    const next = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!next) return res;
    url = new URL(next, url).toString();
  }
  throw new Error("Too many redirects.");
}
