import { useEffect, useRef, useState } from "react";
import { motion, useInView, useAnimation, animate } from "framer-motion";
import {Link} from "react-router-dom";
// ── Shared animation variants ──────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 48 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (delay = 0) => ({
    opacity: 1,
    transition: { duration: 0.8, ease: "easeOut", delay },
  }),
};

// ── Scroll-triggered wrapper ───────────────────────────────────────────────
function Reveal({ children, variants = fadeUp, delay = 0, className = "", threshold = 0.15 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: threshold });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      custom={delay}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

// ── Animated counter ───────────────────────────────────────────────────────
function Counter({ end, suffix = "", label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, end, {
      duration: 2,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.floor(v)),
    });
    return controls.stop;
  }, [inView, end]);

  return (
    <div ref={ref} className="stat-card">
      <span className="stat-number">
        {value.toLocaleString()}{suffix}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// ── Data ───────────────────────────────────────────────────────────────────
const VALUES = [
  {
    icon: "⚡",
    title: "Innovation",
    desc: "We push boundaries by sourcing tomorrow's technology today — before it goes mainstream.",
  },
  {
    icon: "💎",
    title: "Quality",
    desc: "Every product passes a rigorous curation process. If it doesn't meet the bar, it doesn't ship.",
  },
  {
    icon: "🔒",
    title: "Trust",
    desc: "Transparent pricing, honest reviews, and zero-compromise data privacy on every transaction.",
  },
  {
    icon: "✦",
    title: "Customer First",
    desc: "Our support team is human, knowledgeable, and available around the clock — no bots, no scripts.",
  },
];

const TEAM = [
  { name: "Alex Chen", role: "Founder & CEO", initials: "AC" },
  { name: "Maya Patel", role: "Head of Product", initials: "MP" },
  { name: "Jordan Lee", role: "Chief Technology Officer", initials: "JL" },
  { name: "Sofia Reyes", role: "Director of Customer Experience", initials: "SR" },
  { name: "Kai Nomura", role: "Lead Design Architect", initials: "KN" },
];

const WHY_US = [
  {
    icon: "🚀",
    title: "Fast Shipping",
    desc: "Same-day dispatch on orders placed before 3 PM. Worldwide express delivery to 120+ countries.",
  },
  {
    icon: "🛡️",
    title: "Secure Payments",
    desc: "Bank-grade 256-bit encryption. PCI-DSS Level 1 compliant. Pay your way, with full confidence.",
  },
  {
    icon: "💬",
    title: "24 / 7 Support",
    desc: "Real engineers answer your questions — any hour, any timezone, any complexity.",
  },
  {
    icon: "🏆",
    title: "Premium Only",
    desc: "We stock fewer SKUs than most stores, on purpose. Every listing is hand-picked and tested.",
  },
];

const STATS = [
  { end: 12000, suffix: "+", label: "Total Products" },
  { end: 480000, suffix: "+", label: "Happy Customers" },
  { end: 1200000, suffix: "+", label: "Orders Completed" },
  { end: 120, suffix: "+", label: "Countries Served" },
];

// ── Page ───────────────────────────────────────────────────────────────────
export default function About() {
  return (
    <main className="about-root">
      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-glow hero-glow--left" />
        <div className="hero-glow hero-glow--right" />
        <div className="hero-inner">
          <motion.span
            className="hero-eyebrow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            ABOUT TECHSTORE
          </motion.span>
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
            Building the future of<br />
            <span className="hero-title--accent">premium tech.</span>
          </motion.h1>
          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.35 }}
          >
            We are building the future of premium technology shopping — one extraordinary product at a time.
          </motion.p>
          <motion.div
            className="hero-scroll-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <span className="scroll-dot" />
          </motion.div>
        </div>
      </section>

      {/* ── OUR STORY ── */}
      <section className="section story-section">
        <div className="container story-grid">
          <Reveal className="story-text">
            <span className="section-eyebrow">Our Story</span>
            <h2 className="section-title">Obsession with excellence, since 2015.</h2>
            <p className="body-text">
              TechStore started with a simple frustration: premium electronics deserved a premium buying experience. We built the store we always wanted to shop in.
            </p>
            <p className="body-text" style={{ marginTop: "1rem" }}>
              Today we are trusted by nearly half a million customers across 120 countries. Our team curates every product personally, negotiates the sharpest prices directly with manufacturers, and ships within 24 hours — no middlemen, no markups, no compromise.
            </p>
            <ul className="story-pillars">
              {["Premium electronics, hand-curated", "Best prices, guaranteed", "Express delivery worldwide", "Trusted quality, every order"].map((p, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                >
                  <span className="pillar-check">✓</span> {p}
                </motion.li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.2} className="story-visual">
            <div className="story-img-frame">
              <div className="story-img-inner">
                <div className="story-img-glyph">TS</div>
                <p className="story-img-caption">Est. 2015 · San Francisco</p>
              </div>
              <div className="story-img-ring story-img-ring--1" />
              <div className="story-img-ring story-img-ring--2" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="section values-section">
        <div className="container">
          <Reveal className="section-header">
            <span className="section-eyebrow">Core Values</span>
            <h2 className="section-title">What we stand for.</h2>
          </Reveal>
          <div className="cards-grid cards-grid--4">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.1}>
                <motion.div
                  className="glass-card value-card"
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <span className="card-icon">{v.icon}</span>
                  <h3 className="card-title">{v.title}</h3>
                  <p className="card-desc">{v.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ── */}
      <section className="section team-section">
        <div className="container">
          <Reveal className="section-header">
            <span className="section-eyebrow">The Team</span>
            <h2 className="section-title">People behind the product.</h2>
          </Reveal>
          <div className="cards-grid cards-grid--5">
            {TEAM.map((member, i) => (
              <Reveal key={member.name} delay={i * 0.08}>
                <motion.div
                  className="glass-card team-card"
                  whileHover={{ y: -6, scale: 1.03 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  <div className="avatar">
                    <span className="avatar-initials">{member.initials}</span>
                    <div className="avatar-glow" />
                  </div>
                  <h3 className="team-name">{member.name}</h3>
                  <p className="team-role">{member.role}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="section why-section">
        <div className="container">
          <Reveal className="section-header">
            <span className="section-eyebrow">Why TechStore</span>
            <h2 className="section-title">Built different, by design.</h2>
          </Reveal>
          <div className="cards-grid cards-grid--4">
            {WHY_US.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.1}>
                <motion.div
                  className="glass-card why-card"
                  whileHover={{ y: -8, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <span className="why-icon">{item.icon}</span>
                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-desc">{item.desc}</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="section stats-section">
        <div className="container">
          <Reveal className="section-header">
            <span className="section-eyebrow">By the Numbers</span>
            <h2 className="section-title">Scale that speaks for itself.</h2>
          </Reveal>
          <div className="stats-grid">
            {STATS.map((s) => (
              <Counter key={s.label} end={s.end} suffix={s.suffix} label={s.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section cta-section">
        <div className="cta-glow" />
        <Reveal className="cta-inner">
          <span className="section-eyebrow">Ready to explore?</span>
          <h2 className="cta-title">The future of tech<br />is one click away.</h2>
          
          <Link to="/products" className="cta-link">
          <motion
            
            className="cta-btn"
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(99,102,241,0.5)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            Explore Products
            <span className="cta-btn-arrow">→</span>
          </motion>
            </Link>
        </Reveal>
      </section>
    </main>
  );
}