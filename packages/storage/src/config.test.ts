import { describe, expect, it } from "vitest";

import { readStorageConfig } from "./config";

describe("readStorageConfig", () => {
  it("reads the bucket, and the local server when one is set", () => {
    expect(readStorageConfig({ STORAGE_BUCKET: "app-files", STORAGE_LOCAL_URL: "http://localhost:4443/" })).toEqual({
      bucket: "app-files",
      localUrl: "http://localhost:4443",
    });
  });

  it("uses Google Cloud Storage itself without a local server", () => {
    expect(readStorageConfig({ STORAGE_BUCKET: "prod-files" })).toEqual({ bucket: "prod-files", localUrl: null });
  });

  it("fails clearly without a bucket", () => {
    expect(() => readStorageConfig({})).toThrow("Set STORAGE_BUCKET");
  });
});
