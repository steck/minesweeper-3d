import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Surface — 3D Minesweeper',
  description:
    'Explore a continuous 3D minefield on a torus or triangulated icosahedron.',
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
