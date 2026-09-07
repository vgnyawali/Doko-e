import { handleCheckout } from '@/modules/checkout/handler';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  return handleCheckout(request, true);
}
