import type { Metadata } from 'next';
import Storefront from '@/modules/storefront/Storefront';
import { defaultSettings } from '@/config/defaults';
import { readStore } from '@/services/repository';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { settings } = await readStore();
    return { title: settings.browser_title };
  } catch {
    return { title: defaultSettings.browser_title };
  }
}

export default function Home() {
  return <Storefront />;
}
