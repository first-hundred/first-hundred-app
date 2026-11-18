import { describe, expect, it } from "vitest";
import { DEMO_PROSPECTS, roadPlan } from "./road";

describe("road to 100", () => {
  it("demo data reads 3 customers", () => {
    expect(DEMO_PROSPECTS.filter((p) => p.stage === "customer").length).toBe(3);
  });
  it("uses 10 films a day by default", () => {
    expect(roadPlan({ customers: 3, contacted: 7, replyRate: 71 }).perDay).toBe(10);
  });
  it("needs no more asks once 100 customers are reached", () => {
    expect(roadPlan({ customers: 100, contacted: 200, replyRate: 50 }).totalAsks).toBe(0);
  });
});
