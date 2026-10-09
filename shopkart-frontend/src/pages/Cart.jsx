import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useCart } from '../context/useCart';

function formatPrice(price) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
}

function Cart() {
  const navigate = useNavigate();
  const { cart, itemCount, subtotal, cartLoading, cartError, loadCart, updateQuantity, removeFromCart } = useCart();

  if (cartLoading) {
    return <div className="app-shell"><Navbar /><main className="cart-page"><p className="catalog-state" role="status">Loading your cart...</p></main></div>;
  }

  if (cartError) {
    return <div className="app-shell"><Navbar /><main className="cart-page"><section className="empty-state">
      <h2>Unable to load your cart.</h2>
      <button type="button" className="details-link" onClick={loadCart}>Try Again</button>
    </section></main></div>;
  }

  if (cart.length === 0) {
    return <div className="app-shell"><Navbar /><main className="cart-page">
      <section className="empty-state">
        <h2>Your cart is empty 🛒</h2>
        <p>Looks like you haven't added anything yet.</p>
        <Link className="details-link" to="/products">Browse Products</Link>
      </section>
    </main></div>;
  }

  return <div className="app-shell"><Navbar /><main className="cart-page">
    <div className="catalog-heading">
      <div>
        <p className="eyebrow">YOUR BAG</p>
        <h1>My Cart</h1>
      </div>
      <Link className="back-link" to="/products">Continue shopping</Link>
    </div>

    <div className="cart-layout">
      <section className="cart-items" aria-label="Cart items">
        {cart.map((item) => (
          <article className="cart-item" key={item.product}>
            <div className="cart-item-image">
              <img src={item.image} alt={item.name} onError={(event) => { event.currentTarget.hidden = true; }} />
            </div>

            <div className="cart-item-details">
              <h2>{item.name}</h2>
              <p>{formatPrice(item.price)}</p>
              <div className="quantity-controls">
                <button type="button" onClick={() => updateQuantity(item.product, item.quantity - 1)} disabled={item.quantity <= 1}>-</button>
                <span>{item.quantity}</span>
                <button type="button" onClick={() => updateQuantity(item.product, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
                <button className="text-button" type="button" onClick={() => removeFromCart(item.product)}>Remove</button>
              </div>
            </div>

            <strong className="cart-item-total">{formatPrice(item.price * item.quantity)}</strong>
          </article>
        ))}
      </section>

      <aside className="order-summary">
        <p className="eyebrow">ORDER SUMMARY</p>
        <h2>Summary</h2>
        <div className="summary-row"><span>Items:</span><strong>{itemCount}</strong></div>
        <div className="summary-row"><span>Subtotal:</span><strong>{formatPrice(subtotal)}</strong></div>
            <button type="button" className="primary-button" onClick={() => navigate('/checkout')}>Proceed to Checkout</button>
      </aside>
    </div>
  </main></div>;
}

export default Cart;
