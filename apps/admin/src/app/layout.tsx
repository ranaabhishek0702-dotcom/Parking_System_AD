import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ParkSense Command & Control | Smart Street-Parking Platform',
  description: 'MoHUA Municipal Street-Parking Automation Command Center & Dynamic Pricing Lab',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
