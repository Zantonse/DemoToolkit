/**
 * Settings Page - redirect shim
 *
 * Settings have been moved into the main AppShell sidebar navigation.
 * This page redirects to the home page for any bookmarked or linked URLs.
 */

import { redirect } from 'next/navigation';

export default function SettingsPage() {
  redirect('/');
}
