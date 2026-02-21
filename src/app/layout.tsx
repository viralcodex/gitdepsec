import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare, GeistPixelLine } from "geist/font/pixel";
import Header from "@/components/header";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/providers/themeProvider";
import { NetworkStatusProvider } from "@/providers/networkStatusProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
// @ts-ignore
import "./globals.css";
// @ts-ignore
import "@xyflow/react/dist/style.css";

// All Geist font CSS variables:
// --font-geist-sans (regular sans-serif)
// --font-geist-mono (monospace)
// --font-geist-pixel-square (pixel square)
// --font-geist-pixel-line (pixel line)

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "GitVulSafe - Dependency Vulnerability Scanner & Security Audit Tool",
  description:
    "Visualize, detect and fix dependency vulnerabilities in your codebase with AI-powered insights. Analyze GitHub repositories and manifest files for security risks across npm, pip, Maven, and more. Free open-source dependency scanner.",
  openGraph: {
    title: "GitVulSafe - Dependency Vulnerability Scanner & Security Audit Tool",
    description:
      "Visualize, detect and fix dependency vulnerabilities in your codebase with AI-powered insights. Analyze GitHub repositories and manifest files for security risks across npm, pip, Maven, and more.",
    url: "https://GitVulSafe.com",
    siteName: "GitVulSafe",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitVulSafe - Dependency Vulnerability Scanner",
    description:
      "Visualize, detect and fix dependency vulnerabilities in your codebase with AI-powered insights.",
  },
  robots: {
    index: true,
    follow: true,
  },
  metadataBase: new URL("https://GitVulSafe.com"),
  keywords: [
    "dependency audit",
    "security vulnerabilities",
    "open source",
    "software security",
    "vulnerability scanning",
    "package management",
    "ai insights",
    "generative ai",
    "software development",
    "devsecops",
    "cybersecurity",
    "npm",
    "yarn",
    "pip",
    "maven",
    "gradle",
    "ruby gems",
    "cargo",
    "nuget",
  ],
  authors: [{ name: "Aviral Shukla", url: "https://github.com/viralcodex" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Combine all font CSS variables
  const fontVariables = [
    GeistSans.variable,
    GeistMono.variable,
    GeistPixelSquare.variable,
    GeistPixelLine.variable,
  ].join(" ");

  return (
    <html lang="en" className={fontVariables}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      </head>
      <body className="relative flex h-screen flex-col bg-background bg-repeat bg-size-[300px_300px] bg-[url('/bg.svg')] bg-blend-multiply font-sans antialiased">
        <SpeedInsights />
        <ThemeProvider>
          <NetworkStatusProvider>
            <Header />
            <main className="grow pt-16">{children}</main>
            <Toaster />
          </NetworkStatusProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
