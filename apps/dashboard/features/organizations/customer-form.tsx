"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import { NativeSelect } from "@repo/ui/native-select";
import { Textarea } from "@repo/ui/textarea";
import Link from "next/link";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { createCustomerAction, updateCustomerAction } from "./actions";
import { ORGANIZATION_STATUSES } from "./organization-kinds";

type Customer = {
  id: string;
  name: string;
  status: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  companyId: string | null;
  about: string | null;
  tags: string[];
};

/** Create a customer, or edit one when `customer` is given. */
export function CustomerForm({
  customer,
  workspaceId,
}: {
  customer?: Customer;
  /** For a new customer: the workspace it goes in (the one this page shows). */
  workspaceId?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    customer ? updateCustomerAction : createCustomerAction,
    {},
  );
  const value = (field: string, fallback: string | null | undefined) => state.values?.[field] ?? fallback ?? "";
  const errorFor = (field: string) => (state.field === field ? state.error : undefined);
  const fieldProps = (field: string) =>
    state.field === field ? { "aria-invalid": true, "aria-describedby": `${field}-error` } : {};

  return (
    <form action={formAction} className="space-y-4">
      {customer && <input type="hidden" name="customerId" value={customer.id} />}
      {workspaceId && <input type="hidden" name="workspaceId" value={workspaceId} />}
      <FieldError message={state.field ? undefined : state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">Name</label>
          <Input id="name" name="name" defaultValue={value("name", customer?.name)} required {...fieldProps("name")} />
          <FieldError id="name-error" message={errorFor("name")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          {/* Keyed on the submitted value: a select only applies defaultValue when it mounts (see project-form). */}
          <NativeSelect
            key={value("status", customer?.status ?? "active")}
            id="status"
            name="status"
            defaultValue={value("status", customer?.status ?? "active")}
            {...fieldProps("status")}
          >
            {ORGANIZATION_STATUSES.map((s) => (
              <option key={s.status} value={s.status}>{s.label}</option>
            ))}
          </NativeSelect>
          <FieldError id="status-error" message={errorFor("status")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          {/* type="text": the server validates, so the message matches every other form error. */}
          <Input id="email" name="email" inputMode="email" autoComplete="email" defaultValue={value("email", customer?.email)} {...fieldProps("email")} />
          <FieldError id="email-error" message={errorFor("email")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="phone" className="text-sm font-medium">Phone</label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={value("phone", customer?.phone)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="website" className="text-sm font-medium">Website</label>
          <Input id="website" name="website" inputMode="url" placeholder="example.com" defaultValue={value("website", customer?.website)} {...fieldProps("website")} />
          <FieldError id="website-error" message={errorFor("website")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="companyId" className="text-sm font-medium">Company / tax ID</label>
          <Input id="companyId" name="companyId" defaultValue={value("companyId", customer?.companyId)} />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="address" className="text-sm font-medium">Address</label>
        <Textarea id="address" name="address" rows={2} defaultValue={value("address", customer?.address)} />
      </div>
      <div className="space-y-1">
        <label htmlFor="tags" className="text-sm font-medium">Tags</label>
        <Input id="tags" name="tags" aria-describedby="tags-hint" placeholder="e.g. retail, enterprise" defaultValue={value("tags", customer?.tags.join(", "))} />
        <p id="tags-hint" className="text-xs text-muted-foreground">Separate tags with commas.</p>
      </div>
      <div className="space-y-1">
        <label htmlFor="about" className="text-sm font-medium">General information</label>
        <Textarea id="about" name="about" rows={4} defaultValue={value("about", customer?.about)} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>Save customer</Button>
        <Button asChild variant="ghost">
          <Link href={customer ? `/customers/${customer.id}` : "/customers"}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
