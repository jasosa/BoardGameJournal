import { describe, expect, it } from "vitest";
import { err, ok, type Result } from "@/lib/result";

describe("Result", () => {
  it("ok wraps data", () => {
    expect(ok(42)).toEqual({ ok: true, data: 42 });
  });

  it("err carries a code and message", () => {
    expect(err("not_found", "Game not found")).toEqual({
      ok: false,
      error: { code: "not_found", message: "Game not found" },
    });
  });

  it("narrows on the ok flag", () => {
    const result: Result<number> = ok(1);
    if (result.ok) {
      expect(result.data).toBe(1);
    } else {
      expect.unreachable("expected ok");
    }
  });
});
