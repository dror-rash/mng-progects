"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
import Link from "next/link";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { createSiteAction, updateSiteAction } from "./actions";
import { formatCoordinate } from "./coordinates";

type Site = {
  id: string;
  organizationId: string;
  name: string;
  address: string | null;
  accessNotes: string | null;
  latitude: string | null;
  longitude: string | null;
};

/** Create a site for `customerId`, or edit `site` (task 054). */
export function SiteForm({ customerId, site }: { customerId: string; site?: Site }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(site ? updateSiteAction : createSiteAction, {});
  const value = (field: string, fallback: string | null | undefined) => state.values?.[field] ?? fallback ?? "";
  const errorFor = (field: string) => (state.field === field ? state.error : undefined);
  const fieldProps = (field: string) =>
    state.field === field ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};

  return (
    <form action={formAction} className="space-y-4">
      {site ? <input type="hidden" name="siteId" value={site.id} /> : <input type="hidden" name="customerId" value={customerId} />}
      <FieldError message={state.field ? undefined : state.error} />

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">Site name</label>
        <Input id="name" name="name" required placeholder="e.g. Haifa warehouse" defaultValue={value("name", site?.name)} {...fieldProps("name")} />
        <FieldError id="name-error" message={errorFor("name")} />
      </div>
      <div className="space-y-1">
        <label htmlFor="address" className="text-sm font-medium">Address</label>
        <Textarea id="address" name="address" rows={2} defaultValue={value("address", site?.address)} {...fieldProps("address")} />
        <FieldError id="address-error" message={errorFor("address")} />
      </div>
      <div className="space-y-1">
        <label htmlFor="accessNotes" className="text-sm font-medium">Access notes</label>
        <Textarea
          id="accessNotes"
          name="accessNotes"
          rows={3}
          placeholder="Gate codes, opening hours, who to report to, safety notes"
          defaultValue={value("accessNotes", site?.accessNotes)}
          {...fieldProps("accessNotes")}
        />
        <FieldError id="accessNotes-error" message={errorFor("accessNotes")} />
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">Location (optional)</legend>
        <div className="space-y-1">
          <label htmlFor="latitude" className="text-sm font-medium">Latitude</label>
          <Input id="latitude" name="latitude" inputMode="decimal" placeholder="32.794" defaultValue={value("latitude", formatCoordinate(site?.latitude))} {...fieldProps("latitude")} />
          <FieldError id="latitude-error" message={errorFor("latitude")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="longitude" className="text-sm font-medium">Longitude</label>
          <Input id="longitude" name="longitude" inputMode="decimal" placeholder="34.989" defaultValue={value("longitude", formatCoordinate(site?.longitude))} {...fieldProps("longitude")} />
          <FieldError id="longitude-error" message={errorFor("longitude")} />
        </div>
      </fieldset>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>Save site</Button>
        <Button asChild variant="ghost">
          <Link href={site ? `/sites/${site.id}` : `/customers/${customerId}`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
