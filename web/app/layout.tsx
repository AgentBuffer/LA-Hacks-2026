import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "MediaFlow — Hire AI agents that run your brand",
    template: "%s · MediaFlow",
  },
  description:
    "Onboard your brand once. Spawn AI agents that wake up on schedule, generate on-brand content, and post — while a Critic agent rejects anything off-voice.",
  openGraph: {
    title: "MediaFlow — Hire AI agents that run your brand",
    description:
      "Spawn AI agents that wake up on schedule, generate on-brand content, and post — while a Critic agent rejects anything off-voice.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MediaFlow — Hire AI agents that run your brand",
    description:
      "Spawn AI agents that wake up on schedule, generate on-brand content, and post — while a Critic agent rejects anything off-voice.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-ink">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
