import { expect, it, vi } from "vitest";
import { isPublicHttpUrl } from "./safe-url";
it("accepts public HTTP URLs", () => {
  for (const url of ["https://example.com", "http://sub.example.co.uk/path"]) expect(isPublicHttpUrl(url)).toBe(true);
});
it("rejects private and non HTTP URLs", () => {
  for (const host of ["localhost:3000", "127.0.0.1", "10.0.0.5", "172.20.1.1", "192.168.1.1", "169.254.169.254", "[::1]", "foo.internal"]) expect(isPublicHttpUrl(`http://${host}`)).toBe(false);
  expect(isPublicHttpUrl("ftp://example.com")).toBe(false);
});

import { safeFetch } from "./safe-url";
it("rejects trailing-dot and reserved hosts", () => {
  for (const u of ["http://localhost./", "http://foo.internal./", "http://198.18.0.1", "http://224.0.0.1", "http://2130706433/", "http://192.0.2.1", "http://198.51.100.1", "http://203.0.113.1", "http://192.0.0.8"]) expect(isPublicHttpUrl(u)).toBe(false);
});
it("checks every redirect hop", async () => {
  const f = vi.fn(async () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } }));
  vi.stubGlobal("fetch", f);
  await expect(safeFetch("https://example.com")).rejects.toThrow("public");
  expect(f).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
});
