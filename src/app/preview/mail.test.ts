import { buildMailto, withShareLink } from "./mail";

test("adds the share link when the draft lacks it", () => {
  expect(withShareLink("Hi Ana", "https://x.co/f/1")).toBe("Hi Ana\n\nhttps://x.co/f/1");
});
test("does not duplicate the share link", () => {
  expect(withShareLink("Watch: https://x.co/f/1", "https://x.co/f/1")).toBe("Watch: https://x.co/f/1");
});
test("mailto carries subject and body", () => {
  expect(buildMailto("A film", "a b\nc")).toBe("mailto:?subject=A%20film&body=a%20b%0Ac");
});
