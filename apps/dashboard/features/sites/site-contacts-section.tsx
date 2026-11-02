import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { ContactRow } from "@repo/ui/contact-row";
import Link from "next/link";
import type { ReactNode } from "react";

type Contact = { id: string; name: string; role: string | null; phone: string | null; email: string | null };

/**
 * The people to meet at a site (task 054). Admins get Edit and Remove on each contact and the `addForm`
 * below the list; without `removeAction` (auditors) it is a plain list. The page passes the server action
 * and the form, so this stays free of server code.
 */
export function SiteContactsSection({
  siteId,
  contacts,
  removeAction,
  addForm,
}: {
  siteId: string;
  contacts: Contact[];
  removeAction?: (formData: FormData) => void | Promise<void>;
  addForm?: ReactNode;
}) {
  return (
    <section aria-labelledby="site-contacts-heading">
      <Card>
        <CardHeader>
          <CardTitle id="site-contacts-heading" className="text-base">On-site contacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one to meet on site yet.</p>
          ) : (
            <ul className="divide-y">
              {contacts.map((c) => (
                <ContactRow
                  key={c.id}
                  name={c.name}
                  role={c.role}
                  email={c.email}
                  phone={c.phone}
                  actions={
                    removeAction && (
                      <>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/sites/${siteId}/contacts/${c.id}/edit`}>
                            Edit<span className="sr-only"> {c.name}</span>
                          </Link>
                        </Button>
                        <form action={removeAction}>
                          <input type="hidden" name="siteId" value={siteId} />
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
          {addForm && (
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-medium">Add someone to meet on site</h3>
              {addForm}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
