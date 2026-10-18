import { SignupForm } from "@/features/auth/signup-form";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto max-w-sm space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <SignupForm next={next} />
      <p className="text-sm text-muted-foreground">
        Already registered? <a className="underline" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</a>
      </p>
    </main>
  );
}
