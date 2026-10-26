import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

import { requireSession } from "@/features/auth/require-session";
import { AppHeader } from "@/features/layout/app-header";
import { CustomerForm } from "@/features/organizations/customer-form";

export const dynamic = "force-dynamic";

export default async function NewCustomerPage() {
  const session = await requireSession("/customers/new");

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader email={session.user.email} />
      <main className="mx-auto w-full max-w-3xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>New customer</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
