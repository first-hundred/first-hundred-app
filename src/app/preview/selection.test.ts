import { describe, expect, it } from "vitest";
import { previewProspects, selectedProspects } from "./selection";

const leads = [{ company: "Picked Company", url: "https://picked.example", why: "Needs our product" }];
const picked = selectedProspects(leads, [])[0];
if (!picked) throw new Error("Expected selected company");
const old = { ...picked, id: "existing", company_url: "https://other.example", ticked: true };

describe("Preview company selection", () => {
  it("uses selected leads instead of previously ticked prospects", () => {
    const list = previewProspects(leads, [old]);
    expect(list.map((p) => p.company_url)).toEqual(["https://picked.example"]);
    expect(list[0]?.ticked).toBe(true);
    expect(list[0]?.reason).toBe("Needs our product");
  });
  it("falls back to ticked prospects when selectedLeads is empty", () => {
    expect(previewProspects([], [old, { ...picked, ticked: false }])).toEqual([old]);
  });
  it("falls back to company websites when no prospects are ticked", () => {
    expect(previewProspects([], [{ ...old, ticked: false }])).toEqual([{ ...old, ticked: false }]);
  });
  it("preserves existing film, message and pipeline stage for a selected company", () => {
    const existing = { ...picked, id: "saved", stage: "replied" as const, draft: { subject: "Hello", message: "Your film" }, film: { id: "film-1", status: "running" as const, url: leads[0].url, startedAt: "2026-11-18" } };
    expect(selectedProspects(leads, [existing])[0]).toMatchObject({ id: "saved", stage: "replied", draft: existing.draft, film: existing.film });
  });
});