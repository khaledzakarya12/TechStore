import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";
import {
  collection, addDoc, doc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, getDocs,
} from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage , messaging } from "./../../utils/firebaseconfig";
import { getToken } from "firebase/messaging";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ─── Constants ─────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard",  label: "Dashboard",  icon: "⬡" },
  { id: "products",   label: "Products",   icon: "◈" },
  { id: "orders",     label: "Orders",     icon: "◎" },
  { id: "customers",  label: "Customers",  icon: "◉" },
  { id: "carts",      label: "Carts",      icon: "◫" },
  { id: "messages",   label: "Messages",   icon: "◇" },
  { id: "analytics",  label: "Analytics",  icon: "◰" },
];

// Bottom nav (most important 5 for mobile)
const BOTTOM_NAV = [
  { id: "dashboard",  label: "Home",      icon: "⬡" },
  { id: "products",   label: "Products",  icon: "◈" },
  { id: "orders",     label: "Orders",    icon: "◎" },
  { id: "customers",  label: "Customers", icon: "◉" },
  { id: "analytics",  label: "Analytics", icon: "◰" },
];

const CATEGORIES = ["Laptops","Phones","Tablets","Accessories","Audio","Cameras","Gaming","watch"];

const ORDER_STATUSES = ["pending","processing","shipped","delivered","cancelled"];

const STATUS_META = {
  pending:    { label: "Pending",    color: "#f59e0b" },
  processing: { label: "Processing", color: "#6366f1" },
  shipped:    { label: "Shipped",    color: "#3b82f6" },
  delivered:  { label: "Delivered",  color: "#10b981" },
  cancelled:  { label: "Cancelled",  color: "#ef4444" },
};

const PIE_COLORS = ["#6366f1","#8b5cf6","#a78bfa","#c4b5fd","#ddd6fe","#ede9fe","#f5f3ff","#faf5ff"];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const emptyProduct = () => ({ name: "", price: "", description: "", category: CATEGORIES[0], imageUrl: "" });

const getToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const getWeekAgo = () => { const d = new Date(); d.setDate(d.getDate()-7); d.setHours(0,0,0,0); return d; };
const getMonthAgo = () => { const d = new Date(); d.setDate(d.getDate()-30); d.setHours(0,0,0,0); return d; };

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, trend }) {
  return (
    <motion.div
      className="stat-card glass"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      <div className="stat-icon-wrap" style={{ background: `${color}18` }}>
        <span className="stat-icon" style={{ color }}>{icon}</span>
      </div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {sub && <span className="stat-sub">{sub}</span>}
      </div>
      {trend !== undefined && (
        <div className={`stat-trend ${trend >= 0 ? "up" : "down"}`}>
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </div>
      )}
    </motion.div>
  );
}

function Badge({ status }) {
  const meta = STATUS_META[status] || { label: status, color: "#9ca3af" };
  return (
    <span className="badge" style={{ "--badge-color": meta.color }}>
      <span className="badge-dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      className={`toast toast-${type}`}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
    >
      <span className="toast-icon">{type === "success" ? "✓" : "✕"}</span>
      {message}
    </motion.div>
  );
}

function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className={`modal glass ${wide ? "modal-wide" : ""}`}
        initial={{ scale: 0.93, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 30 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function BottomSheet({ title, onClose, children }) {
  const startY = useRef(null);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  const handleTouchStart = (e) => { startY.current = e.touches[0].clientY; };
  const handleTouchEnd = (e) => {
    if (startY.current && e.changedTouches[0].clientY - startY.current > 80) onClose();
    startY.current = null;
  };
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="bottom-sheet"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bottom-sheet-handle" />
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="bottom-sheet-body">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="skeleton-card glass">
      <div className="skeleton skeleton-img" />
      <div className="skeleton-info">
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
      </div>
    </div>
  );
}

function UploadProgress({ progress }) {
  if (progress === null) return null;
  return (
    <div className="upload-progress">
      <div className="upload-bar-track"><div className="upload-bar" style={{ width: `${progress}%` }} /></div>
      <span>{Math.round(progress)}%</span>
    </div>
  );
}

// ─── Notification Center ──────────────────────────────────────────────────────
function NotificationCenter({ orders, messages, products, onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const pendingOrders = orders.filter(o => o.status === "pending");
  const unreadMessages = messages.filter(m => !m.read);
  const recentProducts = products.filter(p => {
    if (!p.createdAt) return false;
    const d = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
    return d > getWeekAgo();
  });

  const total = pendingOrders.length + unreadMessages.length;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const notifs = [
    ...pendingOrders.slice(0,3).map(o => ({
      id: `order-${o.id}`, icon: "◎", color: "#f59e0b",
      title: "New Order", body: `From ${o.customerName || "customer"} — ${formatCurrency(o.totalPrice)}`,
      time: formatDate(o.createdAt), nav: "orders",
    })),
    ...unreadMessages.slice(0,3).map(m => ({
      id: `msg-${m.id}`, icon: "◇", color: "#6366f1",
      title: "New Message", body: `${m.name || "Visitor"}: ${m.message?.slice(0,50)}…`,
      time: formatDate(m.createdAt), nav: "messages",
    })),
    ...recentProducts.slice(0,2).map(p => ({
      id: `prod-${p.id}`, icon: "◈", color: "#10b981",
      title: "Product Added", body: p.name,
      time: formatDate(p.createdAt), nav: "products",
    })),
  ].slice(0,8);

  return (
    <div className="notif-wrap" ref={ref}>
      <button className="notif-btn" onClick={() => setOpen(v => !v)}>
        <span>🔔</span>
        {total > 0 && <span className="notif-count">{total}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="notif-panel glass"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
          >
            <div className="notif-header">
              <span className="notif-title">Notifications</span>
              {total > 0 && <span className="notif-badge">{total} new</span>}
            </div>
            {notifs.length === 0
              ? <div className="notif-empty">All caught up ✓</div>
              : notifs.map(n => (
                <button key={n.id} className="notif-item" onClick={() => { onNavigate(n.nav); setOpen(false); }}>
                  <span className="notif-icon" style={{ color: n.color }}>{n.icon}</span>
                  <div className="notif-info">
                    <span className="notif-item-title">{n.title}</span>
                    <span className="notif-item-body">{n.body}</span>
                  </div>
                  <span className="notif-time">{n.time}</span>
                </button>
              ))
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Order Details Panel ──────────────────────────────────────────────────────
function OrderDetails({ order, onClose, isMobile }) {
  const Wrapper = isMobile ? BottomSheet : Modal;
  return (
    <Wrapper title={`Order Details`} onClose={onClose} wide>
      <div className="order-detail-grid">
        {/* Customer info */}
        <div className="order-detail-section">
          <h4 className="order-detail-section-title">Customer</h4>
          <div className="order-detail-rows">
            <div className="detail-row"><span>Name</span><strong>{order.customerName || "—"}</strong></div>
            <div className="detail-row"><span>Phone</span><strong>{order.phone || "—"}</strong></div>
            <div className="detail-row"><span>Email</span><a href={`mailto:${order.email}`} className="detail-link">{order.email || "—"}</a></div>
            <div className="detail-row"><span>City</span><strong>{order.city || "—"}</strong></div>
            <div className="detail-row"><span>Address</span><strong>{order.address || "—"}</strong></div>
          </div>
        </div>
        {/* Order info */}
        <div className="order-detail-section">
          <h4 className="order-detail-section-title">Order Info</h4>
          <div className="order-detail-rows">
            <div className="detail-row"><span>Status</span><Badge status={order.status} /></div>
            <div className="detail-row"><span>Payment</span><strong>{order.paymentMethod || "—"}</strong></div>
            <div className="detail-row"><span>Date</span><strong>{formatDate(order.createdAt)}</strong></div>
            <div className="detail-row"><span>Total</span><strong className="detail-total">{formatCurrency(order.totalPrice)}</strong></div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="order-detail-section mt-4">
        <h4 className="order-detail-section-title">Items ({(order.items || []).length})</h4>
        <div className="order-items-list">
          {(order.items || []).length === 0
            ? <p className="muted">No items.</p>
            : (order.items || []).map((item, i) => (
              <div key={i} className="order-item-row">
                <div className="order-item-img-wrap">
                  {item.image
                    ? <img src={item.image} alt={item.name} className="order-item-img" />
                    : <div className="order-item-img-ph">◈</div>
                  }
                </div>
                <div className="order-item-info">
                  <span className="order-item-name">{item.name}</span>
                  <span className="order-item-meta muted">Qty: {item.quantity || 1} · {formatCurrency(item.price)} each</span>
                </div>
                <span className="order-item-subtotal">{formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
              </div>
            ))
          }
        </div>
      </div>
    </Wrapper>
  );
}

// ─── Dashboard Section ────────────────────────────────────────────────────────
function DashboardSection({ products, orders, messages }) {
  const totalRevenue = orders.reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
  const todayRevenue = orders
    .filter(o => o.createdAt && (o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)) >= getToday())
    .reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
  const weekRevenue = orders
    .filter(o => o.createdAt && (o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)) >= getWeekAgo())
    .reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
  const customers = [...new Set(orders.map(o => o.email).filter(Boolean))];
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;

  const recentOrders = [...orders].slice(0, 5);
  const recentProducts = [...products].slice(0, 4);

  // Activity timeline
  const activity = [
    ...orders.slice(0,3).map(o => ({ type: "order", icon: "◎", color: "#f59e0b", text: `Order from ${o.customerName || "customer"}`, value: formatCurrency(o.totalPrice), time: formatDate(o.createdAt) })),
    ...messages.slice(0,2).map(m => ({ type: "message", icon: "◇", color: "#6366f1", text: `Message from ${m.name || "visitor"}`, value: "", time: formatDate(m.createdAt) })),
    ...products.slice(0,2).map(p => ({ type: "product", icon: "◈", color: "#10b981", text: `Product added: ${p.name}`, value: formatCurrency(p.price), time: formatDate(p.createdAt) })),
  ].sort((a,b) => 0);

  return (
    <section className="section">
      <h1 className="section-title">Overview</h1>
      <p className="section-sub">Your store at a glance</p>

      <div className="stats-grid">
        <StatCard icon="◈" label="Total Products" value={products.length} sub="In store" color="#6366f1" />
        <StatCard icon="◎" label="Total Orders" value={orders.length} sub="All time" color="#8b5cf6" />
        <StatCard icon="💰" label="Total Revenue" value={formatCurrency(totalRevenue)} sub="All time" color="#10b981" />
        <StatCard icon="◉" label="Customers" value={customers.length} sub="Unique" color="#f59e0b" />
        <StatCard icon="📅" label="Today's Revenue" value={formatCurrency(todayRevenue)} sub="Today" color="#3b82f6" />
        <StatCard icon="📆" label="This Week" value={formatCurrency(weekRevenue)} sub="Last 7 days" color="#ec4899" />
        <StatCard icon="📊" label="Avg Order" value={formatCurrency(avgOrder)} sub="Per order" color="#14b8a6" />
        <StatCard icon="◇" label="Messages" value={messages.filter(m => !m.read).length} sub="Unread" color="#f97316" />
      </div>

      {recentOrders.length > 0 && (
        <div className="glass panel mt-6">
          <h2 className="panel-title">Recent Orders</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {recentOrders.map(o => (
                  <tr key={o.id}>
                    <td className="td-name">{o.customerName || "—"}</td>
                    <td>{formatCurrency(o.totalPrice)}</td>
                    <td><Badge status={o.status} /></td>
                    <td className="muted">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recentProducts.length > 0 && (
        <div className="glass panel mt-6">
          <h2 className="panel-title">Recently Added Products</h2>
          <div className="product-mini-grid">
            {recentProducts.map(p => (
              <motion.div key={p.id} className="product-mini glass" whileHover={{ scale: 1.03 }}>
                <div className="product-mini-img">
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <span className="img-placeholder">◈</span>}
                </div>
                <div className="product-mini-info">
                  <span className="product-mini-name">{p.name}</span>
                  <span className="product-mini-price">{formatCurrency(p.price)}</span>
                  <span className="product-mini-cat">{p.category}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      {activity.length > 0 && (
        <div className="glass panel mt-6">
          <h2 className="panel-title">Recent Activity</h2>
          <div className="activity-timeline">
            {activity.slice(0,6).map((a, i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" style={{ background: a.color }}>{a.icon}</div>
                <div className="activity-body">
                  <span className="activity-text">{a.text}</span>
                  {a.value && <span className="activity-value">{a.value}</span>}
                </div>
                <span className="activity-time muted">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Products Section ─────────────────────────────────────────────────────────
function ProductsSection({ products, showToast }) {
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [form, setForm] = useState(emptyProduct());
  const [imageFile, setImageFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const fileRef = useRef();
  const isMobile = useIsMobile();
const PRODUCTS_PER_PAGE = 6;

const [currentPage, setCurrentPage] = useState(1);

const filteredProducts = products.filter(
  p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) &&
    (catFilter === "All" || p.category === catFilter)
);

const totalPages = Math.ceil(
  filteredProducts.length / PRODUCTS_PER_PAGE
);

const displayedProducts = filteredProducts.slice(
  (currentPage - 1) * PRODUCTS_PER_PAGE,
  currentPage * PRODUCTS_PER_PAGE
);
  const openAdd = () => { setForm(emptyProduct()); setEditTarget(null); setImageFile(null); setShowForm(true); };
  const openEdit = (p) => { setForm({ name: p.name, price: p.price, description: p.description, category: p.category, imageUrl: p.imageUrl }); setEditTarget(p); setImageFile(null); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setUploadProgress(null); };

  const handleField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const uploadImage = (file) =>
    new Promise((resolve, reject) => {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);
      task.on("state_changed",
        snap => setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100),
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
      );
    });

  const handleSave = async () => {
    if (!form.name.trim() || !form.price) return showToast("Name and price are required.", "error");
    setLoading(true);
    try {
      let imageUrl = form.imageUrl;
      if (imageFile) imageUrl = await uploadImage(imageFile);
      const data = { ...form, price: parseFloat(form.price), imageUrl, updatedAt: serverTimestamp() };
      if (editTarget) {
        await updateDoc(doc(db, "products", editTarget.id), data);
        showToast("Product updated.", "success");
      } else {
        await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
        showToast("Product added.", "success");
      }
      closeForm();
    } catch (e) { showToast("Failed: " + e.message, "error"); }
    finally { setLoading(false); setUploadProgress(null); }
  };

  const handleDelete = async (id, imageUrl) => {
    try {
      await deleteDoc(doc(db, "products", id));
      if (imageUrl) { try { await deleteObject(ref(storage, imageUrl)); } catch (_) {} }
      showToast("Product deleted.", "success");
    } catch { showToast("Delete failed.", "error"); }
    setDeleteId(null);
  };

  // Per-category stats
  const catStats = CATEGORIES.map(c => ({ cat: c, count: products.filter(p => p.category === c).length })).filter(c => c.count > 0);

  const FormWrapper = isMobile ? BottomSheet : Modal;

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Products</h1>
          <p className="section-sub">{products.length} items · {displayedProducts.length} shown</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      {/* Stats strip */}
      {catStats.length > 0 && (
        <div className="cat-stats-strip glass">
          {catStats.map(c => (
            <button key={c.cat} className={`cat-stat-btn ${catFilter === c.cat ? "active" : ""}`} onClick={() => setCatFilter(c.cat)}>
              <span className="cat-stat-count">{c.count}</span>
              <span className="cat-stat-name">{c.cat}</span>
            </button>
          ))}
          <button className={`cat-stat-btn ${catFilter === "All" ? "active" : ""}`} onClick={() => setCatFilter("All")}>
            <span className="cat-stat-count">{products.length}</span>
            <span className="cat-stat-name">All</span>
          </button>
        </div>
      )}

      <div className="filters glass">
        <input className="search-input" placeholder="Search by name or category…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="cat-filters">
          {["All", ...CATEGORIES].map(c => (
            <button key={c} className={`cat-btn ${catFilter === c ? "active" : ""}`} onClick={() => setCatFilter(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="product-grid">
        <AnimatePresence>
          {displayedProducts.map(p => (
            <motion.div key={p.id} className="product-card glass" layout
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} whileHover={{ y: -5 }}>
              <div className="product-img-wrap" onClick={() => setPreviewProduct(p)} style={{ cursor: "pointer" }}>
                {p.imageUrl
                  ? <img src={p.imageUrl} alt={p.name} className="product-img" />
                  : <div className="product-img-ph">◈</div>
                }
                <span className="product-link-overlay">Preview ↗</span>
              </div>
              <div className="product-card-body">
                <span className="product-cat-tag">{p.category}</span>
                <h3 className="product-name">{p.name}</h3>
                <p className="product-desc">{p.description}</p>
                <div className="product-footer">
                  <span className="product-price">{formatCurrency(p.price)}</span>
                  <div className="product-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setPreviewProduct(p)}>Preview</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(p.id)}>Delete</button>
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {deleteId === p.id && (
                  <motion.div className="delete-confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <p>Delete <strong>{p.name}</strong>?</p>
                    <div className="delete-actions">
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id, p.imageUrl)}>Yes, delete</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteId(null)}>Cancel</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
        {displayedProducts.length === 0 && <div className="empty-state">No products found.</div>}
      </div>

      {/* Product Preview Modal */}
      <AnimatePresence>
        {previewProduct && (
          <Modal title="Product Preview" onClose={() => setPreviewProduct(null)}>
            <div className="product-preview">
              <div className="product-preview-img">
                {previewProduct.imageUrl
                  ? <img src={previewProduct.imageUrl} alt={previewProduct.name} />
                  : <div className="product-img-ph big">◈</div>
                }
              </div>
              <div className="product-preview-info">
                <span className="product-cat-tag">{previewProduct.category}</span>
                <h3 className="product-preview-name">{previewProduct.name}</h3>
                <p className="product-preview-price">{formatCurrency(previewProduct.price)}</p>
                <p className="product-preview-desc">{previewProduct.description || "No description."}</p>
                <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={() => setPreviewProduct(null)}>Close</button>
                  <button className="btn btn-primary" onClick={() => { setPreviewProduct(null); openEdit(previewProduct); }}>Edit Product</button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Add / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <FormWrapper title={editTarget ? "Edit Product" : "Add Product"} onClose={closeForm}>
            <div className="form-grid">
              <div className="form-group">
                <label>Product Name</label>
                <input className="form-input" value={form.name} onChange={e => handleField("name", e.target.value)} placeholder="e.g. MacBook Pro 16" />
              </div>
              <div className="form-group">
                <label>Price (USD)</label>
                <input className="form-input" type="number" value={form.price} onChange={e => handleField("price", e.target.value)} placeholder="999" />
              </div>
              <div className="form-group form-full">
                <label>Description</label>
                <textarea className="form-input form-textarea" value={form.description} onChange={e => handleField("description", e.target.value)} placeholder="Product description…" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select className="form-input form-select" value={form.category} onChange={e => handleField("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Product Image</label>
                <div className="upload-zone" onClick={() => fileRef.current.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setImageFile(f); }}>
                  {imageFile ? <span>📎 {imageFile.name}</span>
                    : form.imageUrl ? <img src={form.imageUrl} alt="" className="upload-preview" />
                    : <span>Click or drag to upload</span>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setImageFile(e.target.files[0])} />
              </div>
            </div>
            <UploadProgress progress={uploadProgress} />
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeForm}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? "Saving…" : editTarget ? "Save Changes" : "Add Product"}
              </button>
            </div>
          </FormWrapper>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Orders Section ───────────────────────────────────────────────────────────
function OrdersSection({ orders, showToast }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId);
    try {
      await updateDoc(doc(db, "orders", orderId), { status, updatedAt: serverTimestamp() });
      showToast(`Order marked as ${status}.`, "success");
    } catch { showToast("Update failed.", "error"); }
    setUpdating(null);
  };

  const filtered = orders
    .filter(o => statusFilter === "all" || o.status === statusFilter)
    .filter(o => !search || (o.customerName || "").toLowerCase().includes(search.toLowerCase()) || (o.email || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Orders</h1>
          <p className="section-sub">{orders.length} total · real-time</p>
        </div>
      </div>

      <div className="status-filters glass">
        {["all", ...ORDER_STATUSES].map(s => (
          <button key={s} className={`status-filter-btn ${statusFilter === s ? "active" : ""}`}
            style={statusFilter === s && s !== "all" ? { "--active-color": STATUS_META[s]?.color } : {}}
            onClick={() => setStatusFilter(s)}>
            {s === "all" ? "All" : STATUS_META[s].label}
            <span className="count">{s === "all" ? orders.length : orders.filter(o => o.status === s).length}</span>
          </button>
        ))}
      </div>

      <div className="filters glass" style={{ marginBottom: 16 }}>
        <input className="search-input" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Mobile: cards */}
      {isMobile ? (
        <div className="order-cards">
          {filtered.length === 0 && <div className="empty-state">No orders found.</div>}
          <AnimatePresence>
            {filtered.map(o => (
              <motion.div key={o.id} className="order-card glass"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="order-card-top">
                  <div>
                    <span className="order-card-name">{o.customerName || "—"}</span>
                    <span className="order-card-email muted">{o.email || ""}</span>
                  </div>
                  <Badge status={o.status} />
                </div>
                <div className="order-card-mid">
                  <span className="order-card-total">{formatCurrency(o.totalPrice)}</span>
                  <span className="muted">{formatDate(o.createdAt)}</span>
                  <span className="muted">{(o.items || []).length} item{(o.items || []).length !== 1 ? "s" : ""}</span>
                </div>
                <div className="order-card-actions">
                  <select className="status-select" value={o.status || "pending"} disabled={updating === o.id}
                    onChange={e => updateStatus(o.id, e.target.value)}>
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedOrder(o)}>View Details</button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        // Desktop: table
        <div className="glass panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map(o => (
                    <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <td>
                        <div className="td-customer">
                          <span className="td-name">{o.customerName || "—"}</span>
                          <span className="muted" style={{ fontSize: 12 }}>{o.email}</span>
                        </div>
                      </td>
                      <td>
                        <div className="td-items">
                          {(o.items || []).slice(0,2).map((item, i) => (
                            <div key={i} className="td-item-row">
                              {item.image && <img src={item.image} alt={item.name} className="td-item-img" />}
                              <span className="product-tag">{item.name}</span>
                              <span className="muted" style={{ fontSize: 11 }}>×{item.quantity || 1}</span>
                            </div>
                          ))}
                          {(o.items || []).length > 2 && <span className="muted" style={{ fontSize: 12 }}>+{(o.items || []).length - 2} more</span>}
                        </div>
                      </td>
                      <td className="td-price">{formatCurrency(o.totalPrice)}</td>
                      <td><span className="payment-tag">{o.paymentMethod || "—"}</span></td>
                      <td><Badge status={o.status} /></td>
                      <td className="muted td-date">{formatDate(o.createdAt)}</td>
                      <td>
                        <div className="td-actions">
                          <select className="status-select" value={o.status || "pending"} disabled={updating === o.id}
                            onChange={e => updateStatus(o.id, e.target.value)}>
                            {ORDER_STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                          </select>
                          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedOrder(o)}>View</button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {filtered.length === 0 && <tr><td colSpan={7} className="empty-row">No orders found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order details */}
      <AnimatePresence>
        {selectedOrder && <OrderDetails order={selectedOrder} onClose={() => setSelectedOrder(null)} isMobile={isMobile} />}
      </AnimatePresence>
    </section>
  );
}

// ─── Customers Section ────────────────────────────────────────────────────────
function CustomersSection({ orders }) {
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  // Build customer map from orders
  const customerMap = {};
  orders.forEach(o => {
    const key = o.email || o.customerName || o.userId;
    if (!key) return;
    if (!customerMap[key]) {
      customerMap[key] = { name: o.customerName || "—", email: o.email || "—", phone: o.phone || "—", orders: 0, spending: 0 };
    }
    customerMap[key].orders += 1;
    customerMap[key].spending += parseFloat(o.totalPrice) || 0;
  });

  const customers = Object.values(customerMap)
    .sort((a, b) => b.spending - a.spending)
    .filter(c => !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Customers</h1>
          <p className="section-sub">{customers.length} unique customers</p>
        </div>
      </div>

      <div className="filters glass" style={{ marginBottom: 20 }}>
        <input className="search-input" placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isMobile ? (
        <div className="customer-cards">
          {customers.length === 0 && <div className="empty-state">No customers yet.</div>}
          {customers.map((c, i) => (
            <motion.div key={i} className="customer-card glass"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <div className="customer-avatar">{(c.name || "?")[0].toUpperCase()}</div>
              <div className="customer-info">
                <span className="customer-name">{c.name}</span>
                <span className="muted">{c.email}</span>
                <span className="muted">{c.phone}</span>
              </div>
              <div className="customer-stats">
                <div><span className="cs-val">{c.orders}</span><span className="cs-label">Orders</span></div>
                <div><span className="cs-val accent">{formatCurrency(c.spending)}</span><span className="cs-label">Spent</span></div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Orders</th><th>Total Spent</th></tr></thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="customer-avatar sm">{(c.name || "?")[0].toUpperCase()}</div>
                        <span className="td-name">{c.name}</span>
                      </div>
                    </td>
                    <td className="muted">{c.email}</td>
                    <td className="muted">{c.phone}</td>
                    <td><span className="badge" style={{ "--badge-color": "#6366f1" }}>{c.orders}</span></td>
                    <td className="td-price">{formatCurrency(c.spending)}</td>
                  </tr>
                ))}
                {customers.length === 0 && <tr><td colSpan={5} className="empty-row">No customers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Carts Section ────────────────────────────────────────────────────────────
function CartsSection({ carts, showToast }) {
  const [viewCart, setViewCart] = useState(null);
  const [clearing, setClearing] = useState(null);
  const isMobile = useIsMobile();

  const clearCart = async (userId) => {
    setClearing(userId);
    try {
      const itemsRef = collection(db, "carts", userId, "items");
      const snap = await getDocs(itemsRef);
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, "carts", userId, "items", d.id))));
      showToast("Cart cleared.", "success");
    } catch { showToast("Failed to clear cart.", "error"); }
    setClearing(null);
  };

  const Wrapper = isMobile ? BottomSheet : Modal;

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Active Carts</h1>
          <p className="section-sub">{carts.length} carts · real-time</p>
        </div>
      </div>

      {carts.length === 0
        ? <div className="empty-state glass" style={{ padding: 60 }}>No active carts.</div>
        : (
          <div className="cart-cards">
            {carts.map((cart, i) => {
              const value = cart.items.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0);
              return (
                <motion.div key={cart.userId} className="cart-card glass"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <div className="cart-card-icon">🛒</div>
                  <div className="cart-card-info">
                    <span className="cart-user-id">{cart.userId.slice(0, 18)}…</span>
                    <span className="muted">{cart.items.length} product{cart.items.length !== 1 ? "s" : ""}</span>
                    <span className="cart-value">{formatCurrency(value)}</span>
                  </div>
                  <div className="cart-card-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewCart(cart)}>View Cart</button>
                    <button className="btn btn-danger btn-sm" disabled={clearing === cart.userId}
                      onClick={() => clearCart(cart.userId)}>
                      {clearing === cart.userId ? "Clearing…" : "Clear"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
      }

      <AnimatePresence>
        {viewCart && (
          <Wrapper title={`Cart · ${viewCart.userId.slice(0, 14)}…`} onClose={() => setViewCart(null)}>
            <div className="order-items-list">
              {viewCart.items.length === 0
                ? <p className="muted">Cart is empty.</p>
                : viewCart.items.map((item, i) => (
                  <div key={i} className="order-item-row">
                    <div className="order-item-img-wrap">
                      {item.image
                        ? <img src={item.image} alt={item.name} className="order-item-img" />
                        : <div className="order-item-img-ph">◈</div>
                      }
                    </div>
                    <div className="order-item-info">
                      <span className="order-item-name">{item.name}</span>
                      <span className="order-item-meta muted">Qty: {item.quantity || 1} · {formatCurrency(item.price)}</span>
                    </div>
                    <span className="order-item-subtotal">{formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
                  </div>
                ))
              }
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setViewCart(null)}>Close</button>
              <button className="btn btn-danger" disabled={clearing === viewCart.userId}
                onClick={async () => { await clearCart(viewCart.userId); setViewCart(null); }}>
                {clearing === viewCart.userId ? "Clearing…" : "Clear Cart"}
              </button>
            </div>
          </Wrapper>
        )}
      </AnimatePresence>
    </section>
  );
}

// ─── Messages Section ─────────────────────────────────────────────────────────
function MessagesSection({ messages, showToast }) {
  const [active, setActive] = useState(null);
  const isMobile = useIsMobile();
  const [showDetail, setShowDetail] = useState(false);

  const markRead = async (id, read) => {
    try { await updateDoc(doc(db, "messages", id), { read, updatedAt: serverTimestamp() }); }
    catch { showToast("Failed to update.", "error"); }
  };

  const deleteMessage = async (id) => {
    try {
      await deleteDoc(doc(db, "messages", id));
      if (active?.id === id) setActive(null);
      showToast("Message deleted.", "success");
    } catch { showToast("Delete failed.", "error"); }
  };

  const sorted = [...messages].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const unreadCount = messages.filter(m => !m.read).length;

  const DetailPanel = () => active ? (
    <motion.div key={active.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
      <div className="detail-header">
        <div className="detail-avatar">{(active.name || "?")[0].toUpperCase()}</div>
        <div>
          <h3 className="detail-name">{active.name}</h3>
          <a href={`mailto:${active.email}`} className="detail-email">{active.email}</a>
        </div>
        <span className="detail-date muted">{formatDate(active.createdAt)}</span>
      </div>
      <div className="detail-body"><p>{active.message}</p></div>
      <div className="detail-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href={`mailto:${active.email}`} className="btn btn-primary">Reply via Email</a>
        <button className="btn btn-ghost" onClick={() => markRead(active.id, !active.read)}>
          {active.read ? "Mark Unread" : "Mark Read"}
        </button>
        <button className="btn btn-danger" onClick={() => deleteMessage(active.id)}>Delete</button>
      </div>
    </motion.div>
  ) : (
    <motion.div className="detail-empty" key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <span>◇</span><p>Select a message to read</p>
    </motion.div>
  );

  return (
    <section className="section">
      <h1 className="section-title">Messages</h1>
      <p className="section-sub">{messages.length} messages · {unreadCount} unread</p>

      {isMobile ? (
        <>
          <div className="messages-list-mobile glass">
            {sorted.length === 0 && <div className="empty-state">No messages yet.</div>}
            {sorted.map(m => (
              <motion.div key={m.id} className={`message-item ${!m.read ? "unread" : ""} ${active?.id === m.id ? "active" : ""}`}
                onClick={() => { setActive(m); setShowDetail(true); if (!m.read) markRead(m.id, true); }} whileHover={{ x: 3 }}>
                <div className="message-avatar">{(m.name || "?")[0].toUpperCase()}</div>
                <div className="message-meta">
                  <span className="message-name">{m.name || "Unknown"}</span>
                  <span className="message-email muted">{m.email}</span>
                  <span className="message-preview muted">{m.message?.slice(0, 70)}…</span>
                </div>
                {!m.read && <div className="unread-dot" />}
              </motion.div>
            ))}
          </div>
          <AnimatePresence>
            {showDetail && active && (
              <BottomSheet title="Message" onClose={() => setShowDetail(false)}>
                <DetailPanel />
              </BottomSheet>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="messages-layout">
          <div className="messages-list glass">
            {sorted.length === 0 && <div className="empty-state">No messages yet.</div>}
            {sorted.map(m => (
              <motion.div key={m.id} className={`message-item ${!m.read ? "unread" : ""} ${active?.id === m.id ? "active" : ""}`}
                onClick={() => { setActive(m); if (!m.read) markRead(m.id, true); }} whileHover={{ x: 4 }}>
                <div className="message-avatar">{(m.name || "?")[0].toUpperCase()}</div>
                <div className="message-meta">
                  <span className="message-name">{m.name || "Unknown"}</span>
                  <span className="message-email muted">{m.email}</span>
                  <span className="message-preview muted">{m.message?.slice(0, 60)}…</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span className="message-date muted">{formatDate(m.createdAt)}</span>
                  {!m.read && <div className="unread-dot" />}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="message-detail glass">
            <AnimatePresence mode="wait"><DetailPanel /></AnimatePresence>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Analytics Section ────────────────────────────────────────────────────────
function AnalyticsSection({ products, orders }) {
  const totalRevenue = orders.reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
  const todayRevenue = orders
    .filter(o => o.createdAt && (o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)) >= getToday())
    .reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
  const weekRevenue = orders
    .filter(o => o.createdAt && (o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)) >= getWeekAgo())
    .reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
  const monthRevenue = orders
    .filter(o => o.createdAt && (o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt)) >= getMonthAgo())
    .reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;
  const customers = [...new Set(orders.map(o => o.email).filter(Boolean))];

  // Sales by month
  const salesByMonth = (() => {
    const map = {};
    orders.forEach(o => {
      if (!o.createdAt) return;
      const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      map[key] = (map[key] || 0) + (parseFloat(o.totalPrice) || 0);
    });
    return Object.entries(map).map(([month, revenue]) => ({ month, revenue: Math.round(revenue) })).slice(-8);
  })();

  // Products by category
  const byCategory = (() => {
    const map = {};
    products.forEach(p => { map[p.category] = (map[p.category] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // Best selling products (from order items)
  const productSales = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const k = item.name || item.id;
      if (!k) return;
      productSales[k] = (productSales[k] || 0) + (item.quantity || 1);
    });
  });
  const bestSellers = Object.entries(productSales).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Orders per day (last 7)
  const ordersPerDay = (() => {
    const map = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const key = d.toLocaleDateString("en-US", { weekday: "short" });
      map[key] = 0;
    }
    orders.forEach(o => {
      if (!o.createdAt) return;
      const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      if (d >= getWeekAgo()) {
        const key = d.toLocaleDateString("en-US", { weekday: "short" });
        if (key in map) map[key]++;
      }
    });
    return Object.entries(map).map(([day, count]) => ({ day, count }));
  })();

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <span className="tooltip-label">{label}</span>
        <span className="tooltip-value">{formatCurrency(payload[0].value)}</span>
      </div>
    );
  };

  return (
    <section className="section">
      <h1 className="section-title">Analytics</h1>
      <p className="section-sub">Performance overview</p>

      <div className="stats-grid">
        <StatCard icon="📅" label="Today's Revenue" value={formatCurrency(todayRevenue)} color="#3b82f6" />
        <StatCard icon="📆" label="This Week" value={formatCurrency(weekRevenue)} color="#8b5cf6" />
        <StatCard icon="🗓" label="This Month" value={formatCurrency(monthRevenue)} color="#10b981" />
        <StatCard icon="📊" label="Avg Order Value" value={formatCurrency(avgOrder)} color="#f59e0b" />
        <StatCard icon="◈" label="Products" value={products.length} color="#6366f1" />
        <StatCard icon="◎" label="Total Orders" value={orders.length} color="#ec4899" />
        <StatCard icon="◉" label="Customers" value={customers.length} color="#14b8a6" />
        <StatCard icon="💰" label="Total Revenue" value={formatCurrency(totalRevenue)} color="#f97316" />
      </div>

      <div className="charts-grid">
        <div className="glass panel chart-panel">
          <h2 className="panel-title">Revenue Over Time</h2>
          <div className="chart-scroll-wrap">
            {salesByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={salesByMonth} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="revenue" stroke="url(#lineGrad)" strokeWidth={3} dot={{ fill: "#6366f1", r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">No order data yet.</div>}
          </div>
        </div>

        <div className="glass panel chart-panel">
          <h2 className="panel-title">Orders This Week</h2>
          <div className="chart-scroll-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ordersPerDay} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="day" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 13 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass panel chart-panel">
          <h2 className="panel-title">Products by Category</h2>
          <div className="chart-scroll-wrap">
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={byCategory} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value">
                    {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => [v, "Products"]} contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 13 }} />
                  <Legend iconType="circle" iconSize={10} formatter={v => <span style={{ color: "#6b7280", fontSize: 13 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">No products yet.</div>}
          </div>
        </div>

        {bestSellers.length > 0 && (
          <div className="glass panel chart-panel">
            <h2 className="panel-title">Best Selling Products</h2>
            <div className="best-sellers">
              {bestSellers.map(([name, qty], i) => (
                <div key={i} className="best-seller-row">
                  <span className="bs-rank">{i + 1}</span>
                  <span className="bs-name">{name}</span>
                  <div className="bs-bar-wrap">
                    <motion.div className="bs-bar" initial={{ width: 0 }}
                      animate={{ width: `${(qty / bestSellers[0][1]) * 100}%` }} transition={{ duration: 0.7, ease: "easeOut" }} />
                  </div>
                  <span className="bs-qty">{qty} sold</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="glass panel mt-6">
        <h2 className="panel-title">Order Status Breakdown</h2>
        <div className="status-breakdown">
          {ORDER_STATUSES.map(s => {
            const count = orders.filter(o => o.status === s).length;
            const pct = orders.length ? Math.round((count / orders.length) * 100) : 0;
            return (
              <div key={s} className="breakdown-row">
                <span className="breakdown-label"><Badge status={s} /> {count}</span>
                <div className="breakdown-bar-wrap">
                  <motion.div className="breakdown-bar" style={{ "--bar-color": STATUS_META[s].color }}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                </div>
                <span className="breakdown-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Hook: isMobile ───────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [carts, setCarts] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

const auth = getAuth();

const [currentUser, setCurrentUser] = useState(null);

useEffect(() => {
  const unsub = onAuthStateChanged(auth, (user) => {
    setCurrentUser(user);
  });

  return () => unsub();
}, []);
  // Swipe to open/close sidebar
  const touchStartX = useRef(null);
  const handleAppTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleAppTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 60 && touchStartX.current < 30) setSidebarOpen(true);
    if (dx < -60) setSidebarOpen(false);
    touchStartX.current = null;
  };

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
  }, []);
  const removeToast = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);


  // Firestore real-time listeners
  useEffect(() => {
    let loaded = 0;
    const done = () => { if (++loaded >= 3) setLoading(false); };

    const u1 = onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")),
      snap => { setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },
      err => { console.error(err); done(); }
    );
    const u2 = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")),
      snap => { setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))); done(); },
      err => { console.error(err); done(); }
    );
   const u3 = onSnapshot(
  collection(db, "messages"),
  snap => {
    console.log("Messages:", snap.docs.length);

    setMessages(
      snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))
    );
    done();
  },
  err => {
    console.error("Messages Error:", err);
    done();
  }
);
    // Carts: listen to top-level carts collection, then fetch sub-items
    const u4 = onSnapshot(collection(db, "carts"), async snap => {
      const cartData = await Promise.all(
        snap.docs.map(async cartDoc => {
          const itemsSnap = await getDocs(collection(db, "carts", cartDoc.id, "items"));
          return { userId: cartDoc.id, items: itemsSnap.docs.map(d => ({ id: d.id, ...d.data() })) };
        })
      );
      setCarts(cartData.filter(c => c.items.length > 0));
    }, err => console.error(err));

    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const navigate = (id) => { setActiveNav(id); setSidebarOpen(false); };

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const unreadMsgs = messages.filter(m => !m.read).length;
  const totalNotifs = pendingCount + unreadMsgs;

  const renderSection = () => {
    if (loading) return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <p>Loading dashboard…</p>
      </div>
    );
    switch (activeNav) {
      case "dashboard":  return <DashboardSection products={products} orders={orders} messages={messages} />;
      case "products":   return <ProductsSection products={products} showToast={showToast} />;
      case "orders":     return <OrdersSection orders={orders} showToast={showToast} />;
      case "customers":  return <CustomersSection orders={orders} />;
      case "carts":      return <CartsSection carts={carts} showToast={showToast} />;
      case "messages":   return <MessagesSection messages={messages} showToast={showToast} />;
      case "analytics":  return <AnalyticsSection products={products} orders={orders} />;
      default: return null;
    }
  };

  return (
    <div className="app" onTouchStart={handleAppTouchStart} onTouchEnd={handleAppTouchEnd}>

      
      {/* Sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div className="sidebar-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`sidebar glass ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">TechStore</span>
          <span className="logo-badge">Admin</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.id} className={`nav-item ${activeNav === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.id === "orders" && pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
              {item.id === "messages" && unreadMsgs > 0 && <span className="nav-badge nav-badge-msg">{unreadMsgs}</span>}
              {item.id === "carts" && carts.length > 0 && <span className="nav-badge nav-badge-cart">{carts.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
         <div className="user-info">
  <div className="user-avatar-lg">
    {currentUser?.displayName?.charAt(0).toUpperCase() ||
      currentUser?.email?.charAt(0).toUpperCase() ||
      "A"}
  </div>

  <div>
    <span className="user-name">
      {currentUser?.displayName ||
        currentUser?.email?.split("@")[0] ||
        "Admin"}
    </span>

    <span className="user-role muted">
      Super Admin
    </span>
  </div>
</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div key={activeNav} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.22 }}>
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="bottom-nav glass">
          {BOTTOM_NAV.map(item => (
            <button key={item.id} className={`bottom-nav-item ${activeNav === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}>
              <span className="bottom-nav-icon">{item.icon}</span>
              <span className="bottom-nav-label">{item.label}</span>
              {item.id === "orders" && pendingCount > 0 && <span className="bottom-nav-badge">{pendingCount}</span>}
            </button>
          ))}
        </nav>
      )}

      {/* Toasts */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}
        </AnimatePresence>
      </div>
    </div>
  );
}