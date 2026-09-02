import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  note: text("note").notNull().default(""),
  itemsJson: text("items_json").notNull(),
  subtotal: real("subtotal").notNull(),
  delivery: real("delivery").notNull(),
  total: real("total").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  emailStatus: text("email_status").notNull().default("pending"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
