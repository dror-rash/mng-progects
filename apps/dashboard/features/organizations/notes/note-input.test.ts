import { describe, expect, it } from "vitest";

import { parseNoteInput } from "./note-input";

function form(body: string) {
  const data = new FormData();
  data.set("body", body);
  return data;
}

describe("parseNoteInput", () => {
  it("trims the note but keeps its line breaks", () => {
    expect(parseNoteInput(form("  Call went well.\nSend quote.  "))).toEqual({
      ok: true,
      value: { body: "Call went well.\nSend quote." },
    });
  });

  it("rejects an empty note", () => {
    expect(parseNoteInput(form(" \n "))).toEqual({ ok: false, field: "body", error: "Write something before adding the note" });
  });
});
