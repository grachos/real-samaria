import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import RegisterSW from "@/components/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real Samaria CP",
  description: "Seguimiento de jugadoras y pagos — Real Samaria CP 2026",
  appleWebApp: {
    capable: true,
    title: "Real Samaria",
    statusBarStyle: "black-translucent",
  },
  icons: { apple: "/apple-touch-icon.png" },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
