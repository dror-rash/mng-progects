import { afterAll, describe, expect, it } from "vitest";

import { createDownloadUrl, createUploadUrl, objectKey, remove, stat } from "./index";

// Against the local fake-gcs-server (docker-compose.yml, `pnpm db:up`). Each run uses its own keys.

const keys: string[] = [];
function newKey() {
  const key = objectKey({ workspaceId: `test-${crypto.randomUUID().slice(0, 8)}`, projectId: "p" });
  keys.push(key);
  return key;
}

async function upload(key: string, body: string, contentType = "text/plain") {
  const url = await createUploadUrl({ key, contentType });
  return fetch(url, { method: "PUT", headers: { "Content-Type": contentType }, body });
}

afterAll(async () => {
  await Promise.all(keys.map((key) => remove(key)));
});

describe("signed URLs against the local server", () => {
  it("uploads a file that downloads again", async () => {
    const key = newKey();
    expect((await upload(key, "hello site")).ok).toBe(true);
    const response = await fetch(await createDownloadUrl({ key }));
    expect(response.ok).toBe(true);
    expect(await response.text()).toBe("hello site");
  });

  it("reports an uploaded file's size and type, and null for a missing one", async () => {
    const key = newKey();
    await upload(key, "12345", "image/jpeg");
    expect(await stat(key)).toEqual({ size: 5, contentType: "image/jpeg" });
    expect(await stat(newKey())).toBeNull();
  });

  it("removes a file, and removing a missing one succeeds", async () => {
    const key = newKey();
    await upload(key, "gone soon");
    await remove(key);
    expect(await stat(key)).toBeNull();
    await expect(remove(key)).resolves.toBeUndefined();
  });

  it("names the file in the download when asked", async () => {
    const key = newKey();
    await upload(key, "report");
    const url = new URL(await createDownloadUrl({ key, fileName: "Site report.pdf" }));
    expect(url.searchParams.get("response-content-disposition")).toBe('attachment; filename="Site report.pdf"');
  });
});

describe("what a signed URL allows", () => {
  it("binds an upload to its content type", async () => {
    const url = new URL(await createUploadUrl({ key: newKey(), contentType: "image/jpeg" }));
    expect(url.searchParams.get("X-Goog-SignedHeaders")?.split(";")).toContain("content-type");
  });

  it("expires: 15 minutes for uploads and 5 for downloads by default, or as asked", async () => {
    const key = newKey();
    expect(new URL(await createUploadUrl({ key, contentType: "text/plain" })).searchParams.get("X-Goog-Expires")).toBe("900");
    expect(new URL(await createDownloadUrl({ key })).searchParams.get("X-Goog-Expires")).toBe("300");
    expect(new URL(await createDownloadUrl({ key, expiresInSeconds: 1 })).searchParams.get("X-Goog-Expires")).toBe("1");
  });
});
