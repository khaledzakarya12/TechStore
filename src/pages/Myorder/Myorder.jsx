import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../utils/firebaseconfig';


const STATUS_CONFIG = {
  pending: { label: 'Pending', className: 'status-pending' },
  processing: { label: 'Processing', className: 'status-processing' },
  shipped: { label: 'Shipped', className: 'status-shipped' },
  delivered: { label: 'Delivered', className: 'status-delivered' },
  cancelled: { label: 'Cancelled', className: 'status-cancelled' },
};

function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const datePart = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return `$${value.toFixed(2)}`;
}

function getShortId(id) {
  return id ? id.slice(0, 8).toUpperCase() : 'N/A';
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status || 'Unknown', className: 'status-default' };
  return <span className={`status-badge ${config.className}`}>{config.label}</span>;
}

function OrderCard({ order, onClick }) {
  const itemsCount = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)
    : 0;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(order);
    }
  };

  return (
    <div
      className="order-card"
      onClick={() => onClick(order)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="order-card-header">
        <span className="order-id">#{getShortId(order.id)}</span>
        <StatusBadge status={order.status} />
      </div>

      <div className="order-card-body">
        <div className="order-row">
          <span className="order-label">Date</span>
          <span className="order-value">{formatDate(order.createdAt)}</span>
        </div>
        <div className="order-row">
          <span className="order-label">Total</span>
          <span className="order-value order-total">{formatCurrency(order.total)}</span>
        </div>
        <div className="order-row">
          <span className="order-label">Payment</span>
          <span className="order-value">{order.paymentMethod || 'N/A'}</span>
        </div>
        <div className="order-row">
          <span className="order-label">Items</span>
          <span className="order-value">
            {itemsCount} item{itemsCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="order-card-footer">
        <span className="view-details">View details →</span>
      </div>
    </div>
  );
}

function OrderModal({ order, isClosing, onClose }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!order) return null;

  const customer = order.customer || {};
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div
      className={`modal-overlay ${isClosing ? 'is-closing' : ''}`}
      onClick={onClose}
    >
      <div
        className={`modal-content ${isClosing ? 'is-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="modal-close" onClick={onClose} aria-label="Close order details">
          ×
        </button>

        <div className="modal-header">
          <div>
            <p className="modal-eyebrow">Order Details</p>
            <h2 className="modal-title">#{getShortId(order.id)}</h2>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <section className="modal-section">
          <h3 className="section-title">Customer Information</h3>
          <div className="customer-grid">
            <div className="customer-field">
              <span className="field-label">Name</span>
              <span className="field-value">{customer.name || order.customerName || 'N/A'}</span>
            </div>
            <div className="customer-field">
              <span className="field-label">Phone</span>
              <span className="field-value">{customer.phone || order.phone || 'N/A'}</span>
            </div>
            <div className="customer-field">
              <span className="field-label">Email</span>
              <span className="field-value">{customer.email || order.email || 'N/A'}</span>
            </div>
            <div className="customer-field">
              <span className="field-label">City</span>
              <span className="field-value">{customer.city || order.city || 'N/A'}</span>
            </div>
            <div className="customer-field full-width">
              <span className="field-label">Address</span>
              <span className="field-value">{customer.address || order.address || 'N/A'}</span>
            </div>
          </div>
        </section>

        <section className="modal-section">
          <h3 className="section-title">Items ({items.length})</h3>
          <div className="items-list">
            {items.length === 0 && <p className="no-items">No items found for this order.</p>}
            {items.map((item, idx) => {
              const qty = Number(item.quantity) || 1;
              const price = Number(item.price) || 0;
              const subtotal = qty * price;
              return (
                <div className="item-row" key={item.id || idx}>
                  <div className="item-image-wrap">
                    {item.image ? (
                      <img src={item.image} alt={item.name || 'Product'} className="item-image" />
                    ) : (
                      <div className="item-image-placeholder">No Image</div>
                    )}
                  </div>
                  <div className="item-info">
                    <span className="item-name">{item.name || 'Unnamed product'}</span>
                    <span className="item-meta">
                      Qty: {qty} × {formatCurrency(price)}
                    </span>
                  </div>
                  <div className="item-subtotal">{formatCurrency(subtotal)}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="modal-summary">
          <div className="summary-row">
            <span>Payment Method</span>
            <span>{order.paymentMethod || 'N/A'}</span>
          </div>
          <div className="summary-row total-row">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    let unsubscribeOrders = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = null;
      }

      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      unsubscribeOrders = onSnapshot(
        ordersQuery,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setOrders(data);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching orders:', error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, []);

  const handleOpenOrder = useCallback((order) => {
    setSelectedOrder(order);
    setIsClosing(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedOrder(null);
      setIsClosing(false);
    }, 280);
  }, []);

  return (
    <div className="my-orders-page">
      <div className="my-orders-container">
        <h1 className="page-title" >My Orders</h1>

        {loading && (
          <div className="state-wrap">
            <div className="spinner" />
            <p>Loading your orders...</p>
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="state-wrap empty-state">
            <div className="empty-icon">📦</div>
            <h2>No orders found</h2>
            <p>Your orders will appear here once you place one.</p>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="orders-grid">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} onClick={handleOpenOrder} />
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderModal order={selectedOrder} isClosing={isClosing} onClose={handleCloseModal} />
      )}
    </div>
  );
}