import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { advanceOrderStatus, getOrders } from '../services/orders';

const fulfillmentStatuses = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price || 0);
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState('');

  const refreshOrders = useCallback(
    () => getOrders().then(({ data }) => setOrders(Array.isArray(data.orders) ? data.orders : [])),
    [],
  );

  useEffect(() => {
    refreshOrders()
      .catch(() => setError('Unable to load orders.'))
      .finally(() => setLoading(false));
  }, [refreshOrders]);

  async function handleAdvanceStatus(orderId) {
    setUpdatingOrderId(orderId);
    setStatusError('');
    try {
      await advanceOrderStatus(orderId);
      await refreshOrders();
    } catch (requestError) {
      setStatusError(requestError.response?.data?.message || 'Unable to advance order status.');
    } finally {
      setUpdatingOrderId('');
    }
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="orders-page">
        <p className="eyebrow">ACCOUNT</p>
        <h1>My Orders</h1>

        {loading ? (
          <p className="catalog-state" role="status">Loading orders...</p>
        ) : error ? (
          <p className="catalog-state catalog-error" role="alert">{error}</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <h2>You have not placed any orders yet.</h2>
            <Link className="details-link" to="/products">Start Shopping</Link>
          </div>
        ) : (
          <>
            {statusError && <p className="catalog-state catalog-error" role="alert">{statusError}</p>}
            <section className="orders-list">
              {orders.map((order) => (
                <article className="order-card" key={order._id}>
                  <div className="order-heading">
                    <div>
                      <p className="eyebrow">ORDER {order._id?.slice(-8).toUpperCase()}</p>
                      <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <strong>{formatPrice(order.totalAmount ?? order.total ?? 0)}</strong>
                  </div>

                  <p className="order-status">{order.status}</p>
                  {order.paymentStatus === 'PAID' && (
                    <ol className="order-progress" aria-label={`Fulfillment status: ${order.status}`}>
                      {fulfillmentStatuses.map((status, index) => (
                        <li className={fulfillmentStatuses.indexOf(order.status) >= index ? 'is-complete' : ''} key={status}>
                          {status}
                        </li>
                      ))}
                    </ol>
                  )}
                  <ul>
                    {(order.items || []).map((item) => (
                      <li key={`${order._id}-${item.product || item.name}`}>
                        {item.name} × {item.quantity}
                      </li>
                    ))}
                  </ul>

                  <div className="order-actions">
                    <Link className="details-link" to={`/orders/${order._id}`}>View Details</Link>
                    {import.meta.env.DEV
                      && order.paymentStatus === 'PAID'
                      && order.status !== 'DELIVERED'
                      && fulfillmentStatuses.includes(order.status) && (
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={updatingOrderId === order._id}
                        onClick={() => handleAdvanceStatus(order._id)}
                      >
                        {updatingOrderId === order._id ? 'Updating...' : 'Advance status (dev)'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Orders;
