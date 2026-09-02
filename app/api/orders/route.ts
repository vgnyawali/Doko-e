import { getDb } from "../../../db";
import { orders } from "../../../db/schema";

type OrderItem = {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown> & {
      items?: OrderItem[];
    };
    const customerName = String(payload.customerName || "").trim();
    const email = String(payload.email || "").trim();
    const phone = String(payload.phone || "").trim();
    const address = String(payload.address || "").trim();
    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!customerName || !email || !phone || !address || !items.length) {
      return Response.json(
        { error: "Missing required order details" },
        { status: 400 },
      );
    }
    const db = getDb();
    const [order] = await db
      .insert(orders)
      .values({
        customerName,
        email,
        phone,
        address,
        note: String(payload.note || "").trim(),
        itemsJson: JSON.stringify(items),
        subtotal: Number(payload.subtotal) || 0,
        delivery: Number(payload.delivery) || 0,
        total: Number(payload.total) || 0,
      })
      .returning({ id: orders.id });
    return Response.json({ orderId: order.id }, { status: 201 });
  } catch {
    return Response.json(
      { error: "Order storage is temporarily unavailable" },
      { status: 500 },
    );
  }
}
