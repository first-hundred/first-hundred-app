import { normalizeInterview } from "./interview";

describe("normalizeInterview", () => {
  it("uses empty strings for unknown fields", () => {
    const i = normalizeInterview({}, "investors");
    expect(i.website).toBe("");
    expect(i.buyer).toEqual({ role: "", companyType: "", size: "" });
    expect(i.ask).toBe("");
    expect(i.contact).toBe("");
    expect(i.goal).toBe("investors");
  });
  it("keeps at least 2 points", () => {
    expect(normalizeInterview({ points: ["fast"] }, "customers").points).toEqual(["fast", ""]);
  });
  it("keeps at most 4 points", () => {
    expect(normalizeInterview({ points: ["a", "b", "c", "d", "e"] }, "customers").points).toHaveLength(4);
  });
  it("drops empty proof rows", () => {
    expect(normalizeInterview({ proof: [{ value: "", label: "" }, { value: "3", label: "pilots" }] }, "customers").proof).toEqual([{ value: "3", label: "pilots" }]);
  });
});
