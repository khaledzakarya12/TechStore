import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../utils/firebaseconfig"; // <-- make sure this path matches your Firebase config file
import { Link } from "react-router-dom";
import { getAuth } from "firebase/auth";
/**
 * Cart
 * Premium black-themed shopping cart page for TechStore.
 * Cart items live in the Firestore "cart" collection and are synced
 * in real time with onSnapshot.
 *
 * Each cart document looks like:
 * { id, name, price, image, quantity, createdAt }
 * (the Firestore document id is the unique key used for updates/removals)
 */
export default function Cart() {
  const navigate = useNavigate();
const [checkingAuth, setCheckingAuth] = useState(true);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [removingId, setRemovingId] = useState(null);
const auth = getAuth();
const user = auth.currentUser;
if (!user) {
  return (
    <div className="cart-page cart-center">
      <div className="cart-empty cart-glass">
        <div className="cart-empty-icon">🔒</div>
        <h2 className="cart-empty-title">Please sign in</h2>
        <p className="cart-empty-text">
          You need to be logged in to view your cart.
        </p>

        <button
          className="cart-btn cart-btn-primary"
          onClick={() => navigate("/authentication")}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
}
  // ---------------------------------------------------------------------
  // Subscribe to the "cart" collection in real time
  // ---------------------------------------------------------------------
 useEffect(() => {
  if (!user) {
    setLoading(false);
    setCheckingAuth(false);
    return;
  }

  const cartRef = collection(db, "carts", user.uid, "items");

  const unsubscribe = onSnapshot(cartRef, (snapshot) => {
    const cartItems = snapshot.docs.map((d) => ({
      docId: d.id,
      ...d.data(),
    }));

    setItems(cartItems);
    setLoading(false);
    setCheckingAuth(false);
  });

  return () => unsubscribe();
}, [user]);
  // ---------------------------------------------------------------------
  // Toast helper
  // ---------------------------------------------------------------------
  const showToast = useCallback((message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 2200);
  }, []);

  // ---------------------------------------------------------------------
  // Quantity & removal handlers (Firestore)
  // ---------------------------------------------------------------------
  const handleIncrease = async (item) => {
    try {
      await updateDoc(doc(
  db,
  "carts",
  user.uid,
  "items",
  item.docId
), {
        quantity: (item.quantity || 1) + 1,
      });
      showToast("Quantity updated");
    } catch (err) {
      console.error("Error increasing quantity:", err);
      showToast("Could not update quantity");
    }
  };

  const handleDecrease = async (item) => {
    if ((item.quantity || 1) <= 1) {
      handleRemove(item);
      return;
    }
    try {
      await updateDoc(doc(
  db,
  "carts",
  user.uid,
  "items",
  item.docId
), {
        quantity: item.quantity - 1,
      });
      showToast("Quantity updated");
    } catch (err) {
      console.error("Error decreasing quantity:", err);
      showToast("Could not update quantity");
    }
  };

  const handleRemove = (item) => {
    setRemovingId(item.docId);
    showToast("Item removed");
    // small delay so the remove animation can play before it's gone
    setTimeout(async () => {
      try {
        await deleteDoc(doc(
  db,
  "carts",
  user.uid,
  "items",
  item.docId
));
      } catch (err) {
        console.error("Error removing item:", err);
        showToast("Could not remove item");
      } finally {
        setRemovingId(null);
      }
    }, 280);
  };

  // ---------------------------------------------------------------------
  // Totals
  // ---------------------------------------------------------------------
  const formatPrice = (price) => {
    const value = Number(price) || 0;
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1),
    0
  );
  const total = subtotal; // extend here for shipping/tax/discounts if needed
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // ---------------------------------------------------------------------
  // Checkout
  // ---------------------------------------------------------------------
  const handleCheckout = () => {
    if (items.length === 0) return;
    navigate("/checkout");
  };

  // ---------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------
  if (loading) {
    return (
      <div className="cart-page cart-center">
        <div className="cart-loader" />
        <p className="cart-muted">Loading your cart...</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Empty cart state
  // ---------------------------------------------------------------------
  if (items.length === 0) {
    return (
      <div className="cart-page">
        <div className="cart-empty cart-glass">
          <div className="cart-empty-icon">🛒</div>
          <h2 className="cart-empty-title">Your cart is empty</h2>
          <p className="cart-empty-text">
            Looks like you haven't added anything yet. Explore our products
            and find something you love.
          </p>
          <button className="cart-btn cart-btn-primary" onClick={() => navigate("/products")}>
            Start Shopping
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="cart-page">
      {/* Toast notification */}
      <div className={`cart-toast ${toast.visible ? "cart-toast-show" : ""}`}>
        {toast.message}
      </div>

      <header className="cart-header">
        <h1 className="cart-title">Shopping Cart</h1>
        <p className="cart-subtitle">
          {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
        </p>
      </header>

      <div className="cart-layout">
        {/* Cart items list */}
        <div className="cart-items">
          {items.map((item) => (
            <div
              key={item.docId}
              className={`cart-item cart-glass ${
                removingId === item.docId ? "cart-item-removing" : ""
              }`}
            >
              <div className="cart-item-image-wrap">
                <img
                    src={item.imageUrl || "https://via.placeholder.com/300x300?text=No+Image"}
                    alt={item.name || item.title}
                    className="pp-related-image"
                  />
              </div>

              <div className="cart-item-info">
                <h3 className="cart-item-name">{item.name}</h3>
                <span className="cart-item-price">{formatPrice(item.price)}</span>
              </div>

              <div className="cart-item-quantity">
                <button
                  className="cart-qty-btn"
                  onClick={() => handleDecrease(item)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="cart-qty-value">{item.quantity}</span>
                <button
                  className="cart-qty-btn"
                  onClick={() => handleIncrease(item)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <div className="cart-item-line-total">
                {formatPrice((Number(item.price) || 0) * (item.quantity || 1))}
              </div>

              <button
                className="cart-remove-btn"
                onClick={() => handleRemove(item)}
                aria-label="Remove item"
              >
                🗑
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <aside className="cart-summary cart-glass">
          <h2 className="cart-summary-title">Order Summary</h2>

          <div className="cart-summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="cart-summary-row cart-summary-muted">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>

          <div className="cart-summary-divider" />

          <div className="cart-summary-total">
            <span>Total</span>
            <span className="cart-total-value">{formatPrice(total)}</span>
          </div>
<Link to="/checkout" className="cart-btn cart-btn-primary" onClick={handleCheckout} style={{color
  :"#fff"
}}>
            Proceed to Checkout
          </Link>
          

          <button className="cart-btn cart-btn-ghost" onClick={() => navigate("/")}>
            Continue Shopping
          </button>
        </aside>
      </div>
    </div>
  );
}