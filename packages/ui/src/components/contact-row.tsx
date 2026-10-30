import * as React from "react";

import { cn } from "../lib/utils";
import { Badge } from "./badge";

type ContactRowProps = Omit<React.ComponentProps<"li">, "children" | "role"> & {
  name: string;
  /** The person's job title (not an ARIA role). */
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  /** Shows a "Primary" badge: the person to reach first. */
  primary?: boolean;
  /** Buttons or links for this contact (edit, remove, …), so routing and actions stay with the app. */
  actions?: React.ReactNode;
};

/** One person in a list of contacts. Render inside a `<ul>`. */
export function ContactRow({ name, role, email, phone, primary = false, actions, className, ...props }: ContactRowProps) {
  return (
    <li className={cn("flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0", className)} {...props}>
      <div className="space-y-0.5 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{name}</span>
          {primary && <Badge>Primary</Badge>}
        </div>
        {role && <div className="text-muted-foreground">{role}</div>}
        <div className="flex flex-wrap gap-x-4 text-muted-foreground">
          {email && <a href={`mailto:${email}`} className="hover:underline">{email}</a>}
          {phone && <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="hover:underline">{phone}</a>}
        </div>
      </div>
      {actions && <div className="flex gap-1">{actions}</div>}
    </li>
  );
}
