import test from "node:test";
import assert from "node:assert/strict";
import { requestRoute } from "../src/mlClient.js";
import { translateAlert } from "../src/translator.js";
test("routing outage never invents a usable route", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  try {
    await assert.rejects(
      requestRoute("Siliguri", "Gangtok"),
      (e) => e.status === 503 && /unavailable/.test(e.message),
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("no accessible route is preserved as an actionable error", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 422,
    json: async () => ({ detail: "No accessible route" }),
  });
  try {
    await assert.rejects(
      requestRoute("A", "B"),
      (e) => e.status === 422 && e.message === "No accessible route",
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("missing translation keeps exact incident facts and identifies fallback", async () => {
  const old = process.env.BHASHINI_API_KEY;
  delete process.env.BHASHINI_API_KEY;
  try {
    const text = "Truck AS-123 stopped at bridge B. No rescue dispatched.";
    const result = await translateAlert("FIELD_INCIDENT", text);
    assert.equal(result.hi, text);
    assert.equal(result.as, text);
    assert.equal(result._meta.languages.hi, "ENGLISH_FALLBACK");
  } finally {
    if (old) process.env.BHASHINI_API_KEY = old;
  }
});
