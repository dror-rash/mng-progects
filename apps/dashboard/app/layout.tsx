import { parseTheme, systemThemeScript, THEME_COOKIE, themeClass } from "@repo/ui/theme";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = { title: "Waypoint Dashboard" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    // "system" is resolved by the inline script before paint, so the class may differ from the server's.
    <html lang="en" className={themeClass(theme)} suppressHydrationWarning>
      <head>
        {theme === "system" && <script dangerouslySetInnerHTML={{ __html: systemThemeScript }} />}
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
