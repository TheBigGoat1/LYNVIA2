import { redirect } from 'next/navigation';

export default function AccountingFirmAnalyticsPage({
  params,
}: {
  params: { locale: string };
}) {
  redirect(`/${params.locale}/accounting-firm/financial-reports`);
}
