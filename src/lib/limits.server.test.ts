import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ counts: [] as number[], insert: vi.fn(), insertResult: { data: { id: "r1" } as unknown, error: null as unknown }, remove: vi.fn(), query: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => { const q = { eq: () => q, gte: () => q, then: (resolve: (v: unknown) => unknown) => resolve({ count: mock.counts.shift() ?? 0, error: null }) }; mock.query(); return q; },
      insert: (row: unknown) => { mock.insert(row); return { select: () => ({ single: async () => mock.insertResult }) }; },
      delete: () => ({ eq: async (_c: string, id: string) => { mock.remove(id); return { error: null }; } }),
    }),
  },
}));
import { peek, spend } from "./limits.server";
beforeEach(() => { mock.counts = []; mock.insert.mockClear(); mock.remove.mockClear(); mock.query.mockClear(); mock.insertResult = { data: { id: "r1" }, error: null }; });
afterEach(() => vi.unstubAllEnvs());

it("allows a call under both caps", async () => { mock.counts = [1, 1, 1, 1]; expect(await spend("u", "film")).toBeNull(); expect(mock.remove).not.toHaveBeenCalled(); });
it("refuses a user already over the cap without recording", async () => { mock.counts = [0, 2]; expect(await spend("u", "film")).toContain("today's free"); expect(mock.insert).not.toHaveBeenCalled(); });
it("refuses per user caps and takes the record back", async () => { mock.counts = [1, 1, 1, 3]; expect(await spend("u", "film")).toContain("today's free"); expect(mock.remove).toHaveBeenCalledWith("r1"); });
it("refuses site caps and takes the record back", async () => { mock.counts = [59, 1, 61]; expect(await spend("u", "film")).toContain("everyone"); expect(mock.remove).toHaveBeenCalledWith("r1"); });
it("pauses everyone without recording", async () => { vi.stubEnv("FH_PAUSED", "1"); expect(await spend("u", "film")).toContain("paused"); expect(mock.insert).not.toHaveBeenCalled(); });
it("records unlimited users without counting", async () => { vi.stubEnv("FH_UNLIMITED_USER_IDS", "u"); expect(await spend("u", "film")).toBeNull(); expect(mock.query).not.toHaveBeenCalled(); expect(mock.insert).toHaveBeenCalled(); });
it("refuses insert failure", async () => { mock.insertResult = { data: null, error: {} }; expect(await spend("u", "film")).toContain("record your usage"); });
it("peek refuses at the cap and never inserts", async () => { mock.counts = [0, 2]; expect(await peek("u", "film")).toContain("today's free"); expect(mock.insert).not.toHaveBeenCalled(); });
it("peek allows below the cap", async () => { mock.counts = [0, 1]; expect(await peek("u", "film")).toBeNull(); });
