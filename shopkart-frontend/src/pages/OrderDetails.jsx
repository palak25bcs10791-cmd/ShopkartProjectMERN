import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getOrderById } from '../services/orders';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    getOrderById(id)
      .then(({ data }) => setOrder(data.order))
      .catch(() => setError('Unable to load order details.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="app-shell"><Navbar /><main className="checkout-page"><p className="catalog-state">Loading order...</p></main></div>;
  }

  if (error || !order) {
    return <div className="app-shell"><Navbar /><main className="checkout-page"><div className="empty-state"><h2>Order not found.</h2><Link className="details-link" to="/orders">Back to My Orders</Link></div></main></div>;
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="checkout-page">
        <div className="catalog-heading">
          <div>
            <p className="eyebrow">ORDER DETAILS</p>
            <h1>#{order._id?.slice(-8).toUpperCase()}</h1>
          </div>
          <Link className="back-link" to="/orders">Back to orders</Link>
        </div>

        <div className="checkout-layout">
          <section className="checkout-panel">
            <p className="eyebrow">ITEMS</p>
            {(order.items || []).map((item) => (
              <div className="summary-item" key={`${item.product}-${item.name}`}>
                <span>{item.name} × {item.quantity}</span>
                <strong>{formatPrice((item.price || 0) * (item.quantity || 1))}</strong>
              </div>
            ))}
          </section>

          <aside className="checkout-panel">
            <p className="eyebrow">ORDER INFO</p>
            <p><strong>Placed:</strong> {new Date(order.createdAt).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {order.status}</p>
            <p><strong>Payment:</strong> {order.paymentStatus}</p>
            <p><strong>Total:</strong> {formatPrice(order.totalAmount ?? order.total ?? 0)}</p>
            <div className="order-shipping">
              <h3>Shipping Address</h3>
              <p>{order.shippingAddress?.fullName}</p>
              <p>{order.shippingAddress?.addressLine1}</p>
              <p>{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
              <p>{order.shippingAddress?.pincode}</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default OrderDetails;
