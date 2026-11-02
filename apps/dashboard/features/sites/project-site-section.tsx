import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { ContactRow } from "@repo/ui/contact-row";
import Link from "next/link";

type Contact = { id: string; name: string; role: string | null; phone: string | null; email: string | null };
type Site = {
  id: string;
  name: string;
  address: string | null;
  accessNotes: string | null;
  /** The maps link (`mapsLink`), null without an address or coordinates. */
  mapsHref: string | null;
  contacts: Contact[];
};

/**
 * A project's Site section (task 055): where the work is, how to get in and who to meet there, with a link
 * to the site page. A project from before sites were required has none: "No site yet.", and an "Add a
 * site" link (`addSiteHref`, to the project's edit page) for those who can change the project.
 */
export function ProjectSiteSection({ site, addSiteHref }: { site: Site | null; addSiteHref?: string }) {
  return (
    <section aria-labelledby="project-site-heading">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle id="project-site-heading" className="text-base">Site</CardTitle>
          {site?.mapsHref && (
            <Button asChild variant="outline" size="sm">
              <a href={site.mapsHref} target="_blank" rel="noopener noreferrer">Open in maps</a>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {site ? (
            <>
              <div className="space-y-1">
                <Link href={`/sites/${site.id}`} className="font-medium hover:underline">{site.name}</Link>
                {site.address && <p className="whitespace-pre-wrap text-muted-foreground">{site.address}</p>}
              </div>
              {site.accessNotes && (
                <div className="space-y-1">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Access notes</h3>
                  <p className="whitespace-pre-wrap">{site.accessNotes}</p>
                </div>
              )}
              <div className="space-y-1">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">On-site contacts</h3>
                {site.contacts.length === 0 ? (
                  <p className="text-muted-foreground">No one to meet on site yet.</p>
                ) : (
                  <ul className="divide-y">
                    {site.contacts.map((c) => (
                      <ContactRow key={c.id} name={c.name} role={c.role} email={c.email} phone={c.phone} />
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              No site yet.{" "}
              {addSiteHref && (
                <Link href={addSiteHref} className="font-medium text-foreground underline">Add a site</Link>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
