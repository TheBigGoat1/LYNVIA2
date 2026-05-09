import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';
 
export const locales = ['en', 'de', 'fr', 'es', 'it'];
 
export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale;

  // Validate that the incoming locale is valid
  if (!locale || !locales.includes(locale as any)) notFound();
 
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
