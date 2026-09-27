import type { Metadata } from 'next';
import './globals.css';
import { TopBar } from '@/components/TopBar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'AEROTWIN-AI · SIH26054',
  description:
    'AI-Powered Digital Twin for Predictive Health Monitoring, Fault Prediction, and Mission Reliability of MALE UAV Aero Piston Engines.',
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grid-bg min-h-screen">
        <TopBar />
        <main className="mx-auto max-w-[1600px] px-4 md:px-6 py-4">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
