import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { OktaProvider } from './context/OktaContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Okta SE Toolkit',
  description: 'Internal toolkit for Okta Sales Engineers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <OktaProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </OktaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
