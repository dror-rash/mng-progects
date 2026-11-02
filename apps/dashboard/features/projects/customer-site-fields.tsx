"use client";

import { FieldError } from "@repo/ui/field-error";
import { NativeSelect } from "@repo/ui/native-select";
import Link from "next/link";
import { useState } from "react";

import { type SiteChoice, siteOptionsFor } from "@/features/sites/site-options";

type CustomerOption = { id: string; name: string };

/**
 * A project's Customer and Site selects (task 055). The Site options follow the chosen customer: its own
 * sites and its sub-companies' sites; choosing another customer starts the site over. A customer without
 * sites says so, with an "Add a site" link for admins (`canAddSite`). Partners choose among their own
 * customers, the first one chosen (`chooseCustomer` false: no "Choose a customer").
 *
 * The parent keys this on the submitted customer and site, so it starts over after every submit (React
 * resets the form; a select only applies defaultValue when it mounts).
 */
export function CustomerSiteFields({
  customers,
  sites,
  customerId: initialCustomer,
  siteId: initialSite,
  chooseCustomer,
  canAddSite,
  customerError,
  siteError,
}: {
  customers: CustomerOption[];
  sites: SiteChoice[];
  customerId: string;
  siteId: string;
  chooseCustomer: boolean;
  canAddSite: boolean;
  customerError?: string;
  siteError?: string;
}) {
  // A partner's select has no empty choice, so the browser shows the first customer: start the sites from it.
  const startCustomer = initialCustomer || (chooseCustomer ? "" : (customers[0]?.id ?? ""));
  const [customerId, setCustomerId] = useState(startCustomer);
  const options = siteOptionsFor(customerId, sites);
  const customer = customers.find((c) => c.id === customerId);
  const siteDescribedBy = [customer && options.length === 0 ? "siteId-hint" : null, siteError ? "siteId-error" : null]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="space-y-1">
        <label htmlFor="customerId" className="text-sm font-medium">Customer</label>
        <NativeSelect
          id="customerId"
          name="customerId"
          defaultValue={startCustomer}
          onChange={(e) => setCustomerId(e.target.value)}
          aria-invalid={customerError ? true : undefined}
          aria-describedby={customerError ? "customerId-error" : undefined}
        >
          {chooseCustomer && <option value="">Choose a customer</option>}
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NativeSelect>
        <FieldError id="customerId-error" message={customerError} />
      </div>
      <div className="space-y-1">
        <label htmlFor="siteId" className="text-sm font-medium">Site</label>
        {/* Keyed on the customer: another customer's site list starts at "Choose a site". */}
        <NativeSelect
          key={customerId}
          id="siteId"
          name="siteId"
          defaultValue={customerId === startCustomer ? initialSite : ""}
          aria-invalid={siteError ? true : undefined}
          {...(siteDescribedBy ? { "aria-describedby": siteDescribedBy } : {})}
        >
          <option value="">Choose a site</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </NativeSelect>
        {customer && options.length === 0 && (
          <p id="siteId-hint" className="text-xs text-muted-foreground">
            {customer.name} has no sites yet.{" "}
            {canAddSite ? (
              <Link href={`/sites/new?customer=${customer.id}`} className="font-medium text-foreground underline">
                Add a site
              </Link>
            ) : (
              "Ask an admin to add one."
            )}
          </p>
        )}
        <FieldError id="siteId-error" message={siteError} />
      </div>
    </>
  );
}
