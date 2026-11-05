import Confirmation from '@/modules/confirmation/Confirmation';
export const metadata = {
  title: 'Your order — Doko',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default function Page() {
  return <Confirmation />;
}
