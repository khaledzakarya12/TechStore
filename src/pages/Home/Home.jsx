import React, { useEffect, useRef, useState, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox, MeshDistortMaterial, Float, Sphere } from "@react-three/drei";
import * as THREE from "three";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import {db} from "../../utils/firebaseconfig";

// ─────────────────────────────────────────────
// Mock Products (fallback if Firebase empty)
// ─────────────────────────────────────────────
const MOCK_PRODUCTS = [
  { id: "1", name: "iPhone 16 Pro", price: 1199, category: "Phones", rating: 4.9, image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80" },
  { id: "2", name: "MacBook Pro M4", price: 2499, category: "Laptops", rating: 4.8, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80" },
  { id: "3", name: "AirPods Pro 3", price: 299, category: "Audio", rating: 4.7, image: "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=400&q=80" },
  { id: "4", name: "Apple Watch Ultra", price: 899, category: "Wearables", rating: 4.8, image: "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400&q=80" },
  { id: "5", name: "iPad Pro M4", price: 1099, category: "Tablets", rating: 4.9, image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&q=80" },
  { id: "6", name: "Samsung Galaxy S25", price: 999, category: "Phones", rating: 4.7, image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&q=80" },
];

const CATEGORIES = [
  { label: "Phones", icon: "📱" },
  { label: "Laptops", icon: "💻" },
  { label: "Audio", icon: "🎧" },
  { label: "Wearables", icon: "⌚" },
  { label: "Tablets", icon: "📲" },
  { label: "Accessories", icon: "🔌" },
];

const STATS = [
  { value: "2M+", label: "Happy Customers" },
  { value: "50K+", label: "Products Sold" },
  { value: "4.9★", label: "Average Rating" },
  { value: "24/7", label: "Support" },
];

// ─────────────────────────────────────────────
// Three.js 3D Hero Scene
// ─────────────────────────────────────────────
function FloatingDevice() {
  const meshRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.position.y = Math.sin(t * 0.8) * 0.12;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 1.5) * 0.05);
    }
  });

  return (
    <group>
      {/* Glow sphere behind device */}
      <Sphere ref={glowRef} args={[1.2, 32, 32]}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.03} />
      </Sphere>

      {/* Main phone body */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
        <group ref={meshRef}>
          {/* Phone chassis */}
          <RoundedBox args={[1.4, 2.8, 0.14]} radius={0.12} smoothness={8}>
            <meshPhysicalMaterial
              color="#1a1a1a"
              metalness={0.95}
              roughness={0.05}
              reflectivity={1}
              clearcoat={1}
              clearcoatRoughness={0.05}
            />
          </RoundedBox>

          {/* Screen */}
          <RoundedBox args={[1.18, 2.52, 0.01]} radius={0.1} position={[0, 0, 0.08]}>
            <meshPhysicalMaterial
              color="#000510"
              metalness={0.1}
              roughness={0}
              emissive="#0066ff"
              emissiveIntensity={0.08}
              clearcoat={1}
            />
          </RoundedBox>

          {/* Dynamic Island */}
          <RoundedBox args={[0.32, 0.1, 0.02]} radius={0.05} position={[0, 1.1, 0.09]}>
            <meshBasicMaterial color="#000000" />
          </RoundedBox>

          {/* Camera module */}
          <RoundedBox args={[0.42, 0.42, 0.04]} radius={0.08} position={[-0.3, 1.0, -0.09]}>
            <meshPhysicalMaterial color="#111" metalness={0.9} roughness={0.1} />
          </RoundedBox>
          <Sphere args={[0.08, 16, 16]} position={[-0.22, 1.08, -0.07]}>
            <meshPhysicalMaterial color="#050510" metalness={0.3} roughness={0} clearcoat={1} />
          </Sphere>
          <Sphere args={[0.08, 16, 16]} position={[-0.38, 1.08, -0.07]}>
            <meshPhysicalMaterial color="#050510" metalness={0.3} roughness={0} clearcoat={1} />
          </Sphere>
          <Sphere args={[0.06, 16, 16]} position={[-0.3, 0.95, -0.07]}>
            <meshPhysicalMaterial color="#050510" metalness={0.3} roughness={0} clearcoat={1} />
          </Sphere>
        </group>
      </Float>

      {/* Orbiting particles */}
      {[...Array(6)].map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const r = 2.2;
        return (
          <ParticleOrbit key={i} index={i} angle={angle} radius={r} />
        );
      })}
    </group>
  );
}

function ParticleOrbit({ index, angle, radius }) {
  const ref = useRef();
  const speed = 0.2 + index * 0.03;
  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed;
    if (ref.current) {
      ref.current.position.x = Math.cos(t + angle) * radius;
      ref.current.position.z = Math.sin(t + angle) * radius;
      ref.current.position.y = Math.sin(t * 0.7 + index) * 0.5;
    }
  });
  return (
    <Sphere ref={ref} args={[0.04, 8, 8]}>
      <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
    </Sphere>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-3, 2, 3]} intensity={0.8} color="#4488ff" />
      <pointLight position={[3, -2, -3]} intensity={0.5} color="#ffffff" />
      <FloatingDevice />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
        autoRotate={false}
      />
    </>
  );
}

// ─────────────────────────────────────────────
// Reusable Components
// ─────────────────────────────────────────────
function StarRating({ rating }) {
  return (
    <div className="ts-stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= Math.round(rating) ? "star filled" : "star"}>★</span>
      ))}
      <span className="rating-num">{rating}</span>
    </div>
  );
}

function ProductCard({ product, onClick, index }) {
  return (
    <motion.div
      className="ts-product-card"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      viewport={{ once: true }}
      whileHover={{ y: -8, scale: 1.02 }}
      onClick={() => onClick(product.id)}
    >
      <div className="ts-card-image-wrap">
        <img src={product.imageUrl} alt={product.name} className="ts-card-image" />
        <div className="ts-card-badge">{product.category}</div>
      </div>
      <div className="ts-card-body">
        <h3 className="ts-card-name">{product.name}</h3>
        <StarRating rating={product.rating} />
        <div className="ts-card-footer">
          <span className="ts-card-price">${product.price.toLocaleString()}</span>
          <motion.button
            className="ts-card-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={(e) => { e.stopPropagation(); onClick(product.id); }}
          >
            View
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Main Home Component
// ─────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, -120]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  // Firebase realtime listener
  useEffect(() => {
    let unsub;
    try {
      unsub = onSnapshot(collection(db, "products"), (snap) => {
        if (snap.empty) {
          setProducts(MOCK_PRODUCTS);
        } else {
          const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setProducts(items);
        }
        setLoading(false);
      }, () => {
        setProducts(MOCK_PRODUCTS);
        setLoading(false);
      });
    } catch {
      setProducts(MOCK_PRODUCTS);
      setLoading(false);
    }
    return () => unsub && unsub();
  }, []);

  const filteredProducts = activeCategory === "All"
    ? products
    : products.filter((p) => p.category === activeCategory);

  const featured = Object.values(
  products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = product;
    }
    return acc;
  }, {})
);
  const bestSellers = products.slice(0, 4);

  return (
    <div className="ts-home">

     
      {/* ── HERO ── */}
      <section className="ts-hero">
        <motion.div className="ts-hero-content" style={{ y: heroY, opacity: heroOpacity }}>
          <motion.div
            className="ts-hero-eyebrow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            ✦ Next Generation Technology
          </motion.div>
          <motion.h1
            className="ts-hero-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Discover The
            <span className="ts-hero-gradient"> Future </span>
            of Technology
          </motion.h1>
          <motion.p
            className="ts-hero-sub"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            Premium devices crafted for those who demand excellence. <br />
            Where innovation meets luxury.
          </motion.p>
          <motion.div
            className="ts-hero-btns"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <motion.button
              className="ts-btn-primary"
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(255,255,255,0.3)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/products")}
            >
              Shop Now →
            </motion.button>
            <motion.button
              className="ts-btn-ghost"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/contact")}
            >
              Contact Us
            </motion.button>
          </motion.div>
          <motion.div
            className="ts-hero-scroll-hint"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          >
            ↓
          </motion.div>
        </motion.div>

        {/* 3D Canvas */}
        <div className="ts-hero-canvas">
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 1.5]}>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
          <div className="ts-canvas-glow" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="ts-stats-section">
        <div className="ts-stats-inner">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              className="ts-stat-item"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <span className="ts-stat-value">{s.value}</span>
              <span className="ts-stat-label">{s.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="ts-section ts-categories-section">
        <motion.div
          className="ts-section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="ts-section-eyebrow">Browse By</p>
          <h2 className="ts-section-title">Categories</h2>
        </motion.div>
        <div className="ts-categories-grid">
          {CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat.label}
              className={`ts-category-card ${activeCategory === cat.label ? "active" : ""}`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 }}
              viewport={{ once: true }}
              whileHover={{ y: -4, scale: 1.04 }}
              onClick={() => setActiveCategory(activeCategory === cat.label ? "All" : cat.label)}
            >
              <span className="ts-cat-icon">{cat.icon}</span>
              <span className="ts-cat-label">{cat.label}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── FEATURED ── */}
      <section className="ts-section ts-featured-section">
        <motion.div
          className="ts-section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="ts-section-eyebrow">Hand-Picked</p>
          <h2 className="ts-section-title">Featured Products</h2>
        </motion.div>

        {loading ? (
          <div className="ts-loading">
            <div className="ts-spinner" />
            <span>Loading products…</span>
          </div>
        ) : (
          <div className="ts-products-grid">
            {featured.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                onClick={(id) => navigate(`/product/${id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── DEALS BANNER ── */}
      <section className="ts-deals-banner">
        <motion.div
          className="ts-deals-inner"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
        >
          <div className="ts-deals-content">
            <span className="ts-deals-badge">LIMITED OFFER</span>
            <h2 className="ts-deals-title">Up to 40% Off<br />Premium Tech</h2>
            <p className="ts-deals-sub">Exclusive deals on Apple, Samsung & more. This weekend only.</p>
            <motion.button
              className="ts-btn-primary"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/products")}
            >
              Claim Deal →
            </motion.button>
          </div>
          <div className="ts-deals-visual">
            <div className="ts-deals-ring ts-deals-ring-1" />
            <div className="ts-deals-ring ts-deals-ring-2" />
            <div className="ts-deals-ring ts-deals-ring-3" />
            <span className="ts-deals-pct">40%</span>
            <span className="ts-deals-off">OFF</span>
          </div>
        </motion.div>
      </section>

      {/* ── BEST SELLERS ── */}
      <section className="ts-section ts-bestsellers-section">
        <motion.div
          className="ts-section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="ts-section-eyebrow">Top Rated</p>
          <h2 className="ts-section-title">Best Sellers</h2>
        </motion.div>
        <div className="ts-bestsellers-list">
          {bestSellers.map((p, i) => (
            <motion.div
              key={p.id}
              className="ts-bestseller-row"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ x: 6 }}
              onClick={() => navigate(`/product/${p.id}`)}
            >
              <span className="ts-bs-rank">0{i + 1}</span>
              <img src={p.image} alt={p.name} className="ts-bs-img" />
              <div className="ts-bs-info">
                <span className="ts-bs-name">{p.name}</span>
                <StarRating rating={p.rating} />
              </div>
              <span className="ts-bs-price">${p.price.toLocaleString()}</span>
              <span className="ts-bs-arrow">→</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="ts-footer">
        <div className="ts-footer-inner">
          <div className="ts-footer-brand">
            <div className="ts-logo">
              <span className="ts-logo-icon">⬡</span>
              <span className="ts-logo-text">TechStore</span>
            </div>
            <p className="ts-footer-tagline">Where luxury meets technology.</p>
            <div className="ts-footer-socials">
              {["𝕏", "in", "ig", "yt"].map((s) => (
                <a key={s} href="#" className="ts-social-btn">{s}</a>
              ))}
            </div>
          </div>
          <div className="ts-footer-cols">
            {[
              { title: "Shop", links: ["iPhones", "MacBooks", "Accessories", "Deals"] },
              { title: "Company", links: ["About", "Careers", "Press", "Blog"] },
              { title: "Support", links: ["Contact", "FAQ", "Returns", "Warranty"] },
            ].map((col) => (
              <div key={col.title} className="ts-footer-col">
                <h4 className="ts-footer-col-title">{col.title}</h4>
                {col.links.map((l) => (
                  <Link key={l} to='/' className="ts-footer-col-link">{l}</Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="ts-footer-bottom">
          <span>© 2026 TechStore. All rights reserved.</span>
          <span>Privacy · Terms · Cookies</span>
        </div>
      </footer>
    </div>
  );
}