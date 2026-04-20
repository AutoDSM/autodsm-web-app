import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import { fontVariables } from "@/styles/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "autoDSM — The design system manager built for the AI era",
  description:
    "Connect a GitHub repository and get a premium, shareable brand book for every color, font, spacing value, shadow, border, animation, breakpoint, and asset.",
  icons: {
    icon: "/brand/perplexity-icon.svg",
  },
  openGraph: {
    title: "autoDSM",
    description:
      "The design system manager built for the AI era.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
