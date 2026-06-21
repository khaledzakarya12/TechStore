/**
 * TechStore — Categories Section
 * React + Firebase Firestore + React Router
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "./../../utils/firebaseconfig";


// ─────────────────────────────────────────────
// FALLBACK ICONS (when no image is provided)
// ─────────────────────────────────────────────
const CATEGORY_ICONS = {
  laptops:       "💻",
  phones:        "📱",
  gaming:        "🎮",
  accessories:   "🎧",
  "smart-watches": "⌚",
  tablets:       "📲",
  cameras:       "📷",
  audio:         "🔊",
  default:       "📦",
};

// ─────────────────────────────────────────────
// SCROLL REVEAL HOOK
// ─────────────────────────────────────────────
function useRevealOnScroll(count) {
  const refs  = useRef([]);
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    if (!count) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.dataset.idx);
            setVisible((prev) =>
              prev.includes(idx) ? prev : [...prev, idx]
            );
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [count]);

  const setRef = (el, i) => { refs.current[i] = el; };
  return { visible, setRef };
}

// ─────────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="cat-card cat-card--skeleton" aria-hidden="true">
      <div className="cat-card__img-wrap cat-skeleton" />
      <div className="cat-card__body">
        <div className="cat-skeleton cat-skeleton--title" />
        <div className="cat-skeleton cat-skeleton--sub" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CATEGORY CARD
// ─────────────────────────────────────────────
function CategoryCard({ category, index, isVisible }) {
  const navigate    = useNavigate();
  const [imgError, setImgError] = useState(false);
  const icon        = CATEGORY_ICONS[category.slug] || CATEGORY_ICONS.default;
  const hasImage    = category.image && !imgError;

  const handleClick = () => {
    navigate(`/category/${category.slug}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      className={`cat-card ${isVisible ? "cat-card--visible" : ""}`}
      style={{ transitionDelay: `${(index % 6) * 60}ms` }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Browse ${category.name}`}
    >
      {/* Image area */}
      <div className="cat-card__img-wrap">
        {hasImage ? (
          <img
            src={category.image}
            alt={category.name}
            className="cat-card__img"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="cat-card__icon">{icon}</div>
        )}
        <div className="cat-card__overlay" />
        <div className="cat-card__explore">
          <span className="cat-card__explore-text">Explore</span>
          <svg
            className="cat-card__arrow"
            viewBox="0 0 16 16"
            fill="none"
            width="14"
            height="14"
            aria-hidden="true"
          >
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Text body */}
      <div className="cat-card__body">
        <h3 className="cat-card__name">{category.name}</h3>
        {category.productCount != null && (
          <span className="cat-card__count">
            {category.productCount.toLocaleString()} product
            {category.productCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────
// CATEGORIES SECTION
// ─────────────────────────────────────────────
export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const { visible, setRef } = useRevealOnScroll(categories.length);

  // Fetch from Firestore
  useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      const snap = await getDocs(collection(db, "products"));

      const cats = {};

      snap.docs.forEach((doc) => {
        const data = doc.data();

        if (!data.category) return;

        const key = data.category.toLowerCase();

        if (!cats[key]) {
          cats[key] = {
            id: key,
            name: data.category,
            slug: key,
            image: data.imageUrl || "",
            productCount: 0,
          };
        }

        cats[key].productCount++;
      });

      if (!cancelled) {
        setCategories(Object.values(cats));
      }
    } catch (e) {
      console.error(e);
      if (!cancelled) setError(e.message);
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();

  return () => {
    cancelled = true;
  };
}, []);

  return (
    <section className="cat-section" aria-label="Product categories">
      <div className="cat-container">

        {/* Section head */}
        <div className="cat-head">
          <span className="cat-eyebrow">Browse by Category</span>
          <h2 className="cat-title">Shop by Collection</h2>
          <p className="cat-sub">
            Explore our full lineup of premium technology, organized for you.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="cat-error">
            <span>⚠️</span>
            <p>Failed to load categories. <button onClick={() => window.location.reload()}>Retry</button></p>
          </div>
        )}

        {/* Grid */}
        <div className="cat-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : categories.map((cat, i) => (
                <div
                  key={cat.id}
                  data-idx={i}
                  ref={(el) => setRef(el, i)}
                >
                  <CategoryCard
                    category={cat}
                    index={i}
                    isVisible={visible.includes(i)}
                  />
                </div>
              ))}
        </div>

        {/* Empty state */}
        {!loading && !error && categories.length === 0 && (
          <div className="cat-empty">
            <span className="cat-empty__icon">🗂️</span>
            <p>No categories found.</p>
          </div>
        )}
      </div>
    </section>
  );
}