"use client";

import { authClient } from "@repo/auth/client";
import { safeNext } from "@repo/auth/redirect";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { useState, type FormEvent } from "react";

export function SignupForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const { error } = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    if (error) {
      setError(error.message ?? "Could not create the account. Try again.");
      setPending(false);
      return;
    }
    window.location.assign(safeNext(next));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>Create account</Button>
    </form>
  );
}
