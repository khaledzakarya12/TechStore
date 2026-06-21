import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  addDoc,
   setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../utils/firebaseconfig"; // <-- make sure this path matches your Firebase config file
;
import { getAuth } from "firebase/auth";
/**
 * ProductPage
 * Premium black-themed e-commerce product detail page.
 * Route: /product/:id
 */
export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });

  // ---------------------------------------------------------------------
  // Toast helper
  // ---------------------------------------------------------------------
  const showToast = useCallback((message) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: "" }), 2600);
  }, []);

  // ---------------------------------------------------------------------
  // Fetch product by ID
  // ---------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const productRef = doc(db, "products", id);
        const snapshot = await getDoc(productRef);

        if (!snapshot.exists()) {
          if (isMounted) {
            setError("Product not found.");
            setProduct(null);
            setLoading(false);
          }
          return;
        }

        const data = { id: snapshot.id, ...snapshot.data() };
        if (isMounted) setProduct(data);
      } catch (err) {
        console.error("Error fetching product:", err);
        if (isMounted) setError("Something went wrong while loading the product.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // ---------------------------------------------------------------------
  // Fetch related products (same category, excluding current product)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!product?.category) {
      setRelatedProducts([]);
      return;
    }

    let isMounted = true;

    const fetchRelated = async () => {
      try {
        const productsRef = collection(db, "products");
        const q = query(
          productsRef,
          where("category", "==", product.category),
          limit(5) // fetch one extra in case current product is included
        );
        const snapshot = await getDocs(q);

        const items = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((item) => item.id !== product.id)
          .slice(0, 4);

        if (isMounted) setRelatedProducts(items);
      } catch (err) {
        console.error("Error fetching related products:", err);
      }
    };

    fetchRelated();

    return () => {
      isMounted = false;
    };
  }, [product]);

  // ---------------------------------------------------------------------
  // Add to cart (Firestore)
  // ---------------------------------------------------------------------
  const handleAddToCart = async () => {
  if (!product) return;

  const user = getAuth().currentUser;

  if (!user) {
    showToast("Please sign in first");
    return;
  }

  setAdding(true);

  try {
    const itemRef = doc(db, "carts", user.uid, "items", product.id);
    const snap = await getDoc(itemRef);

    if (snap.exists()) {
      await updateDoc(itemRef, {
        quantity: increment(1),
      });
    } else {
      await setDoc(itemRef, {
        id: product.id,
        name: product.name || product.title || "Untitled product",
        price: product.price ?? 0,
        imageUrl: product.imageUrl || "",
        quantity: 1,
        createdAt: serverTimestamp(),
      });
    }

    showToast("Added to cart successfully ✅");
  } catch (err) {
    console.error("Error adding to cart:", err);
    showToast("Could not add to cart. Try again.");
  } finally {
    setTimeout(() => setAdding(false), 500);
  }
};
  // ---------------------------------------------------------------------
  // Share product link
  // ---------------------------------------------------------------------
  const handleShare = async () => {
    const link = `${window.location.origin}/product/${id}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast("Link copied! 🔗");
    } catch (err) {
      console.error("Error copying link:", err);
      showToast("Could not copy link.");
    }
  };

  // ---------------------------------------------------------------------
  // Price formatter
  // ---------------------------------------------------------------------
  const formatPrice = (price) => {
    const value = Number(price) || 0;
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // ---------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------
  if (loading) {
    return (
      <div className="pp-page pp-center">
        <div className="pp-loader" />
        <p className="pp-muted">Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="pp-page pp-center">
        <div className="pp-glass pp-error-card">
          <h2>{error || "Product not found."}</h2>
          <button className="pp-btn pp-btn-ghost" onClick={() => navigate("/")}>
            ← Back to Shop
          </button>
        </div>
      </div>
    );
  }

  const title = product.name || product.title || "Untitled product";

  return (
    <div className="pp-page">
      {/* Toast notification */}
      <div className={`pp-toast ${toast.visible ? "pp-toast-show" : ""}`}>
        {toast.message}
      </div>

      {/* Main product section */}
      <section className="pp-hero">
        {/* Left: image */}
        <div className="pp-image-wrap pp-glass">
          <div className="pp-image-glow" />
          <img
            src={product.imageUrl || "https://via.placeholder.com/600x600?text=No+Image"}
            alt={title}
            className="pp-image"
          />
        </div>

        {/* Right: info */}
        <div className="pp-info pp-glass">
          {product.category && (
            <span className="pp-badge">{product.category}</span>
          )}

          <h1 className="pp-title">{title}</h1>

          <div className="pp-price-wrap">
            <span className="pp-price">{formatPrice(product.price)}</span>
          </div>

          {product.description && (
            <p className="pp-description">{product.description}</p>
          )}

          <div className="pp-actions">
            <button
              className={`pp-btn pp-btn-primary ${adding ? "pp-btn-success" : ""}`}
              onClick={handleAddToCart}
              disabled={adding}
              style={{ color: adding ? "#0f0" : "#fff" }}
            >
              {adding ? "Added ✓" : "Add to Cart"}
            </button>

            <button className="pp-btn pp-btn-secondary" onClick={handleShare}>
              Share
            </button>
          </div>
        </div>
      </section>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="pp-related">
          <h2 className="pp-related-title">You may also like</h2>
          <div className="pp-related-grid">
            {relatedProducts.map((item) => (
              <div
                key={item.id}
                className="pp-related-card pp-glass"
                onClick={() => navigate(`/product/${item.id}`)}
              >
                <div className="pp-related-image-wrap">
                  <img
                    src={item.imageUrl || "https://via.placeholder.com/300x300?text=No+Image"}
                    alt={item.name || item.title}
                    className="pp-related-image"
                  />
                </div>
                <div className="pp-related-info">
                  <h3 className="pp-related-name">{item.name || item.title}</h3>
                  <span className="pp-related-price">{formatPrice(item.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}