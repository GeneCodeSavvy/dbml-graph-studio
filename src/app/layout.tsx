import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DBML Graph Studio',
  description: 'Interactive DBML editor, ERD visualizer, and schema graph analysis studio.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
