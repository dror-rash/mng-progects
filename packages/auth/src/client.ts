"use client";

import { createAuthClient } from "better-auth/react";

// Same-origin: every zone is served behind the shell, so requests to /api/auth reach the shell.
export const authClient = createAuthClient();
