import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jeopardy AI - Bilingual Irish & English Game for Teachers',
  description: 'AI-powered bilingual Jeopardy game generator for Digital Technology teachers with Gemini and Neon DB',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ga">
      <body className="jeopardy-screen-glow font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
