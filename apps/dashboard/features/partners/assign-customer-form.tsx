"use client";

import { Button } from "@repo/ui/button";
import { FieldError } from "@repo/ui/field-error";
import { NativeSelect } from "@repo/ui/native-select";
import { useActionState } from "react";

import type { FormState } from "@/features/forms/form-state";

import { assignCustomerAction, unassignCustomerAction } from "./actions";

type Customer = { id: string; name: string };

/** Assigns one of the customers not yet assigned to the partner (admins only). */
export function AssignCustomerForm({ partnerId, customers }: { partnerId: string; customers: Customer[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(assignCustomerAction, {});
  const chosen = state.values?.organizationId ?? "";
  const error = state.error;

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="partnerId" value={partnerId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="organizationId" className="text-sm font-medium">Customer</label>
          {/* Keyed on the submitted value: React resets the form after a submit, and a select only applies
              defaultValue when it mounts. */}
          <NativeSelect
            key={chosen}
            id="organizationId"
            name="organizationId"
            defaultValue={chosen}
            className="w-auto"
            {...(error ? { "aria-invalid": true, "aria-describedby": "organizationId-error" } : {})}
          >
            <option value="">Choose a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" size="sm" disabled={pending}>Assign customer</Button>
      </div>
      <FieldError id="organizationId-error" message={error} />
    </form>
  );
}

/** Takes one customer away from the partner (admins only). */
export function UnassignCustomerForm({ partnerId, customer }: { partnerId: string; customer: Customer }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(unassignCustomerAction, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="partnerId" value={partnerId} />
      <input type="hidden" name="organizationId" value={customer.id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        Unassign<span className="sr-only"> {customer.name}</span>
      </Button>
      <FieldError message={state.error} />
    </form>
  );
}
