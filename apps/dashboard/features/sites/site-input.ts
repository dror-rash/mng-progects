import { cleanText } from "@/features/forms/clean-text";

export type SiteInput = {
  name: string;
  address: string | null;
  accessNotes: string | null;
  /** Decimal strings, as Postgres `numeric` takes and returns them; both set or both null. */
  latitude: string | null;
  longitude: string | null;
};

type Result = { ok: true; value: SiteInput } | { ok: false; field: string; error: string };

const MAX = { name: 200, address: 500, accessNotes: 5000 };

/** A decimal with at most 6 places, the column's scale. */
const DECIMAL = /^-?\d{1,3}(\.\d{1,6})?$/;

function coordinate(raw: string, limit: number): string | null | "invalid" {
  if (!raw) return null;
  if (!DECIMAL.test(raw)) return "invalid";
  return Math.abs(Number(raw)) <= limit ? raw : "invalid";
}

/** The site form (task 054): name required; coordinates optional, in range, both or neither. */
export function parseSiteInput(formData: FormData): Result {
  const text = (field: string) => cleanText(formData.get(field));
  const optional = (field: string) => text(field) || null;

  const name = text("name");
  if (!name) return { ok: false, field: "name", error: "Site name is required" };
  if (name.length > MAX.name) return { ok: false, field: "name", error: `Keep the name under ${MAX.name} characters` };
  if (text("address").length > MAX.address) {
    return { ok: false, field: "address", error: `Keep the address under ${MAX.address} characters` };
  }
  if (text("accessNotes").length > MAX.accessNotes) {
    return { ok: false, field: "accessNotes", error: `Keep the access notes under ${MAX.accessNotes} characters` };
  }

  const rawLatitude = text("latitude");
  const rawLongitude = text("longitude");
  if (!rawLatitude !== !rawLongitude) {
    return { ok: false, field: rawLatitude ? "longitude" : "latitude", error: "Enter both latitude and longitude, or neither" };
  }
  const latitude = coordinate(rawLatitude, 90);
  if (latitude === "invalid") return { ok: false, field: "latitude", error: "Enter a latitude between -90 and 90" };
  const longitude = coordinate(rawLongitude, 180);
  if (longitude === "invalid") return { ok: false, field: "longitude", error: "Enter a longitude between -180 and 180" };

  return { ok: true, value: { name, address: optional("address"), accessNotes: optional("accessNotes"), latitude, longitude } };
}
