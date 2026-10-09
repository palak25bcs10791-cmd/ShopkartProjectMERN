import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getOrderById } from '../services/orders';

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

function OrderSuccess() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    getOrderById(id)
      .then(({ data }) => setOrder(data.order))
      .catch(() => setError('Unable to load your order summary.'));
  }, [id]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="checkout-page">
        <section className="empty-state success-state">
          <h2>✅ Order placed successfully</h2>
          {error ? (
            <p>{error}</p>
          ) : (
            <>
              <p><strong>Order ID:</strong> {order?._id || id}</p>
              <p><strong>Total:</strong> {order ? formatPrice(order.totalAmount ?? order.total ?? 0) : 'Loading...'}</p>
              <p><strong>Status:</strong> {order?.status || 'PLACED'}</p>
              <p>Your order has been saved successfully.</p>
            </>
          )}
          <div className="auth-actions">
            <Link className="details-link" to="/orders">View My Orders</Link>
            <Link className="secondary-button" to="/products">Continue Shopping</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default OrderSuccess;
