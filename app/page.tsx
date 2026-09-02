"use client";
import { useMemo, useState } from "react";
type Product = {
  id: number;
  name: string;
  nepali: string;
  category: string;
  size: string;
  price: number;
  image: string;
  color: string;
};
const products: Product[] = [
  {
    id: 1,
    name: "Premium Basmati Rice",
    nepali: "बासमती चामल",
    category: "Pantry",
    size: "10 lb bag",
    price: 18.99,
    image:
      "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=80",
    color: "saffron",
  },
  {
    id: 2,
    name: "Masoor Dal",
    nepali: "मसुरो दाल",
    category: "Pantry",
    size: "4 lb bag",
    price: 8.49,
    image:
      "https://images.unsplash.com/photo-1585996741002-263c62203ddf?auto=format&fit=crop&w=900&q=80",
    color: "coral",
  },
  {
    id: 3,
    name: "Nepali Wai Wai",
    nepali: "वाई वाई",
    category: "Snacks",
    size: "30-pack",
    price: 16.99,
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Instant_noodles_on_a_shelf_02.jpg/1280px-Instant_noodles_on_a_shelf_02.jpg",
    color: "gold",
  },
  {
    id: 4,
    name: "Momo Masala",
    nepali: "म:म: मसला",
    category: "Spices",
    size: "100 g",
    price: 4.99,
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80",
    color: "red",
  },
  {
    id: 5,
    name: "Mustard Oil",
    nepali: "तोरीको तेल",
    category: "Pantry",
    size: "1 liter",
    price: 9.99,
    image:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80",
    color: "amber",
  },
  {
    id: 6,
    name: "Himalayan Tea",
    nepali: "हिमाली चिया",
    category: "Drinks",
    size: "40 bags",
    price: 7.49,
    image:
      "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80",
    color: "green",
  },
  {
    id: 7,
    name: "Buff Momo",
    nepali: "बफ म:म:",
    category: "Frozen",
    size: "30 pieces",
    price: 14.99,
    image:
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80",
    color: "blue",
  },
  {
    id: 8,
    name: "Gundruk",
    nepali: "गुन्द्रुक",
    category: "Specialty",
    size: "200 g",
    price: 6.99,
    image:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80",
    color: "leaf",
  },
];
const categories = [
  "All",
  "Pantry",
  "Snacks",
  "Spices",
  "Drinks",
  "Frozen",
  "Specialty",
];
export default function Home() {
  const [category, setCategory] = useState("All"),
    [cart, setCart] = useState<Record<number, number>>({}),
    [cartOpen, setCartOpen] = useState(false),
    [checkout, setCheckout] = useState(false),
    [success, setSuccess] = useState(false),
    [email, setEmail] = useState(""),
    [submitting, setSubmitting] = useState(false),
    [orderError, setOrderError] = useState(""),
    [orderId, setOrderId] = useState<number | null>(null);
  const visible =
      category === "All"
        ? products
        : products.filter((p) => p.category === category),
    count = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = useMemo(
      () => products.reduce((s, p) => s + p.price * (cart[p.id] || 0), 0),
      [cart],
    ),
    delivery = subtotal >= 50 ? 0 : 5.99,
    total = subtotal + delivery;
  const changeQty = (id: number, d: number) =>
    setCart((c) => {
      const n = Math.max(0, (c[id] || 0) + d),
        u = { ...c, [id]: n };
      if (!n) delete u[id];
      return u;
    });
  const closeCart = () => {
    setCartOpen(false);
    setCheckout(false);
    setSuccess(false);
  };
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark">डो</span>
          <span>
            <strong>Doko</strong>
            <small>Nepali Market</small>
          </span>
        </a>
        <nav>
          <a href="#shop">Shop</a>
          <a href="#how">How it works</a>
          <a href="#delivery">Delivery</a>
        </nav>
        <button className="cart-button" onClick={() => setCartOpen(true)}>
          <span>Bag</span>
          <b>{count}</b>
        </button>
      </header>
      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">Boston’s neighborhood Nepali delivery</span>
          <h1>
            A little taste of <em>home,</em> delivered.
          </h1>
          <p>
            Order the Nepali essentials you love. We collect community orders,
            source everything together, and bring it to your door.
          </p>
          <div className="hero-actions">
            <a className="primary" href="#shop">
              Shop this week
            </a>
            <span>
              Next delivery: <strong>Saturday</strong>
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1400&q=85"
            alt="Colorful spices and Nepali pantry ingredients"
          />
          <span className="stamp">
            Doko
            <br />
            favorites
          </span>
        </div>
      </section>
      <div className="trust-strip">
        <span>✓ Community-sourced favorites</span>
        <span>✓ Greater Boston delivery</span>
        <span>✓ Secure checkout</span>
        <span>✓ Free delivery over $50</span>
      </div>
      <section className="shop" id="shop">
        <div className="section-heading">
          <div>
            <span className="eyebrow">This week’s collection</span>
            <h2>Stock the pantry</h2>
          </div>
          <p>
            Orders close Thursday at 8 PM.
            <br />
            Delivered fresh on Saturday.
          </p>
        </div>
        <div className="filters">
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="product-grid">
          {visible.map((p) => {
            const q = cart[p.id] || 0;
            return (
              <article className="product-card" key={p.id}>
                <div className={`product-art ${p.color}`}>
                  <img src={p.image} alt={p.name} />
                  <small>{p.category}</small>
                </div>
                <div className="product-info">
                  <p className="nepali">{p.nepali}</p>
                  <h3>{p.name}</h3>
                  <span>{p.size}</span>
                  <div className="product-bottom">
                    <strong>${p.price.toFixed(2)}</strong>
                    {q ? (
                      <div className="stepper">
                        <button onClick={() => changeQty(p.id, -1)}>−</button>
                        <b>{q}</b>
                        <button onClick={() => changeQty(p.id, 1)}>+</button>
                      </div>
                    ) : (
                      <button
                        className="add"
                        onClick={() => changeQty(p.id, 1)}
                      >
                        Add to bag
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="how" id="how">
        <div>
          <span className="eyebrow">Simple by design</span>
          <h2>
            From our community
            <br />
            to your kitchen.
          </h2>
        </div>
        <ol>
          <li>
            <b>01</b>
            <span>
              <strong>Choose your favorites</strong>Browse our small, carefully
              selected weekly collection.
            </span>
          </li>
          <li>
            <b>02</b>
            <span>
              <strong>We bundle the orders</strong>Ordering together helps us
              keep prices fair and reduce waste.
            </span>
          </li>
          <li>
            <b>03</b>
            <span>
              <strong>We deliver Saturday</strong>Receive everything at your
              Greater Boston doorstep.
            </span>
          </li>
        </ol>
      </section>
      <section className="delivery" id="delivery">
        <span>🚚</span>
        <div>
          <small>OUR DELIVERY AREA</small>
          <strong>
            Cambridge · Somerville · Medford · Arlington · Malden · Boston
          </strong>
        </div>
        <p>
          Not sure if we reach you?
          <br />
          <a href="mailto:hello@example.com">Ask us →</a>
        </p>
      </section>
      <footer>
        <div className="brand">
          <span className="brand-mark">डो</span>
          <span>
            <strong>Doko</strong>
            <small>Nepali Market</small>
          </span>
        </div>
        <p>Good food brings us closer.</p>
        <span>© 2026 · Made for our community</span>
      </footer>
      {cartOpen && (
        <div
          className="overlay"
          onMouseDown={(e) => e.target === e.currentTarget && closeCart()}
        >
          <aside className="cart-panel" role="dialog" aria-modal="true">
            <button className="close" onClick={closeCart}>
              ×
            </button>
            {success ? (
              <div className="success">
                <div>✓</div>
                <span className="eyebrow">Order received</span>
                <h2>Dhanyabad!</h2>
                <p>
                  Your order is confirmed. A receipt and delivery details have
                  been prepared for <strong>{email}</strong>.
                </p>
                <small>ORDER #DK{orderId}</small>
                <button className="primary" onClick={closeCart}>
                  Continue shopping
                </button>
              </div>
            ) : checkout ? (
              <form
                className="checkout"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmitting(true);
                  setOrderError("");
                  const form = new FormData(e.currentTarget);
                  try {
                    const response = await fetch("/api/orders", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({
                        customerName: form.get("customerName"),
                        email,
                        phone: form.get("phone"),
                        address: form.get("address"),
                        note: form.get("note"),
                        items: products
                          .filter((p) => cart[p.id])
                          .map((p) => ({
                            productId: p.id,
                            name: p.name,
                            quantity: cart[p.id],
                            unitPrice: p.price,
                          })),
                        subtotal,
                        delivery,
                        total,
                      }),
                    });
                    const result = (await response.json()) as {
                      orderId?: number;
                      error?: string;
                    };
                    if (!response.ok || !result.orderId)
                      throw new Error(result.error || "Could not save order");
                    setOrderId(result.orderId);
                    setSuccess(true);
                  } catch {
                    setOrderError(
                      "We couldn’t save your order. Please try again in a moment.",
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                <span className="eyebrow">Almost there</span>
                <h2>Delivery details</h2>
                <label>
                  Full name
                  <input required name="customerName" placeholder="Your name" />
                </label>
                <label>
                  Email address
                  <input
                    required
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Phone number
                  <input
                    required
                    name="phone"
                    type="tel"
                    placeholder="(617) 555-0123"
                  />
                </label>
                <label>
                  Delivery address
                  <textarea
                    required
                    name="address"
                    placeholder="Street, city, ZIP code"
                  />
                </label>
                <label>
                  Delivery note <small>optional</small>
                  <input
                    name="note"
                    placeholder="Apartment, call on arrival, etc."
                  />
                </label>
                <div className="order-total">
                  <span>Total</span>
                  <strong>${total.toFixed(2)}</strong>
                </div>
                {orderError && <p className="form-error">{orderError}</p>}
                <button
                  className="primary full"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Saving order…" : "Place order"}
                </button>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => setCheckout(false)}
                >
                  ← Back to bag
                </button>
              </form>
            ) : (
              <div className="cart-content">
                <span className="eyebrow">Your weekly order</span>
                <h2>
                  Your bag{" "}
                  <small>
                    {count} {count === 1 ? "item" : "items"}
                  </small>
                </h2>
                {!count ? (
                  <div className="empty">
                    <span>🧺</span>
                    <h3>Your bag is empty</h3>
                    <p>Add a few favorites from this week’s collection.</p>
                    <button className="primary" onClick={closeCart}>
                      Start shopping
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="cart-items">
                      {products
                        .filter((p) => cart[p.id])
                        .map((p) => (
                          <div className="cart-item" key={p.id}>
                            <img src={p.image} alt="" />
                            <div>
                              <strong>{p.name}</strong>
                              <small>{p.size}</small>
                              <div className="stepper">
                                <button onClick={() => changeQty(p.id, -1)}>
                                  −
                                </button>
                                <b>{cart[p.id]}</b>
                                <button onClick={() => changeQty(p.id, 1)}>
                                  +
                                </button>
                              </div>
                            </div>
                            <b>${(p.price * cart[p.id]).toFixed(2)}</b>
                          </div>
                        ))}
                    </div>
                    <div className="summary">
                      <p>
                        <span>Subtotal</span>
                        <b>${subtotal.toFixed(2)}</b>
                      </p>
                      <p>
                        <span>Delivery</span>
                        <b>{delivery ? `$${delivery.toFixed(2)}` : "Free"}</b>
                      </p>
                      {subtotal < 50 && (
                        <small>
                          Add $
                          {(50 - subtotal).toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                          })}{" "}
                          more for free delivery.
                        </small>
                      )}
                      <p className="total">
                        <span>Total</span>
                        <b>${total.toFixed(2)}</b>
                      </p>
                    </div>
                    <button
                      className="primary full"
                      onClick={() => setCheckout(true)}
                    >
                      Continue to checkout
                    </button>
                  </>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
