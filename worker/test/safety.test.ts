// PII detection parity tests, mirroring tests/test_lodestar_safety.py.
//
// Fixtures are ASCII-only on purpose: the JS port UNDER-FLAGS non-ASCII PII
// relative to Python because Python's `re` makes \w/\d/\b Unicode-aware by
// default while JavaScript RegExp (no `u` flag) is ASCII-only (see safety.ts).
// This divergence is accepted because the input gate is advisory/best-effort;
// the ASCII fixtures are exactly where the two implementations must agree.

import { describe, expect, it } from "vitest";

import { PII_BLOCK_DETAIL, containsPii, detectPii } from "../src/safety";

describe("detectPii", () => {
  it("detects common PII kinds (parity with test_lodestar_safety.py)", () => {
    expect(detectPii("my ssn is 123-45-6789")).toContain("ssn");
    expect(detectPii("reach me at student@example.edu")).toContain("email");
    expect(detectPii("call me at 919-555-1234")).toContain("phone");
  });

  it("flags clean text as having no PII", () => {
    expect(detectPii("How do I improve my resume?")).toEqual([]);
    expect(containsPii("Tips for networking with alumni")).toBe(false);
  });

  it("handles additional ASCII negatives", () => {
    expect(containsPii("What scholarships exist for HBCU students?")).toBe(false);
    expect(containsPii("Help me prep for a behavioral interview")).toBe(false);
    // A bare 4-digit year is not a phone/SSN.
    expect(containsPii("I graduate in 2026")).toBe(false);
  });

  it("detects phone numbers in several common ASCII formats", () => {
    expect(containsPii("(919) 555-1234")).toBe(true);
    expect(containsPii("919.555.1234")).toBe(true);
    expect(containsPii("+1 919 555 1234")).toBe(true);
  });
});

describe("PII_BLOCK_DETAIL", () => {
  it("is the exact constant with the em dash intact", () => {
    // U+2014 em dash, not a hyphen — byte-for-byte parity with the Python
    // PII_BLOCK_DETAIL constant (enforced from the Python side in
    // tests/test_worker_parity.py).
    expect(PII_BLOCK_DETAIL).toBe(
      "That looks like it includes personal info (an email, phone number, or SSN). " +
        "Lodestar never needs it — take it out and send again.",
    );
    expect(PII_BLOCK_DETAIL).toContain("—");
  });
});
