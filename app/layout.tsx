import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Doko Nepali Market",
  description:
    "Nepali pantry favorites, collected with care and delivered across Greater Boston.",
  metadataBase: new URL(
    "https://boston-nepali-market.vgnyawali756102.chatgpt.site",
  ),
  openGraph: {
    title: "Doko Nepali Market",
    description: "A little taste of home, delivered.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Doko Nepali Market",
    description: "A little taste of home, delivered.",
    images: ["/og.png"],
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
