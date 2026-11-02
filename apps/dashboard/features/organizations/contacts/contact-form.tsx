"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { Input } from "@repo/ui/input";
import Link from "next/link";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { addSiteContactAction, updateSiteContactAction } from "@/features/sites/actions";

import { addContactAction, updateContactAction } from "./actions";

type Contact = { id: string; name: string; role: string | null; phone: string | null; email: string | null };

/** Whose contact it is: a customer's, or a site's on-site contact (task 054). */
export type ContactOwner = { kind: "customer"; id: string } | { kind: "site"; id: string };

const ACTIONS = {
  customer: { add: addContactAction, update: updateContactAction, field: "customerId", back: (id: string) => `/customers/${id}` },
  site: { add: addSiteContactAction, update: updateSiteContactAction, field: "siteId", back: (id: string) => `/sites/${id}` },
} as const;

/** Add a contact to a customer or site, or edit one when `contact` is given. */
export function ContactForm({ owner, contact }: { owner: ContactOwner; contact?: Contact }) {
  const target = ACTIONS[owner.kind];
  const [state, formAction, pending] = useActionState<FormState, FormData>(contact ? target.update : target.add, {});
  const value = (field: string, fallback: string | null | undefined) => state.values?.[field] ?? fallback ?? "";
  const errorFor = (field: string) => (state.field === field ? state.error : undefined);
  const fieldProps = (field: string) =>
    state.field === field ? { "aria-invalid": true, "aria-describedby": `contact-${field}-error` } : {};

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name={target.field} value={owner.id} />
      {contact && <input type="hidden" name="contactId" value={contact.id} />}
      <FieldError message={state.field ? undefined : state.error} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="contact-name" className="text-sm font-medium">Contact name</label>
          <Input id="contact-name" name="name" required defaultValue={value("name", contact?.name)} {...fieldProps("name")} />
          <FieldError id="contact-name-error" message={errorFor("name")} />
        </div>
        <div className="space-y-1">
          <label htmlFor="contact-role" className="text-sm font-medium">Role</label>
          <Input id="contact-role" name="role" placeholder="e.g. Head of Marketing" defaultValue={value("role", contact?.role)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="contact-phone" className="text-sm font-medium">Contact phone</label>
          <Input id="contact-phone" name="phone" type="tel" defaultValue={value("phone", contact?.phone)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="contact-email" className="text-sm font-medium">Contact email</label>
          <Input id="contact-email" name="email" inputMode="email" defaultValue={value("email", contact?.email)} {...fieldProps("email")} />
          <FieldError id="contact-email-error" message={errorFor("email")} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{contact ? "Save contact" : "Add contact"}</Button>
        {contact && (
          <Button asChild variant="ghost" size="sm">
            <Link href={target.back(owner.id)}>Cancel</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
