"use client";

import { Button } from "@repo/ui/button";

import { authClient } from "./client";

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await authClient.signOut();
        window.location.assign("/"); // hard navigation: works from any zone
      }}
    >
      Log out
    </Button>
  );
}
