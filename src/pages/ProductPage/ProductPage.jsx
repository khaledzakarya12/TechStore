/**
 * TechStore — Products Page
 * React + Firebase Firestore + React Router
 * Single-file, production-ready
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "./../../utils/firebaseconfig";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const PAGE_SIZE = 5;

const CATEGORIES = [
  { id: "Laptops", label: "Laptops", emoji: "💻" },
  { id: "Phones", label: "Phones", emoji: "📱" },
  { id: "Gaming", label: "Gaming", emoji: "🎮" },
  { id: "Accessories", label: "Accessories", emoji: "🎧" },
  { id: "watch", label: "Watch", emoji: "⌚" },
  { id: "Tablets", label: "Tablets", emoji: "📲" },
  { id: "Cameras", label: "Cameras", emoji: "📷" },
  { id: "Audio", label: "Audio", emoji: "🔊" },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function isNewProduct(createdAt) {
  if (!createdAt) return false;
  const ts = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
  const diff = Date.now() - ts.getTime();
  return diff < 1000 * 60 * 60 * 24 * 14; // 14 days
}

// ─────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────

/** Current Firebase auth user */
function useAuthUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);
  return user;
}

/** Firestore cart — real-time listener */
function useCart(userId) {
  const [cartItems, setCartItems] = useState({});

  useEffect(() => {
    if (!userId) { setCartItems({}); return; }
    const ref = collection(db, "carts", userId, "items");
    return onSnapshot(ref, (snap) => {
      const map = {};
      snap.forEach((d) => { map[d.id] = d.data(); });
      setCartItems(map);
    });
  }, [userId]);

  const addToCart = useCallback(
  async (product) => {
    if (!userId) {
      alert("Please sign in to add items to cart.");
      return false;
    }

    const itemRef = doc(db, "carts", userId, "items", product.id);
    const snap = await getDoc(itemRef);

    if (snap.exists()) {
      await updateDoc(itemRef, {
        quantity: increment(1),
      });
    } else {
      await setDoc(itemRef, {
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl || "",
        quantity: 1,
        addedAt: serverTimestamp(),
      });
    }

    return true;
  },
  [userId]
);
  const totalCount = useMemo(
    () => Object.values(cartItems).reduce((s, i) => s + (i.quantity || 0), 0),
    [cartItems]
  );

  return { cartItems, addToCart, totalCount };
}

/** Per-category Firestore pagination */
function useCategoryProducts(categoryId) {
  const [products, setProducts]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [hasMore, setHasMore]           = useState(true);
  const lastDocRef                      = useRef(null);

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "products"),
        where("category", "==", categoryId),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setProducts(docs);
      setHasMore(docs.length === PAGE_SIZE);
    } catch (e) {
      console.error(`[${categoryId}] fetch error:`, e);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  const fetchMore = useCallback(async () => {
    if (!lastDocRef.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "products"),
        where("category", "==", categoryId),
        orderBy("createdAt", "desc"),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
      
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setProducts((prev) => [...prev, ...docs]);
      setHasMore(docs.length === PAGE_SIZE);
    } catch (e) {
      console.error(`[${categoryId}] load more error:`, e);
    } finally {
      setLoadingMore(false);
    }
  }, [categoryId, loadingMore]);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  return { products, loading, loadingMore, hasMore, fetchMore };
}

// ─────────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="ts-card ts-card--skeleton" aria-hidden="true">
      <div className="ts-card__image-wrap ts-skeleton" />
      <div className="ts-card__body">
        <div className="ts-skeleton ts-skeleton--badge" />
        <div className="ts-skeleton ts-skeleton--title" />
        <div className="ts-skeleton ts-skeleton--sub" />
        <div className="ts-skeleton ts-skeleton--price" />
        <div className="ts-skeleton ts-skeleton--btn" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PRODUCT CARD
// ─────────────────────────────────────────────
function ProductCard({ product, onAddToCart, inCart }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded]   = useState(false);

  const handleAdd = async () => {
  if (!onAddToCart) return;

  setAdding(true);

  const success = await onAddToCart(product);

  setAdding(false);

  if (success) {
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }
};

  const newBadge = isNewProduct(product.createdAt);

  return (
    <article className="ts-card">
      <Link to={`/product/${product.id}`} className="ts-card__image-link">
        <div className="ts-card__image-wrap">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="ts-card__image"
              loading="lazy"
            />
          ) : (
            <div className="ts-card__image-placeholder">
              <span>📦</span>
            </div>
          )}
          <div className="ts-card__badges">
            {newBadge && <span className="ts-badge ts-badge--new">New</span>}
            <span className="ts-badge ts-badge--cat">
              {CATEGORIES.find((c) => c.id === product.category)?.emoji}{" "}
              {product.category}
            </span>
          </div>
        </div>
      </Link>

      <div className="ts-card__body">
        <Link to={`/product/${product.id}`} className="ts-card__name-link">
          <h3 className="ts-card__name">{product.name}</h3>
        </Link>
        {product.description && (
          <p className="ts-card__desc">{product.description}</p>
        )}
        <div className="ts-card__price">
          ${Number(product.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>

        <div className="ts-card__actions">
          <Link to={`/product/${product.id}`} className="ts-btn ts-btn--ghost">
            View Product
          </Link>
          <button
            className={`ts-btn ts-btn--primary ${added ? "ts-btn--added" : ""}`}
            onClick={handleAdd}
            disabled={adding}
            aria-label={`Add ${product.name} to cart`}
          >
            {adding ? (
              <span className="ts-btn__spinner" />
            ) : added ? (
              "✓ Added"
            ) : inCart ? (
              `In Cart (${inCart})`
            ) : (
              "Add to Cart"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────
// CATEGORY SECTION
// ─────────────────────────────────────────────
function CategorySection({ category, searchQuery, onAddToCart, cartItems }) {
  const { products, loading, loadingMore, hasMore, fetchMore } =
    useCategoryProducts(category.id);

  const displayed = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  // Hide section entirely when searching and no results in this category
  if (searchQuery && displayed.length === 0 && !loading) return null;

  return (
    <section className="ts-category" id={`cat-${category.id}`}>
      <div className="ts-category__head">
        <div className="ts-category__title-group">
          <span className="ts-category__emoji">{category.emoji}</span>
          <h2 className="ts-category__title">{category.label}</h2>
        </div>
        <span className="ts-category__count">
          {loading ? "…" : `${displayed.length} products`}
        </span>
      </div>

      <div className="ts-grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : displayed.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                inCart={cartItems[product.id]?.quantity || 0}
              />
            ))}
      </div>

      {!loading && displayed.length === 0 && !searchQuery && (
        <div className="ts-empty">
          <span className="ts-empty__icon">{category.emoji}</span>
          <p className="ts-empty__text">No {category.label} yet.</p>
        </div>
      )}

      {!searchQuery && hasMore && !loading && (
        <div className="ts-show-more">
          <button
            className="ts-btn ts-btn--outline ts-btn--lg"
            onClick={fetchMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <span className="ts-btn__spinner" /> Loading…
              </>
            ) : (
              `Show More ${category.label}`
            )}
          </button>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────
// SEARCH BAR
// ─────────────────────────────────────────────
function SearchBar({ value, onChange }) {
  const inputRef = useRef(null);

  return (
    <div className="ts-search" role="search">
      <div className="ts-search__inner">
        <svg
          className="ts-search__icon"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          className="ts-search__input"
          placeholder="Search products…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Search products"
        />
        {value && (
          <button
            className="ts-search__clear"
            onClick={() => { onChange(""); inputRef.current?.focus(); }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CART ICON (top-right)
// ─────────────────────────────────────────────
function CartIcon({ count }) {
  return (
    <Link to="/cart" className="ts-cart-icon" aria-label={`Cart, ${count} items`}>
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <path
          d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        />
        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {count > 0 && (
        <span className="ts-cart-icon__badge">{count > 99 ? "99+" : count}</span>
      )}
    </Link>
  );
}

// ─────────────────────────────────────────────
// CATEGORY NAV (sticky jump links)
// ─────────────────────────────────────────────
function CategoryNav({ active, setSelectedCategory }) {
  const scrollTo = (id) => {
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="ts-cat-nav" aria-label="Product categories">
      <div className="ts-cat-nav__inner">

        {/* ALL button */}
        <button
          className={`ts-cat-nav__btn ${!active ? "ts-cat-nav__btn--active" : ""}`}
          onClick={() => setSelectedCategory(null)}
        >
          🌐 All
        </button>

        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`ts-cat-nav__btn ${active === c.id ? "ts-cat-nav__btn--active" : ""}`}
            onClick={() => {
              setSelectedCategory(c.id);
              scrollTo(c.id);
            }}
          >
            <span>{c.emoji}</span> {c.label}
          </button>
        ))}

      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────


// ─────────────────────────────────────────────
// PRODUCTS PAGE
// ─────────────────────────────────────────────
export default function Products() {
  const user                                = useAuthUser();
  const { cartItems, addToCart, totalCount } = useCart(user?.uid);
  const [search, setSearch]                 = useState("");
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
const [selectedCategory, setSelectedCategory] = useState(null);
const navigate = useNavigate();
  // Track visible section via IntersectionObserver
  useEffect(() => {
    const observers = [];
    CATEGORIES.forEach(({ id }) => {
      const el = document.getElementById(`cat-${id}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveCategory(id); },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="ts-page">
      

      <div className="ts-hero-bar">
        <div className="ts-hero-bar__inner">
          <h1 className="ts-hero-bar__title">All Products</h1>
          <p className="ts-hero-bar__sub">
            Discover our full catalog of premium tech
          </p>
        </div>
      </div>

      <div className="ts-sticky-bar">
        <div className="ts-sticky-bar__inner">
          <SearchBar value={search} onChange={setSearch} />
          {!search && <CategoryNav 
  active={selectedCategory} 
  setSelectedCategory={setSelectedCategory} 
/>}
        </div>
      </div>

      <main className="ts-main">
        <div className="ts-container">
          {search && (
            <p className="ts-search-label">
              Results for <strong>"{search}"</strong>
            </p>
          )}

          {CATEGORIES
  .filter((cat) => !selectedCategory || cat.id === selectedCategory)
  .map((cat) => (
    <CategorySection
      key={cat.id}
      category={cat}
      searchQuery={search}
      onAddToCart={addToCart}
      cartItems={cartItems}
    />
))}
        </div>
      </main>

      <footer className="ts-footer">
        <p>© {new Date().getFullYear()} TechStore. All rights reserved.</p>
      </footer>
    </div>
  );
}