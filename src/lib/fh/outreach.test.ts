import { describe, expect, it } from "vitest";
import { domainOf, emailGuesses, findRecipient } from "./outreach";

describe("domainOf", () => {
  it("reads bare domains and URLs", () => {
    expect(domainOf("https://www.Acme.com/about")).toBe("acme.com");
    expect(domainOf("posthog.com")).toBe("posthog.com");
  });
  it("rejects things that are not domains", () => {
    expect(domainOf("")).toBe("");
    expect(domainOf("not a site")).toBe("");
  });
});

describe("emailGuesses", () => {
  it("puts first name first, then first.last", () => {
    expect(emailGuesses("Priya K. Shah", "acme.com").slice(0, 2)).toEqual(["priya@acme.com", "priya.shah@acme.com"]);
  });
  it("strips accents and handles one name", () => {
    expect(emailGuesses("José", "acme.com")).toEqual(["jose@acme.com"]);
  });
});

describe("findRecipient without a Hunter key", () => {
  it("labels a pattern address as a guess", async () => {
    expect(await findRecipient({ url: "https://acme.com", name: "Sam Lee", role: "CEO" })).toEqual({ name: "Sam Lee", role: "CEO", email: "sam@acme.com", source: "guess" });
  });
  it("returns no address when there is no name", async () => {
    expect((await findRecipient({ url: "https://acme.com" })).email).toBe("");
  });
});
