import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { ContactRow } from "@repo/ui/contact-row";
import Link from "next/link";

import { removeContactAction } from "./actions";
import { primaryFirst } from "./contact-order";
import { ContactForm } from "./contact-form";
import { MakePrimaryForm } from "./make-primary-form";

type Contact = { id: string; name: string; role: string | null; phone: string | null; email: string | null };

/** The customer's contacts; `readOnly` (auditors) lists them without the forms. */
export function ContactsSection({
  customerId,
  contacts,
  primaryContactId,
  readOnly = false,
}: {
  customerId: string;
  contacts: Contact[];
  primaryContactId: string | null;
  readOnly?: boolean;
}) {
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
              {primaryFirst(contacts, primaryContactId).map((c) => (
                <ContactRow
                  key={c.id}
                  name={c.name}
                  role={c.role}
                  email={c.email}
                  phone={c.phone}
                  primary={c.id === primaryContactId}
                  actions={
                    readOnly ? undefined : (
                      <>
                        {c.id !== primaryContactId && <MakePrimaryForm customerId={customerId} contact={c} />}
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
                      </>
                    )
                  }
                />
              ))}
            </ul>
          )}
          {!readOnly && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-medium">Add a contact person</h3>
              <ContactForm customerId={customerId} />
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
