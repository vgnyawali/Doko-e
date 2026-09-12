import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  icons: { icon: '/logo.png' },
  title: 'Doko — A little bit of Nepal, wherever you are',
  description:
    'Nepali pantry essentials and seasonal favorites. Delivered across the United States.',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
