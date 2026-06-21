import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "./../../utils/firebaseconfig"; // adjust path to your firebase config


// ─── Visa SVG Logo ────────────────────────────────────────────────────────────
const VisaLogo = () => (
  <svg viewBox="0 0 750 471" xmlns="http://www.w3.org/2000/svg" className="visa-logo">
    <rect width="750" height="471" rx="40" fill="#1A1F71" />
    <text x="375" y="310" textAnchor="middle" fill="white" fontSize="220" fontFamily="Arial" fontWeight="bold" letterSpacing="-8">
      VISA
    </text>
  </svg>
);

// ─── Lock Icon ────────────────────────────────────────────────────────────────
const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// ─── Check Icon ───────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Chevron Icon ─────────────────────────────────────────────────────────────
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ─── Format card number ───────────────────────────────────────────────────────
const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits;
};

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
const SkeletonItem = () => (
  <div className="skeleton-item">
    <div className="skeleton skeleton-img" />
    <div className="skeleton-info">
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line short" />
    </div>
    <div className="skeleton skeleton-price" />
  </div>
);

// ─── Main Checkout Component ──────────────────────────────────────────────────
export default function Checkout() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [cardFlipped, setCardFlipped] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    notes: "",
  });

  const [card, setCard] = useState({
    holderName: "",
    number: "",
    expiry: "",
    cvv: "",
  });

  const userId = auth?.currentUser?.uid || "guest";

  // ─── Fetch Cart from Firestore ──────────────────────────────────────────────
  useEffect(() => {
    if (!userId || userId === "guest") {
      setLoadingCart(false);
      return;
    }
    const itemsRef = collection(db, "carts", userId, "items");
    const unsub = onSnapshot(itemsRef, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCartItems(items);
      setLoadingCart(false);
    });
    return () => unsub();
  }, [userId]);

  // ─── Derived Totals ────────────────────────────────────────────────────────
  const totalQty = cartItems.reduce((s, i) => s + (i.quantity || 1), 0);
  const subtotal = cartItems.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const shipping = subtotal > 0 ? (subtotal >= 100 ? 0 : 9.99) : 0;
  const total = subtotal + shipping;

  // ─── Form Handlers ─────────────────────────────────────────────────────────
  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleCard = (e) => {
    let { name, value } = e.target;
    if (name === "number") value = formatCardNumber(value);
    if (name === "expiry") value = formatExpiry(value);
    if (name === "cvv") value = value.replace(/\D/g, "").slice(0, 4);
    setCard((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ─── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!card.holderName.trim()) e.holderName = "Cardholder name is required";
    if (card.number.replace(/\s/g, "").length < 16) e.number = "Enter a valid 16-digit card number";
    if (card.expiry.length < 5) e.expiry = "Enter a valid expiry date";
    if (card.cvv.length < 3) e.cvv = "Enter a valid CVV";
    return e;
  };

  // ─── Place Order ───────────────────────────────────────────────────────────
  const placeOrder = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstErrKey = Object.keys(errs)[0];
      document.querySelector(`[name="${firstErrKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    setPlacingOrder(true);
    try {
      // Create order in Firestore
   cartItems.forEach((item, index) => {
  console.log("Item", index, {
    id: item.id,
    name: item.name,
    imageUrl: item.imageUrl,
    price: item.price,
    quantity: item.quantity,
  });
});
      await addDoc(collection(db, "orders"), {
        userId,
        customerName: form.fullName,
        phone: form.phone,
        email: form.email,
        city: form.city,
        address: form.address,
        notes: form.notes,
        paymentMethod: "Visa",
        items: cartItems.map(({ id, name,  price, quantity }) => ({
          id, name,  price, quantity,
        })),
        totalPrice: total,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Clear cart
      const itemsRef = collection(db, "carts", userId, "items");
      const snap = await getDocs(itemsRef);
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "carts", userId, "items", d.id))));

      setOrderSuccess(true);
      setTimeout(() => navigate("/order-success"), 2200);
    } catch (err) {
      console.error("Order failed:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  // ─── Success Overlay ───────────────────────────────────────────────────────
  if (orderSuccess) {
    return (
      <div className="success-overlay">
        <div className="success-card">
          <div className="success-icon-ring">
            <CheckIcon />
          </div>
          <h2>Order Placed!</h2>
          <p>Your order has been placed successfully.<br />Redirecting you now…</p>
          <div className="success-bar">
            <div className="success-bar-fill" />
          </div>
        </div>
      </div>

    );

  
  }

  // ─── Card Preview ─────────────────────────────────────────────────────────
  const CardPreview = () => (
    <div className={`card-preview-scene ${cardFlipped ? "flipped" : ""}`}>
      <div className="card-3d">
        {/* Front */}
        <div className="card-face card-front">
          <div className="card-front-top">
            <span className="card-bank">TechStore</span>
            <VisaLogo />
          </div>
          <div className="card-chip">
            <div className="chip-line" /><div className="chip-line" /><div className="chip-line" />
          </div>
          <div className="card-number-display">
            {(card.number || "•••• •••• •••• ••••").padEnd(19, "•")}
          </div>
          <div className="card-front-bottom">
            <div>
              <span className="card-label">Card Holder</span>
              <span className="card-value">{card.holderName || "FULL NAME"}</span>
            </div>
            <div>
              <span className="card-label">Expires</span>
              <span className="card-value">{card.expiry || "MM/YY"}</span>
            </div>
          </div>
        </div>
        {/* Back */}
        <div className="card-face card-back">
          <div className="card-strip" />
          <div className="card-sig-area">
            <div className="card-sig-line" />
            <div className="card-cvv">
              <span className="card-label">CVV</span>
              <span className="card-value">{card.cvv || "•••"}</span>
            </div>
          </div>
          <div className="card-back-visa"><VisaLogo /></div>
        </div>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="checkout-root">


      {/* Body */}
      <main className="checkout-main">
        {/* LEFT COLUMN */}
        <section className="checkout-form-col">

          {/* ── Customer Information ── */}
          <div className="checkout-block">
            <div className="block-header">
              <span className="block-step">1</span>
              <div>
                <h2 className="block-title">Contact Information</h2>
                <p className="block-sub">We'll use this to send your order updates</p>
              </div>
            </div>

            <div className="form-grid">
              <div className={`field ${errors.fullName ? "field-error" : ""}`}>
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Appleseed"
                  value={form.fullName}
                  onChange={handleForm}
                  autoComplete="name"
                />
                {errors.fullName && <span className="field-msg">{errors.fullName}</span>}
              </div>

              <div className={`field ${errors.email ? "field-error" : ""}`}>
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={handleForm}
                  autoComplete="email"
                />
                {errors.email && <span className="field-msg">{errors.email}</span>}
              </div>

              <div className={`field ${errors.phone ? "field-error" : ""}`}>
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={handleForm}
                  autoComplete="tel"
                />
                {errors.phone && <span className="field-msg">{errors.phone}</span>}
              </div>

              <div className={`field ${errors.city ? "field-error" : ""}`}>
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="San Francisco"
                  value={form.city}
                  onChange={handleForm}
                  autoComplete="address-level2"
                />
                {errors.city && <span className="field-msg">{errors.city}</span>}
              </div>

              <div className={`field field-full ${errors.address ? "field-error" : ""}`}>
                <label htmlFor="address">Full Address</label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  placeholder="1 Infinite Loop, Cupertino, CA 95014"
                  value={form.address}
                  onChange={handleForm}
                  autoComplete="street-address"
                />
                {errors.address && <span className="field-msg">{errors.address}</span>}
              </div>

              <div className="field field-full">
                <label htmlFor="notes">Order Notes <span className="optional">(optional)</span></label>
                <textarea
                  id="notes"
                  name="notes"
                  placeholder="Any special instructions for delivery?"
                  value={form.notes}
                  onChange={handleForm}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* ── Payment ── */}
          <div className="checkout-block">
            <div className="block-header">
              <span className="block-step">2</span>
              <div>
                <h2 className="block-title">Payment</h2>
                <p className="block-sub">All transactions are encrypted and secure</p>
              </div>
            </div>

            {/* Payment method selector */}
            <div className="payment-methods">
              <button className="payment-method selected">
                <VisaLogo />
                <span>Visa / Credit Card</span>
                <div className="payment-selected-dot" />
              </button>
            </div>

            {/* Card Preview */}
            <CardPreview />

            {/* Card Fields */}
            <div className="form-grid">
              <div className={`field field-full ${errors.holderName ? "field-error" : ""}`}>
                <label htmlFor="holderName">Cardholder Name</label>
                <input
                  id="holderName"
                  name="holderName"
                  type="text"
                  placeholder="Name as on card"
                  value={card.holderName}
                  onChange={handleCard}
                  autoComplete="cc-name"
                />
                {errors.holderName && <span className="field-msg">{errors.holderName}</span>}
              </div>

              <div className={`field field-full ${errors.number ? "field-error" : ""}`}>
                <label htmlFor="cardNumber">Card Number</label>
                <div className="card-number-field">
                  <input
                    id="cardNumber"
                    name="number"
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    value={card.number}
                    onChange={handleCard}
                    autoComplete="cc-number"
                  />
                  <VisaLogo />
                </div>
                {errors.number && <span className="field-msg">{errors.number}</span>}
              </div>

              <div className={`field ${errors.expiry ? "field-error" : ""}`}>
                <label htmlFor="expiry">Expiry Date</label>
                <input
                  id="expiry"
                  name="expiry"
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={card.expiry}
                  onChange={handleCard}
                  autoComplete="cc-exp"
                />
                {errors.expiry && <span className="field-msg">{errors.expiry}</span>}
              </div>

              <div className={`field ${errors.cvv ? "field-error" : ""}`}>
                <label htmlFor="cvv">CVV</label>
                <input
                  id="cvv"
                  name="cvv"
                  type="text"
                  inputMode="numeric"
                  placeholder="•••"
                  value={card.cvv}
                  onChange={handleCard}
                  onFocus={() => setCardFlipped(true)}
                  onBlur={() => setCardFlipped(false)}
                  autoComplete="cc-csc"
                />
                {errors.cvv && <span className="field-msg">{errors.cvv}</span>}
              </div>
            </div>

            {/* Secure badge */}
            <div className="secure-banner">
              <LockIcon />
              <span>Your payment information is encrypted with 256-bit SSL</span>
            </div>
          </div>

          {/* Place Order — mobile */}
          <button
            className="place-order-btn mobile-only"
            onClick={placeOrder}
            disabled={placingOrder}
          >
            {placingOrder ? (
              <span className="btn-loading"><span className="spinner" /> Processing…</span>
            ) : (
              <span>Place Order · ${total.toFixed(2)}</span>
            )}
          </button>
        </section>

        {/* RIGHT COLUMN — Order Summary */}
        <aside className="checkout-summary-col">
          <div className="summary-card">
            <h3 className="summary-title">Order Summary</h3>

            {/* Cart items */}
            <div className="summary-items">
              {loadingCart ? (
                <><SkeletonItem /><SkeletonItem /></>
              ) : cartItems.length === 0 ? (
                <p className="empty-cart">Your cart is empty.</p>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="summary-item">
                    <div className="item-image-wrap">
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt={item.name} className="item-image" />
                        : <div className="item-image-placeholder">📦</div>
                      }
                      <span className="item-qty-badge">{item.quantity || 1}</span>
                    </div>
                    <div className="item-info">
                      <p className="item-name">{item.name}</p>
                      <p className="item-unit-price">${(item.price || 0).toFixed(2)} each</p>
                    </div>
                    <p className="item-subtotal">
                      ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="summary-divider" />

            {/* Totals */}
            <div className="summary-row">
              <span>Items ({totalQty})</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span className={shipping === 0 ? "free-shipping" : ""}>
                {shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}
              </span>
            </div>
            {shipping === 0 && subtotal > 0 && (
              <p className="free-shipping-note">🎉 You qualify for free shipping!</p>
            )}

            <div className="summary-divider" />

            <div className="summary-row summary-total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {/* Trust badges */}
            <div className="trust-badges">
              <div className="trust-badge"><span>🔒</span><span>Secure</span></div>
              <div className="trust-badge"><span>↩️</span><span>30-Day Returns</span></div>
              <div className="trust-badge"><span>📦</span><span>Fast Shipping</span></div>
            </div>

            {/* Place Order — desktop */}
            <button
              className="place-order-btn desktop-only"
              onClick={placeOrder}
              disabled={placingOrder}
            >
              {placingOrder ? (
                <span className="btn-loading"><span className="spinner" /> Processing…</span>
              ) : (
                <>
                  <LockIcon />
                  <span>Place Order · ${total.toFixed(2)}</span>
                </>
              )}
            </button>

            <p className="checkout-terms">
              By placing your order, you agree to our{" "}
              <a href="/terms">Terms of Service</a> and{" "}
              <a href="/privacy">Privacy Policy</a>.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}