import { describe, expect, it } from "vitest";

import { rateLimitOptions } from "./rate-limit";

describe("rateLimitOptions", () => {
  it("keeps Better Auth's defaults when the test flag is not set", () => {
    expect(rateLimitOptions({})).toEqual({});
  });

  it("turns rate limiting off only when AUTH_DISABLE_RATE_LIMIT is exactly 'true'", () => {
    expect(rateLimitOptions({ AUTH_DISABLE_RATE_LIMIT: "true" })).toEqual({ rateLimit: { enabled: false } });
  });

  it("ignores other values", () => {
    expect(rateLimitOptions({ AUTH_DISABLE_RATE_LIMIT: "1" })).toEqual({});
    expect(rateLimitOptions({ AUTH_DISABLE_RATE_LIMIT: "false" })).toEqual({});
  });
});
