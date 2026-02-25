/**
 * Home Page - Okta SE Toolkit
 *
 * Entry point that renders the AppShell, which manages sidebar navigation,
 * view switching (scripts / settings / overview / logs), and category filtering.
 */

import { AppShell } from './components/AppShell';

export default function HomePage() {
  return <AppShell />;
}
