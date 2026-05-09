import { redirect } from 'next/navigation';

// This page is not part of the internationalized routes.
// It just redirects to the default locale.
export default function RootPage() {
  redirect('/en');
}
