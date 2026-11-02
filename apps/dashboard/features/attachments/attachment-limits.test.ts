import { describe, expect, it } from "vitest";

import { parseAttachmentKind, uploadRefusal } from "./attachment-limits";

const MB = 1024 * 1024;

describe("parseAttachmentKind", () => {
  it("knows photos and files, nothing else", () => {
    expect(parseAttachmentKind("photo")).toBe("photo");
    expect(parseAttachmentKind("file")).toBe("file");
    expect(parseAttachmentKind("report")).toBeNull();
    expect(parseAttachmentKind("x")).toBeNull();
  });
});

describe("uploadRefusal", () => {
  it("takes JPEG, PNG, WebP and HEIC photos up to 20 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic"]) {
      expect(uploadRefusal("photo", type, 20 * MB)).toBeNull();
    }
    expect(uploadRefusal("photo", "text/plain", 10)).toBe("Photos must be JPEG, PNG, WebP or HEIC images");
    expect(uploadRefusal("photo", "image/jpeg", 20 * MB + 1)).toBe("Photos can be up to 20 MB");
  });

  it("takes documents and images as files up to 50 MB", () => {
    for (const type of ["application/pdf", "text/csv", "text/plain", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]) {
      expect(uploadRefusal("file", type, 50 * MB)).toBeNull();
    }
    expect(uploadRefusal("file", "application/x-msdownload", 10)).toBe("Files must be PDF, Word, Excel, CSV, text or images");
    expect(uploadRefusal("file", "application/pdf", 50 * MB + 1)).toBe("Files can be up to 50 MB");
  });

  it("refuses empty files", () => {
    expect(uploadRefusal("file", "application/pdf", 0)).toBe("The file is empty");
  });
});
