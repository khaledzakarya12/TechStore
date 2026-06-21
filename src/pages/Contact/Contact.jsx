import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import {db} from "../../utils/firebaseconfig"; // <-- make sure this path matches your Firebase config file
// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function validateForm({ name, email, message }) {
  const errors = {};
  if (!name.trim()) errors.name = "Name is required";
  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email";
  }
  if (!message.trim()) errors.message = "Message is required";
  else if (message.trim().length < 10) errors.message = "Message must be at least 10 characters";
  return errors;
}

async function saveMessage(data) {
  try {
    await addDoc(collection(db, "messages"), {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      message: data.message.trim(),
      timestamp: serverTimestamp(),
      status: "unread",
    });
    return { success: true };
  } catch (err) {
    console.error("Firebase error:", err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// Sub-Components
// ─────────────────────────────────────────────
const CONTACT_INFO = [
  {
    icon: "✉",
    label: "Email Support",
    value: "support@techstore.io",
    sub: "Response within 2 hours",
  },
  {
    icon: "📞",
    label: "Phone",
    value: "+1 (800) 832-4210",
    sub: "Mon–Fri, 9AM–6PM EST",
  },
  {
    icon: "📍",
    label: "Headquarters",
    value: "One Infinite Loop, Cupertino",
    sub: "California, 95014 USA",
  },
];

const SOCIAL_LINKS = [
  { label: "𝕏", href: "#" },
  { label: "in", href: "#" },
  { label: "ig", href: "#" },
  { label: "yt", href: "#" },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const fieldVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function InfoCard({ icon, label, value, sub, index }) {
  return (
    <motion.div
      className="ct-info-card"
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      viewport={{ once: true }}
      whileHover={{ x: 4, borderColor: "rgba(255,255,255,0.25)" }}
    >
      <span className="ct-info-icon">{icon}</span>
      <div className="ct-info-text">
        <span className="ct-info-label">{label}</span>
        <span className="ct-info-value">{value}</span>
        <span className="ct-info-sub">{sub}</span>
      </div>
    </motion.div>
  );
}

function Toast({ message, type }) {
  return (
    <motion.div
      className={`ct-toast ct-toast--${type}`}
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <span className="ct-toast-icon">{type === "success" ? "✓" : "✕"}</span>
      <span className="ct-toast-msg">{message}</span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Contact Form
// ─────────────────────────────────────────────
function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [focused, setFocused] = useState(null);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    const result = await saveMessage(form);
    setLoading(false);
    if (result.success) {
      showToast("Message sent! We'll get back to you shortly.", "success");
      setForm({ name: "", email: "", message: "" });
      setErrors({});
    } else {
      showToast("Failed to send. Please try again.", "error");
    }
  };

  return (
    <div className="ct-form-wrap">
      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast.message} type={toast.type} />}
      </AnimatePresence>

      <motion.form
        className="ct-form"
        onSubmit={handleSubmit}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.div className="ct-form-header" variants={fieldVariant}>
          <h2 className="ct-form-title">Send a Message</h2>
          <p className="ct-form-sub">Fill in the form and we'll respond within 2 hours.</p>
        </motion.div>

        {/* Name */}
        <motion.div className={`ct-field ${errors.name ? "ct-field--error" : ""} ${focused === "name" ? "ct-field--focused" : ""}`} variants={fieldVariant}>
          <label className="ct-label" htmlFor="name">Full Name</label>
          <div className="ct-input-wrap">
            <span className="ct-input-icon">👤</span>
            <input
              id="name"
              name="name"
              type="text"
              className="ct-input"
              placeholder="John Appleseed"
              value={form.name}
              onChange={handleChange}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              autoComplete="name"
            />
          </div>
          <AnimatePresence>
            {errors.name && (
              <motion.span
                className="ct-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {errors.name}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Email */}
        <motion.div className={`ct-field ${errors.email ? "ct-field--error" : ""} ${focused === "email" ? "ct-field--focused" : ""}`} variants={fieldVariant}>
          <label className="ct-label" htmlFor="email">Email Address</label>
          <div className="ct-input-wrap">
            <span className="ct-input-icon">✉</span>
            <input
              id="email"
              name="email"
              type="email"
              className="ct-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              autoComplete="email"
            />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.span
                className="ct-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {errors.email}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Message */}
        <motion.div className={`ct-field ${errors.message ? "ct-field--error" : ""} ${focused === "message" ? "ct-field--focused" : ""}`} variants={fieldVariant}>
          <label className="ct-label" htmlFor="message">Your Message</label>
          <div className="ct-textarea-wrap">
            <textarea
              id="message"
              name="message"
              className="ct-textarea"
              placeholder="Tell us how we can help you…"
              value={form.message}
              onChange={handleChange}
              onFocus={() => setFocused("message")}
              onBlur={() => setFocused(null)}
              rows={5}
            />
            <span className="ct-char-count">{form.message.length} chars</span>
          </div>
          <AnimatePresence>
            {errors.message && (
              <motion.span
                className="ct-error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {errors.message}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Submit */}
        <motion.div variants={fieldVariant}>
          <motion.button
            type="submit"
            className={`ct-submit-btn ${loading ? "ct-submit-btn--loading" : ""}`}
            disabled={loading}
            whileHover={!loading ? { scale: 1.03, boxShadow: "0 0 40px rgba(255,255,255,0.22)" } : {}}
            whileTap={!loading ? { scale: 0.97 } : {}}
          >
            {loading ? (
              <>
                <span className="ct-btn-spinner" />
                Sending…
              </>
            ) : (
              <>
                <span>Send Message</span>
                <motion.span
                  className="ct-btn-arrow"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                >
                  →
                </motion.span>
              </>
            )}
          </motion.button>
        </motion.div>
      </motion.form>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Contact Page
// ─────────────────────────────────────────────
export default function Contact() {
  const navigate = useNavigate();

  return (
    <div className="ct-page">

      {/* ── HERO ── */}
      <section className="ct-hero">
        <div className="ct-hero-bg">
          <div className="ct-hero-ring ct-hero-ring-1" />
          <div className="ct-hero-ring ct-hero-ring-2" />
          <div className="ct-hero-ring ct-hero-ring-3" />
          <div className="ct-hero-glow" />
        </div>
        <motion.div
          className="ct-hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.span
            className="ct-hero-eyebrow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            ✦ We'd love to hear from you
          </motion.span>
          <motion.h1
            className="ct-hero-title"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Get in <span className="ct-hero-accent">Touch</span>
          </motion.h1>
          <motion.p
            className="ct-hero-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            We're here to help you anytime. Reach out and our team will get back to you within 2 hours.
          </motion.p>
        </motion.div>
      </section>

      {/* ── MAIN CONTENT: Split Layout ── */}
      <section className="ct-main">
        <div className="ct-main-inner">

          {/* LEFT — Info Panel */}
          <aside className="ct-sidebar">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <p className="ct-sidebar-eyebrow">Contact Details</p>
              <h2 className="ct-sidebar-title">Always at<br />your service</h2>
              <p className="ct-sidebar-body">
                Our team of experts is ready to assist you with any questions about products, orders, or support.
              </p>
            </motion.div>

            <div className="ct-info-cards">
              {CONTACT_INFO.map((item, i) => (
                <InfoCard key={item.label} {...item} index={i} />
              ))}
            </div>

            <motion.div
              className="ct-social-section"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
            >
              <p className="ct-social-label">Follow Us</p>
              <div className="ct-social-row">
                {SOCIAL_LINKS.map((s) => (
                  <motion.a
                    key={s.label}
                    href={s.href}
                    className="ct-social-btn"
                    whileHover={{ scale: 1.1, borderColor: "rgba(255,255,255,0.4)" }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {s.label}
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Ambient decoration */}
            <div className="ct-sidebar-deco" aria-hidden="true">
              <div className="ct-deco-dot ct-deco-dot-1" />
              <div className="ct-deco-dot ct-deco-dot-2" />
              <div className="ct-deco-dot ct-deco-dot-3" />
            </div>
          </aside>

          {/* RIGHT — Contact Form */}
          <div className="ct-form-panel">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* ── FOOTER STRIP ── */}
      <footer className="ct-footer">
        <div className="ct-footer-inner">
          <div className="ct-logo" onClick={() => navigate("/")}>
            <span className="ct-logo-icon">⬡</span>
            <span className="ct-logo-text">TechStore</span>
          </div>
          <span className="ct-footer-copy">© 2026 TechStore. All rights reserved.</span>
          <div className="ct-footer-links">
            <a href="#" className="ct-footer-link">Privacy</a>
            <a href="#" className="ct-footer-link">Terms</a>
            <a href="#" className="ct-footer-link">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}