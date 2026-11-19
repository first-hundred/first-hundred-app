import { expect, it, vi } from "vitest";
const model = vi.hoisted(() => vi.fn().mockResolvedValue({ subject: "Hello", body: "Hello" }));
vi.mock("./gemini", () => ({ geminiJSON: model }));
import { writeEmail } from "./outreach";
it("includes the buyer in the prompt", async () => {
  await writeEmail({ sender: { name: "Demo", email: "", role: "", linkedin: "" }, lead: { company: "Example", url: "https://example.com", why: "" }, answers: { goal: "customers", website: "", pitch: "", buyer: { role: "CEO", companyType: "SaaS", size: "small" }, points: [], proof: [], ask: "" } });
  expect(model.mock.calls[0][1]).toContain("WHO THEY SELL TO: CEO; SaaS; small");
});
