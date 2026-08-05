import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

/**
 * Origine du site, nécessaire pour transformer les URLs relatives des balises
 * canoniques et Open Graph en URLs absolues. `NEXTAUTH_URL` porte déjà cette
 * information sur chaque environnement ; le repli couvre le développement.
 */
const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LIUDOR | Lieux d'Or",
    template: "%s | LIUDOR",
  },
  description: "Plateforme de réservation de salles premium.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}