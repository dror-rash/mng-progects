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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value);
}

/** Comma-separated tags, trimmed, without duplicates (case-insensitive; the first spelling wins). */
export function normalizeTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const tag of raw.split(",").map((t) => t.trim())) {
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      tags.push(tag);
    }
  }
  return tags;
}

/** A web address, with https:// added when no scheme is given. Null if it isn't a usable http(s) address. */
function normalizeWebsite(raw: string): string | null {
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".")) return null;
    return candidate;
  } catch {
    return null;
  }
}

export function parseOrganizationInput(formData: FormData): Result {
  const text = (field: string) => String(formData.get(field) ?? "").trim();
  const optional = (field: string) => text(field) || null;

  const name = text("name");
  if (!name) return { ok: false, field: "name", error: "Customer name is required" };

  const status = parseOrganizationStatus(text("status"));
  if (!status) return { ok: false, field: "status", error: "Choose a status" };

  const email = optional("email");
  if (email && !isValidEmail(email)) return { ok: false, field: "email", error: "Enter a valid email address" };

  const rawWebsite = optional("website");
  const website = rawWebsite ? normalizeWebsite(rawWebsite) : null;
  if (rawWebsite && !website) return { ok: false, field: "website", error: "Enter a valid website address" };

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
      tags: normalizeTags(text("tags")),
    },
  };
}
