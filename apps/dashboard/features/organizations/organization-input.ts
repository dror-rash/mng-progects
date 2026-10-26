import { cleanText } from "@/features/forms/clean-text";

import { type OrganizationStatus, parseOrganizationStatus } from "./organization-kinds";

export type OrganizationInput = {
  name: string;
  status: OrganizationStatus;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  companyId: string | null;
  about: string | null;
  tags: string[];
};

type Result = { ok: true; value: OrganizationInput } | { ok: false; field: string; error: string };

// No query/fragment/list characters: the address ends up in a mailto: link.
const EMAIL = /^[^\s@?&#,<>"]+@[^\s@?&#,<>"]+\.[^\s@?&#,<>"]+$/;

const MAX = { name: 200, short: 200, website: 2048, address: 500, about: 5000, tag: 50, tags: 20 };

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value);
}

/** Comma-separated tags, trimmed, without duplicates (case-insensitive; the first spelling wins). */
export function normalizeTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const tag of raw.split(",").map((t) => t.trim())) {
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

/**
 * A canonical http(s) address, with https:// added when no scheme is given, or null if it isn't usable.
 * Only "scheme://" counts as a scheme, so "acme.example:8080" is a host and port. Addresses with
 * a user name ("https://acme.com@evil.example") are refused: they show one host and open another.
 */
function normalizeWebsite(raw: string): string | null {
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".")) return null;
  if (url.username || url.password) return null;
  const bare = url.pathname === "/" && !url.search && !url.hash;
  return bare ? url.href.slice(0, -1) : url.href;
}

export function parseOrganizationInput(formData: FormData): Result {
  const text = (field: string) => cleanText(formData.get(field));
  const optional = (field: string) => text(field) || null;
  const tooLong = (field: string, label: string, max: number): Result | null =>
    text(field).length > max ? { ok: false, field, error: `Keep the ${label} under ${max} characters` } : null;

  const name = text("name");
  if (!name) return { ok: false, field: "name", error: "Customer name is required" };

  const lengthError =
    tooLong("name", "name", MAX.name) ??
    tooLong("email", "email", MAX.short) ??
    tooLong("phone", "phone", MAX.short) ??
    tooLong("website", "website", MAX.website) ??
    tooLong("companyId", "company / tax ID", MAX.short) ??
    tooLong("address", "address", MAX.address) ??
    tooLong("about", "general information", MAX.about);
  if (lengthError) return lengthError;

  const status = parseOrganizationStatus(text("status"));
  if (!status) return { ok: false, field: "status", error: "Choose a status" };

  const email = optional("email");
  if (email && !isValidEmail(email)) return { ok: false, field: "email", error: "Enter a valid email address" };

  const rawWebsite = optional("website");
  const website = rawWebsite ? normalizeWebsite(rawWebsite) : null;
  if (rawWebsite && !website) return { ok: false, field: "website", error: "Enter a valid website address" };

  const tags = normalizeTags(text("tags"));
  if (tags.length > MAX.tags) return { ok: false, field: "tags", error: `Use at most ${MAX.tags} tags` };
  if (tags.some((t) => t.length > MAX.tag)) {
    return { ok: false, field: "tags", error: `Keep each tag under ${MAX.tag} characters` };
  }

  return {
    ok: true,
    value: {
      name,
      status,
      email,
      phone: optional("phone"),
      address: optional("address"),
      website,
      companyId: optional("companyId"),
      about: optional("about"),
      tags,
    },
  };
}
