/**
 * Root Layout - Okta SE Toolkit
 * 
 * The root layout wraps all pages with the OktaProvider context,
 * making Okta credentials available throughout the application.
 * 
 * The OktaProvider manages:
 * - Okta Org URL
 * - API Token
 * - localStorage persistence
 * - Credential reset functionality
 */

import './globals.css';
import type { Metadata } from 'next';
import { OktaProvider } from './context/OktaContext';

export const metadata: Metadata = {
  title: 'Okta SE Toolkit',
  description: 'Internal toolkit for Okta Sales Engineers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <OktaProvider>
          {children}
        </OktaProvider>
      </body>
    </html>
  );
}
