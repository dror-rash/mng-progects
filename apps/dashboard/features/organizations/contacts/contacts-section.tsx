import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import Link from "next/link";

import { removeContactAction } from "./actions";
import { ContactForm } from "./contact-form";

type Contact = { id: string; name: string; role: string | null; phone: string | null; email: string | null };

export function ContactsSection({ customerId, contacts }: { customerId: string; contacts: Contact[] }) {
  return (
    <section aria-labelledby="contacts-heading">
      <Card>
        <CardHeader>
          <CardTitle id="contacts-heading" className="text-base">Contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contact people yet.</p>
          ) : (
            <ul className="divide-y">
              {contacts.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0">
                  <div className="space-y-0.5 text-sm">
                    <div className="font-medium">{c.name}</div>
                    {c.role && <div className="text-muted-foreground">{c.role}</div>}
                    <div className="flex flex-wrap gap-x-4 text-muted-foreground">
                      {c.email && <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>}
                      {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">{c.phone}</a>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/customers/${customerId}/contacts/${c.id}/edit`}>
                        Edit<span className="sr-only"> {c.name}</span>
                      </Link>
                    </Button>
                    <form action={removeContactAction}>
                      <input type="hidden" name="customerId" value={customerId} />
                      <input type="hidden" name="contactId" value={c.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Remove<span className="sr-only"> {c.name}</span>
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-medium">Add a contact person</h3>
            <ContactForm customerId={customerId} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
